import { Injectable } from '@nestjs/common';
import { LeadStatus } from '@prisma/client';
import { SafetyVerdict } from '../safety/safety-gate.service';
import { SafetyGateService } from '../safety/safety-gate.service';
import { SlotFillerService } from '../engine/slot-filler.service';
import { Slots } from '../types';

/**
 * Assigns one of eight lead states. Entirely deterministic.
 *
 * A model could judge this more subtly, and that is exactly the problem: the
 * state drives whether a human is paged. "Sometimes right" is the wrong
 * property for a rule that decides whether someone gets called back.
 */
@Injectable()
export class QualifierService {
  private static readonly BOOKING_INTENT = [
    'احجز', 'عايز احجز', 'عايزه احجز', 'حجز', 'اححز',
    'عايز ميعاد', 'ممكن ميعاد', 'ميعاد', 'موعد',
    'عايز اجي', 'ممكن اجي', 'اجي امتي', 'عايز اشوف دكتور', 'محتاج دكتور',
    'كشف', 'عايز كشف',
  ];

  private static readonly HUMAN_REQUEST = [
    'عايز اكلم حد', 'عايز اكلم موظف', 'حد بشري', 'موظف', 'مسؤول',
    'شكوي', 'شكوى', 'اشتكي', 'مدير',
  ];

  classify(input: {
    text: string;
    slots: Slots;
    safety: SafetyVerdict;
    groundingFailed: boolean;
    current: LeadStatus;
  }): LeadStatus {
    // 1. Safety outranks everything. An emergency is not a warm lead.
    switch (input.safety.action) {
      case 'EMERGENCY_STOP':
      case 'SELF_HARM_STOP':
        return LeadStatus.EMERGENCY;
      case 'MARK_SPAM':
        return LeadStatus.SPAM;
      case 'WARN_ABUSE':
      case 'END_ABUSE':
        return LeadStatus.ABUSIVE;
    }

    const n = SafetyGateService.normalize(input.text);

    // 2. An explicit request for a person, a complaint, or a fact we could not
    //    ground — all mean the same thing: stop guessing, get a human.
    if (input.groundingFailed || this.matches(n, QualifierService.HUMAN_REQUEST)) {
      return LeadStatus.NEEDS_HUMAN;
    }

    // 3. Ready to book is a fact about the slots, not a feeling about the tone.
    if (SlotFillerService.isHandoffReady(input.slots)) {
      return LeadStatus.READY_TO_BOOK;
    }

    const booking = this.matches(n, QualifierService.BOOKING_INTENT);
    const hasContact = Boolean(input.slots.phone);

    if (booking && hasContact) return LeadStatus.WARM_LEAD;
    if (booking) return LeadStatus.INTERESTED;

    // A patient who volunteered a phone number without saying "book" is warmer
    // than one just asking questions.
    if (hasContact) return LeadStatus.WARM_LEAD;

    // Never downgrade. A conversation that reached WARM_LEAD and then asked a
    // general question has not become a cold enquiry again.
    return this.rank(input.current) > this.rank(LeadStatus.INFORMATION_ONLY)
      ? input.current
      : LeadStatus.INFORMATION_ONLY;
  }

  private matches(normalized: string, terms: string[]): boolean {
    return terms.some((t) => normalized.includes(SafetyGateService.normalize(t)));
  }

  /** Ordering used only to prevent downgrades. Terminal states are not ranked. */
  private rank(status: LeadStatus): number {
    const order: Record<string, number> = {
      [LeadStatus.INFORMATION_ONLY]: 1,
      [LeadStatus.INTERESTED]: 2,
      [LeadStatus.WARM_LEAD]: 3,
      [LeadStatus.READY_TO_BOOK]: 4,
    };
    return order[status] ?? 0;
  }
}
