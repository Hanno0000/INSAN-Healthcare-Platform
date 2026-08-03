import { Controller, Get, Post, Query, Req, Res, HttpStatus, Logger } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { ConversationEngineService } from '../../core/engine/conversation-engine.service';
import { MessengerAdapter } from './messenger.adapter';

/**
 * The single webhook for all three Facebook pages. Which brand a message
 * belongs to is decided by page id inside the adapter.
 *
 * Meta requires a 200 within a few seconds and redelivers otherwise. So the
 * handler acknowledges immediately and processes afterwards — a slow model call
 * must not turn into a redelivery storm and three identical replies.
 */
@Controller('receptionist/messenger')
export class MessengerController {
  private readonly logger = new Logger(MessengerController.name);

  constructor(
    private readonly adapter: MessengerAdapter,
    private readonly engine: ConversationEngineService,
  ) {}

  /** Meta's subscription handshake. */
  @Get('webhook')
  verify(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
    @Res() res: Response,
  ): void {
    const ok = this.adapter.verifySubscription(mode, token, challenge);
    if (ok) res.status(HttpStatus.OK).send(ok);
    else res.status(HttpStatus.FORBIDDEN).send('verification failed');
  }

  @Post('webhook')
  @Throttle({ default: { limit: 600, ttl: 60000 } })
  async receive(@Req() req: Request & { rawBody?: Buffer }, @Res() res: Response): Promise<void> {
    const raw = req.rawBody;
    if (!raw) {
      // rawBody is enabled in main.ts. If it is missing, the signature cannot
      // be checked and the request must not be trusted.
      this.logger.error('rawBody unavailable — cannot verify signature. Check NestFactory.create({rawBody:true}).');
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).send();
      return;
    }

    if (!this.adapter.verifySignature(raw, req.headers['x-hub-signature-256'] as string | undefined)) {
      this.logger.warn('Rejected a webhook delivery with an invalid signature.');
      res.status(HttpStatus.FORBIDDEN).send();
      return;
    }

    // Acknowledge first, work second.
    res.status(HttpStatus.OK).send('EVENT_RECEIVED');

    const events = this.adapter.extractEvents(req.body);
    for (const event of events) {
      if (this.adapter.isDuplicate(event.messageId)) continue;
      void this.process(event);
    }
  }

  private async process(event: ReturnType<MessengerAdapter['extractEvents']>[number]): Promise<void> {
    try {
      const inbound = await this.adapter.toInbound(event);
      if (!inbound) return; // unknown page — logged in the adapter

      const reply = await this.engine.handle(inbound);
      if (reply.text) await this.adapter.send(event.pageId, event.senderId, reply.text);
    } catch (e) {
      // Never rethrow into the void: the response has already been sent, and an
      // unhandled rejection here would take the process down.
      this.logger.error(`Failed to process ${event.messageId}: ${(e as Error).message}`);
    }
  }
}
