import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { ChatSender } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Retention for conversation data.
 *
 * The receptionist collects names, phone numbers and a high-level reason for
 * visit from real patients. Egypt's Personal Data Protection Law 151/2020
 * applies, and beyond the law this is simply data nobody should hold forever.
 *
 * What is removed and what is kept is a deliberate split:
 *
 *   ANONYMISED — the conversation and its messages. The transcript is where the
 *     personal detail lives, and its operational value expires quickly.
 *   KEPT — the AppointmentRequest it produced. That is a business record of a
 *     patient who asked for care, it is what the team acted on, and deleting it
 *     would erase the audit trail of a real appointment.
 *
 * Anonymised rather than deleted so the counts on the admin screen stay honest:
 * deleting rows would make last quarter look like it never happened.
 */
@Injectable()
export class RetentionService {
  private readonly logger = new Logger(RetentionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  /** 0 disables the job. Default one year. */
  private get retentionDays(): number {
    const raw = this.config.get<string>('RECEPTIONIST_RETENTION_DAYS');
    return raw === undefined ? 365 : Number(raw);
  }

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async run(): Promise<void> {
    const days = this.retentionDays;
    if (!days || days <= 0) {
      this.logger.log('Retention job disabled (RECEPTIONIST_RETENTION_DAYS=0).');
      return;
    }

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    const stale = await this.prisma.chatConversation.findMany({
      where: {
        startedAt: { lt: cutoff },
        // `visitorId` is set to this once processed, so a second run skips it.
        NOT: { visitorId: ANONYMISED },
      },
      select: { id: true },
      take: 500, // bounded: a first run on a long-lived database should not
                 // hold a transaction open for minutes
    });

    if (stale.length === 0) return;

    let messages = 0;
    for (const c of stale) {
      const res = await this.prisma.$transaction([
        // Message bodies are the bulk of the personal data. Replaced rather
        // than deleted so message counts and cache metrics stay comparable.
        this.prisma.chatMessage.updateMany({
          where: { conversationId: c.id, sender: { in: [ChatSender.USER, ChatSender.AI] } },
          data: { content: REDACTED },
        }),
        this.prisma.chatConversation.update({
          where: { id: c.id },
          data: {
            visitorId: ANONYMISED,
            externalId: null, // the PSID is an identifier for a real person
            slots: {}, // name, phone, reason for visit
          },
        }),
      ]);
      messages += res[0].count;
    }

    this.logger.log(
      `Retention: anonymised ${stale.length} conversation(s) and ${messages} message(s) older than ${days} days. ` +
        `Their AppointmentRequest records were kept.`,
    );
  }
}

const ANONYMISED = 'anonymised';
const REDACTED = '[محذوف حسب سياسة الاحتفاظ بالبيانات]';
