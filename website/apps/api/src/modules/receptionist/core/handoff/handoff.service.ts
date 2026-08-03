import { Injectable, Logger } from '@nestjs/common';
import { AppointmentStatus, LeadStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { SlotFillerService } from '../engine/slot-filler.service';
import { Slots, TurnContext } from '../types';
import { NotifierService } from './notifier.service';

export interface HandoffResult {
  handedOff: boolean;
  appointmentRequestId: string | null;
  reason: string | null;
}

/**
 * Turns a qualified conversation into a lead a human can act on.
 *
 * The destination is the existing `AppointmentRequest` — the same table the
 * website booking form writes to and the same `/admin/appointments` screen the
 * team already uses. No second inbox, no second workflow.
 */
@Injectable()
export class HandoffService {
  private readonly logger = new Logger(HandoffService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifier: NotifierService,
  ) {}

  /**
   * Deterministic trigger. A model deciding this would miss leads (lost
   * revenue) and invent them (wasted staff calls) at rates nobody can tune.
   */
  shouldHandOff(ctx: TurnContext, leadStatus: LeadStatus): boolean {
    if (ctx.handedOff) return false;
    if (leadStatus === LeadStatus.EMERGENCY || leadStatus === LeadStatus.NEEDS_HUMAN) return true;
    return leadStatus === LeadStatus.READY_TO_BOOK && SlotFillerService.isHandoffReady(ctx.slots);
  }

  async execute(ctx: TurnContext, leadStatus: LeadStatus, summary: string): Promise<HandoffResult> {
    const missing = SlotFillerService.missingForHandoff(ctx.slots);

    // Emergencies and explicit human requests hand off regardless of what is
    // missing — waiting to collect a surname while someone describes chest pain
    // would be an absurd thing to have built.
    const urgent = leadStatus === LeadStatus.EMERGENCY || leadStatus === LeadStatus.NEEDS_HUMAN;
    if (!urgent && missing.length > 0) {
      return { handedOff: false, appointmentRequestId: null, reason: `missing slots: ${missing.join(', ')}` };
    }

    const request = await this.prisma.appointmentRequest.create({
      data: {
        name: ctx.slots.patientName?.trim() || '(لم يُذكر)',
        phone: ctx.slots.phone?.trim() || '(لم يُذكر)',
        hospitalId: ctx.scope.hospitalId ?? undefined,
        message: summary,
        notes: this.buildNotes(ctx, leadStatus),
        answers: ctx.slots as object,
        status: AppointmentStatus.NEW,
      },
    });

    await this.prisma.chatConversation.update({
      where: { id: ctx.conversationId },
      data: { appointmentRequestId: request.id, handedOffAt: new Date(), leadStatus },
    });

    await this.notifier.notify({
      hospitalId: ctx.scope.hospitalId,
      leadStatus,
      appointmentRequestId: request.id,
      conversationId: ctx.conversationId,
      summary,
      slots: ctx.slots,
    });

    this.logger.log(`Handoff ${leadStatus} → AppointmentRequest ${request.id}`);
    return { handedOff: true, appointmentRequestId: request.id, reason: null };
  }

  /**
   * What the staff member reads instead of the transcript. Ordered so the first
   * two lines answer "how urgent" and "who do I call".
   */
  private buildNotes(ctx: TurnContext, leadStatus: LeadStatus): string {
    const lines = [
      `الحالة: ${this.statusLabel(leadStatus)}`,
      `الإجراء المقترح: ${this.recommendedAction(leadStatus)}`,
      '',
      `المصدر: ${ctx.channel}`,
      `المحادثة: ${ctx.conversationId}`,
      '',
      'المعلومات المجمّعة:',
    ];
    for (const [k, v] of Object.entries(ctx.slots as Slots)) {
      if (v) lines.push(`- ${k}: ${v}`);
    }
    return lines.join('\n');
  }

  private statusLabel(s: LeadStatus): string {
    const map: Partial<Record<LeadStatus, string>> = {
      [LeadStatus.EMERGENCY]: '🔴 طوارئ',
      [LeadStatus.NEEDS_HUMAN]: '🟠 يحتاج موظف',
      [LeadStatus.READY_TO_BOOK]: '🟢 جاهز للحجز',
    };
    return map[s] ?? String(s);
  }

  private recommendedAction(s: LeadStatus): string {
    // ⚠️ The response-time promise is a placeholder. It becomes a real number
    // when the operator answers NEEDS_OPERATOR §5 — a promise nobody keeps is
    // worse than no promise.
    const map: Partial<Record<LeadStatus, string>> = {
      [LeadStatus.EMERGENCY]: 'اتصل فوراً',
      [LeadStatus.NEEDS_HUMAN]: 'اتصل في أقرب وقت',
      [LeadStatus.READY_TO_BOOK]: 'اتصل لتأكيد الحجز',
    };
    return map[s] ?? 'مراجعة';
  }
}
