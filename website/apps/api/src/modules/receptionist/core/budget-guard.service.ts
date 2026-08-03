import { Injectable, Logger } from '@nestjs/common';
import { ChatSender } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * A flat shape rather than a discriminated union: this project compiles with
 * `strictNullChecks: false`, which degrades literal-type narrowing, so
 * `if (!v.allowed) v.reason` would not type-check.
 */
export interface BudgetVerdict {
  allowed: boolean;
  reason?: 'CONVERSATION_LIMIT' | 'DAILY_TOKEN_LIMIT';
  /** Present only when `allowed` is false. */
  message?: string;
}

/**
 * Spend ceilings.
 *
 * Every turn costs money and nothing was stopping a loop, a bored teenager, or
 * a broken client from running the bill up overnight. Both limits below fail
 * *closed* — the reply becomes a handoff to a human rather than another model
 * call, so a capped conversation still ends with a person being told.
 *
 * Counted from ChatMessage rather than an in-memory tally: a restart must not
 * reset someone's budget, and the numbers have to agree with what the admin
 * screen shows.
 */
@Injectable()
export class BudgetGuardService {
  private readonly logger = new Logger(BudgetGuardService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Assistant replies allowed in one conversation. A real receptionist
   * conversation is 10–20 turns; 60 is generous enough that a genuine patient
   * will never see it and tight enough that a loop stops the same day.
   */
  private get maxRepliesPerConversation(): number {
    return Number(this.config.get('RECEPTIONIST_MAX_REPLIES_PER_CONVERSATION')) || 60;
  }

  /**
   * Output tokens per day across everything. At Sonnet 5 rates 400k output
   * tokens is roughly $6/day — comfortably above a normal day's traffic and
   * well below a runaway.
   */
  private get maxDailyOutputTokens(): number {
    return Number(this.config.get('RECEPTIONIST_MAX_DAILY_OUTPUT_TOKENS')) || 400_000;
  }

  async check(conversationId: string): Promise<BudgetVerdict> {
    const replies = await this.prisma.chatMessage.count({
      where: { conversationId, sender: ChatSender.AI },
    });

    if (replies >= this.maxRepliesPerConversation) {
      this.logger.warn(`Conversation ${conversationId} hit the reply cap (${replies}).`);
      return {
        allowed: false,
        reason: 'CONVERSATION_LIMIT',
        message: 'المحادثة دي بقت طويلة. زميل من الفريق هيتواصل معاك عشان يكمل معاك.',
      };
    }

    const since = new Date();
    since.setHours(0, 0, 0, 0);

    const today = await this.prisma.chatMessage.aggregate({
      _sum: { outputTokens: true },
      where: { sender: ChatSender.AI, createdAt: { gte: since } },
    });
    const used = today._sum.outputTokens ?? 0;

    if (used >= this.maxDailyOutputTokens) {
      // Loud, because this is either an attack or a bug, and either way someone
      // needs to look today rather than discover it on the invoice.
      this.logger.error(
        `Daily output-token ceiling reached: ${used} ≥ ${this.maxDailyOutputTokens}. ` +
          `The receptionist is handing every conversation to a human until midnight.`,
      );
      return {
        allowed: false,
        reason: 'DAILY_TOKEN_LIMIT',
        message: 'المساعد مش متاح دلوقتي. زميل من الفريق هيتواصل معاك.',
      };
    }

    // One warning as the ceiling approaches, so it is not a surprise.
    if (used > this.maxDailyOutputTokens * 0.8) {
      this.logger.warn(`Daily output tokens at ${Math.round((used / this.maxDailyOutputTokens) * 100)}% of the ceiling.`);
    }

    return { allowed: true };
  }
}
