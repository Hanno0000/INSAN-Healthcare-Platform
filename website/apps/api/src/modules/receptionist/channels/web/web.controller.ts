import { Body, Controller, Logger, Post, ServiceUnavailableException } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { PrismaService } from '../../../prisma/prisma.service';
import { ConversationEngineService } from '../../core/engine/conversation-engine.service';
import { WebChatDto } from './dto/web-chat.dto';
import { WebAdapter } from './web.adapter';

@Controller('receptionist/web')
export class WebController {
  private readonly logger = new Logger(WebController.name);

  constructor(
    private readonly adapter: WebAdapter,
    private readonly engine: ConversationEngineService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Rate limited harder than the site default: this endpoint is unauthenticated
   * and every call costs a model request.
   */
  @Post('message')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async message(@Body() dto: WebChatDto): Promise<{ reply: string; terminal: boolean }> {
    // The widget respects the same feature flag the rest of the AI chat does,
    // so turning the assistant off is one switch in the admin dashboard.
    const flag = await this.prisma.featureFlag.findUnique({ where: { key: 'ai_chat_enabled' } });
    if (flag && !flag.isEnabled) {
      throw new ServiceUnavailableException('المساعد غير متاح حالياً.');
    }

    const inbound = await this.adapter.toInbound(dto);
    if (!inbound) throw new ServiceUnavailableException('المساعد غير متاح حالياً.');

    const reply = await this.engine.handle(inbound);
    return { reply: reply.text, terminal: reply.terminal };
  }
}
