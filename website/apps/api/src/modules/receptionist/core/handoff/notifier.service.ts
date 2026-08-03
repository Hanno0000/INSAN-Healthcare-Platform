import { Injectable, Logger } from '@nestjs/common';
import { LeadStatus } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service';
import { Slots } from '../types';

export interface NotifyPayload {
  hospitalId: string | null;
  leadStatus: LeadStatus;
  appointmentRequestId: string;
  conversationId: string;
  summary: string;
  slots: Slots;
}

/**
 * Tells a human that a lead is waiting.
 *
 * Routed per hospital: a Future lead must not page Delta's desk. The targets
 * come from config keyed by hospital slug, so adding a third hospital is an
 * environment variable rather than a code change.
 *
 * Delivery is best-effort and never fails the turn — the lead is already
 * durable in `AppointmentRequest` and visible in `/admin/appointments`. A
 * notifier outage should slow the team down, not lose the patient.
 */
@Injectable()
export class NotifierService {
  private readonly logger = new Logger(NotifierService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async notify(payload: NotifyPayload): Promise<void> {
    const target = await this.targetFor(payload.hospitalId);

    if (!target) {
      // Loud on purpose. A lead nobody is told about is the failure this whole
      // system exists to prevent, and it is silent by nature.
      this.logger.warn(
        `No notification target for hospital ${payload.hospitalId ?? '(unscoped)'} — ` +
          `lead ${payload.appointmentRequestId} is saved but nobody was paged. ` +
          `Set RECEPTIONIST_TELEGRAM_<SLUG> (NEEDS_OPERATOR.md §5).`,
      );
      return;
    }

    const text = this.render(payload);

    try {
      await this.sendTelegram(target.botToken, target.chatId, text);
      this.logger.log(`Notified ${target.label} about ${payload.appointmentRequestId}`);
    } catch (e) {
      this.logger.error(
        `Notification failed for ${payload.appointmentRequestId}: ${(e as Error).message}. ` +
          `The lead is saved and visible in /admin/appointments.`,
      );
    }
  }

  private async targetFor(hospitalId: string | null): Promise<{ label: string; botToken: string; chatId: string } | null> {
    const botToken = this.config.get<string>('RECEPTIONIST_TELEGRAM_BOT_TOKEN');
    if (!botToken) return null;

    let slug = 'INSAN';
    if (hospitalId) {
      const h = await this.prisma.hospital.findUnique({ where: { id: hospitalId } });
      if (h) slug = h.slug.replace(/-/g, '_').toUpperCase();
    }

    const chatId =
      this.config.get<string>(`RECEPTIONIST_TELEGRAM_${slug}`) ??
      this.config.get<string>('RECEPTIONIST_TELEGRAM_DEFAULT');

    return chatId ? { label: slug, botToken, chatId } : null;
  }

  /**
   * The staff member should not have to read the transcript. Urgency first,
   * then the number to dial, then everything else.
   */
  private render(p: NotifyPayload): string {
    const head =
      p.leadStatus === LeadStatus.EMERGENCY
        ? '🔴 طوارئ — اتصل فوراً'
        : p.leadStatus === LeadStatus.NEEDS_HUMAN
          ? '🟠 يحتاج موظف'
          : '🟢 ليد جاهز للحجز';

    const lines = [head, ''];
    if (p.slots.phone) lines.push(`📞 ${p.slots.phone}`);
    if (p.slots.patientName) lines.push(`👤 ${p.slots.patientName}`);
    if (p.slots.specialty) lines.push(`🏥 ${p.slots.specialty}`);
    if (p.slots.preferredDate || p.slots.preferredTime) {
      lines.push(`🗓 ${[p.slots.preferredDate, p.slots.preferredTime].filter(Boolean).join(' — ')}`);
    }
    lines.push('', p.summary, '', `#${p.appointmentRequestId}`);
    return lines.join('\n');
  }

  private async sendTelegram(botToken: string, chatId: string, text: string): Promise<void> {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
    });
    if (!res.ok) throw new Error(`telegram ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
}
