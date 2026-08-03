import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatChannel, SocialPlatform } from '@prisma/client';
import * as crypto from 'crypto';
import { PrismaService } from '../../../prisma/prisma.service';
import { InboundMessage, SurfaceTraits } from '../../core/types';

/** Public audience; a PSID means the person can be messaged again (24h window). */
const MESSENGER_TRAITS: SurfaceTraits = { isPublic: true, canReplyLater: true };

export interface MessengerEvent {
  pageId: string;
  senderId: string;
  text: string;
  messageId: string;
  timestamp: number;
}

/**
 * Translation only. Meta's wire format in, `InboundMessage` out — no business
 * logic, no knowledge of scope, slots or leads.
 *
 * The three pages share one webhook and one app. Which brand a message belongs
 * to is read from `BrandSocialAccount.pageId`, which was already seeded and
 * until now had no code reading it.
 */
@Injectable()
export class MessengerAdapter {
  private readonly logger = new Logger(MessengerAdapter.name);

  /**
   * Meta redelivers on any non-200, and retries can arrive concurrently.
   * Message ids seen recently, so a redelivery does not produce a second reply.
   *
   * In-memory: correct for one instance. A multi-instance deployment needs this
   * in Redis — noted rather than silently broken.
   */
  private readonly seen = new Map<string, number>();
  private static readonly DEDUP_TTL_MS = 10 * 60 * 1000;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  verifySubscription(mode: string, token: string, challenge: string): string | null {
    const expected = this.config.get<string>('FB_VERIFY_TOKEN');
    if (!expected) {
      this.logger.error('FB_VERIFY_TOKEN is not set — webhook verification cannot succeed.');
      return null;
    }
    return mode === 'subscribe' && token === expected ? challenge : null;
  }

  /**
   * Meta signs the raw body with the app secret. Compared in constant time —
   * a timing-variable compare on a signature is a real (if slow) oracle.
   */
  verifySignature(rawBody: Buffer, header: string | undefined): boolean {
    const secret = this.config.get<string>('FB_APP_SECRET');
    if (!secret) {
      this.logger.error('FB_APP_SECRET is not set — refusing every webhook delivery.');
      return false;
    }
    if (!header?.startsWith('sha256=')) return false;

    const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
    const a = Buffer.from(header);
    const b = Buffer.from(expected);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  }

  /** Flatten Meta's nested envelope into the text messages we handle. */
  extractEvents(body: unknown): MessengerEvent[] {
    const out: MessengerEvent[] = [];
    const payload = body as { object?: string; entry?: Array<Record<string, any>> };
    if (payload?.object !== 'page' || !Array.isArray(payload.entry)) return out;

    for (const entry of payload.entry) {
      const pageId = String(entry.id ?? '');
      for (const m of entry.messaging ?? []) {
        // Echoes are our own replies coming back; delivery/read receipts carry
        // no message. Handling either would loop or produce empty turns.
        if (m.message?.is_echo || !m.message?.text) continue;
        out.push({
          pageId,
          senderId: String(m.sender?.id ?? ''),
          text: String(m.message.text),
          messageId: String(m.message.mid ?? ''),
          timestamp: Number(m.timestamp ?? Date.now()),
        });
      }
    }
    return out;
  }

  isDuplicate(messageId: string): boolean {
    if (!messageId) return false;
    const now = Date.now();
    for (const [id, at] of this.seen) {
      if (now - at > MessengerAdapter.DEDUP_TTL_MS) this.seen.delete(id);
    }
    if (this.seen.has(messageId)) return true;
    this.seen.set(messageId, now);
    return false;
  }

  /**
   * Page → brand. Returns null when the page is unknown, and the caller drops
   * the message: replying as the wrong hospital is worse than not replying.
   */
  async toInbound(event: MessengerEvent): Promise<InboundMessage | null> {
    const account = await this.prisma.brandSocialAccount.findFirst({
      where: { pageId: event.pageId, platform: SocialPlatform.FACEBOOK, isActive: true },
    });

    if (!account) {
      this.logger.warn(
        `No active BrandSocialAccount for page ${event.pageId} — message dropped. ` +
          `Seed the real page id and set isActive (NEEDS_OPERATOR.md §3).`,
      );
      return null;
    }

    return {
      brandId: account.brandId,
      channel: ChatChannel.MESSENGER,
      externalId: event.senderId,
      visitorId: event.senderId,
      text: event.text,
      locale: 'ar',
      surface: MESSENGER_TRAITS,
      hints: { pageId: event.pageId },
    };
  }

  /**
   * Send a reply. The page token is per page — resolved from the same account
   * row, so a missing token fails loudly for that page instead of silently
   * falling back to another one's.
   */
  async send(pageId: string, recipientId: string, text: string): Promise<void> {
    if (!text.trim()) return;

    const token = this.pageToken(pageId);
    if (!token) {
      this.logger.error(`No page token for ${pageId} — reply not sent. Set FB_PAGE_TOKEN_<PAGE>.`);
      return;
    }

    const res = await fetch(`https://graph.facebook.com/v21.0/me/messages?access_token=${token}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        recipient: { id: recipientId },
        messaging_type: 'RESPONSE',
        message: { text: text.slice(0, 2000) },
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      // Error 10 / subcode 2018278 is the 24-hour window having closed. Not a
      // bug — a policy limit, and the lead is already recorded either way.
      this.logger.error(`Messenger send failed (${res.status}): ${body.slice(0, 300)}`);
    }
  }

  private pageToken(pageId: string): string | undefined {
    const map = this.config.get<string>('FB_PAGE_TOKENS');
    if (map) {
      for (const pair of map.split(',')) {
        const [id, token] = pair.split(':');
        if (id?.trim() === pageId) return token?.trim();
      }
    }
    return this.config.get<string>(`FB_PAGE_TOKEN_${pageId}`);
  }
}
