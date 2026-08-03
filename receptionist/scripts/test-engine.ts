/**
 * Grounding and qualification tests. No database, no network, no model call.
 *
 *   cd website/apps/api
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' ../../../receptionist/scripts/test-engine.ts
 *
 * These two services decide whether a patient is told a fact and whether a
 * human is paged. Both are deterministic precisely so they can be tested.
 */

import { GroundingService } from '../../website/apps/api/src/modules/receptionist/core/engine/grounding.service';
import { QualifierService } from '../../website/apps/api/src/modules/receptionist/core/qualify/qualifier.service';
import { SlotFillerService } from '../../website/apps/api/src/modules/receptionist/core/engine/slot-filler.service';
import { RetrievedRecord, Slots } from '../../website/apps/api/src/modules/receptionist/core/types';
import { SafetyVerdict } from '../../website/apps/api/src/modules/receptionist/core/safety/safety-gate.service';

let passed = 0;
const failures: string[] = [];

function check(name: string, actual: unknown, expected: unknown) {
  if (JSON.stringify(actual) === JSON.stringify(expected)) passed++;
  else failures.push(`${name}\n      expected ${JSON.stringify(expected)}\n      got      ${JSON.stringify(actual)}`);
}

// ═════════════════════ Grounding ═════════════════════
const grounding = new GroundingService();

const records: RetrievedRecord[] = [
  {
    id: 'clinic:c1',
    kind: 'DETERMINISTIC',
    label: 'عيادة العظام',
    content: 'السبت من 16:00 إلى 20:00',
    confidence: 'stated',
    sourceRef: 'Clinic c1',
    similarity: null,
  },
];

{
  const r = grounding.verify('عيادة العظام بتشتغل السبت من 16:00 لـ 20:00 [clinic:c1]', records);
  check('valid citation passes', r.ok, true);
  check('citation marker is stripped from what the patient sees', r.cleanText.includes('[clinic:c1]'), false);
  check('valid citation is recorded', r.validCitations, ['clinic:c1']);
}
{
  const r = grounding.verify('عيادة العظام بتشتغل السبت [clinic:DOES_NOT_EXIST]', records);
  check('fabricated citation fails', r.ok, false);
  check('fabricated citation is reported', r.fabricatedCitations, ['clinic:DOES_NOT_EXIST']);
  check('reply is replaced, not passed through', r.cleanText.includes('مش متأكد'), true);
}
{
  // The dangerous case: fluent, plausible, no citation, and actionable.
  const r = grounding.verify('العيادة بتفتح الساعة 10:00 الصبح', records);
  check('uncited clock time fails', r.ok, false);
  check('uncited time is explained', r.reason?.includes('clock time'), true);
}
{
  const r = grounding.verify('أهلاً بيك، تحت أمرك.', records);
  check('a reply asserting no facts needs no citation', r.ok, true);
}
{
  const r = grounding.verify('رقم التواصل 01100002154', records);
  check('uncited phone number fails', r.ok, false);
}

// ═════════════════════ Slot completeness ═════════════════════
check('empty slots are not handoff-ready', SlotFillerService.isHandoffReady({}), false);
check(
  'name + phone alone is not enough',
  SlotFillerService.isHandoffReady({ patientName: 'أحمد', phone: '01012345678' }),
  false,
);
check(
  'name + phone + specialty is ready',
  SlotFillerService.isHandoffReady({ patientName: 'أحمد', phone: '01012345678', specialty: 'عظام' }),
  true,
);
check(
  'whitespace does not count as filled',
  SlotFillerService.isHandoffReady({ patientName: '  ', phone: '01012345678', specialty: 'عظام' }),
  false,
);
check('missing slots are named', SlotFillerService.missingForHandoff({ phone: '01012345678' }), [
  'patientName',
  'specialty',
]);

// ═════════════════════ Qualification ═════════════════════
const qualifier = new QualifierService();
const clean: SafetyVerdict = { action: 'PROCEED', flag: null, categoryId: null, matchedTerm: null, confidence: 'high' };

function classify(text: string, slots: Slots = {}, safety = clean, groundingFailed = false, current: any = 'INFORMATION_ONLY') {
  return qualifier.classify({ text, slots, safety, groundingFailed, current });
}

check('a plain question is information only', classify('العنوان فين؟'), 'INFORMATION_ONLY');
check('booking intent without contact is interested', classify('عايز احجز عند دكتور عظام'), 'INTERESTED');
check(
  'booking intent with a phone is a warm lead',
  classify('عايز احجز', { phone: '01012345678' }),
  'WARM_LEAD',
);
check(
  'complete slots are ready to book',
  classify('تمام', { patientName: 'أحمد', phone: '01012345678', specialty: 'عظام' }),
  'READY_TO_BOOK',
);
check('asking for a person needs a human', classify('عايز اكلم موظف'), 'NEEDS_HUMAN');
check('a complaint needs a human', classify('عندي شكوى'), 'NEEDS_HUMAN');
check('a grounding failure needs a human', classify('سؤال عادي', {}, clean, true), 'NEEDS_HUMAN');

check(
  'an emergency outranks a complete lead',
  classify(
    'وجع في الصدر',
    { patientName: 'أحمد', phone: '01012345678', specialty: 'عظام' },
    { action: 'EMERGENCY_STOP', flag: 'EMERGENCY' as any, categoryId: 'CARDIAC', matchedTerm: 'وجع في الصدر', confidence: 'high' },
  ),
  'EMERGENCY',
);
check(
  'status never downgrades',
  classify('شكراً', {}, clean, false, 'WARM_LEAD'),
  'WARM_LEAD',
);

// ═════════════════════ Report ═════════════════════
console.log('');
if (failures.length) {
  console.error(`✗ ${failures.length} failed, ${passed} passed\n`);
  failures.forEach((f) => console.error('  ✗ ' + f + '\n'));
  process.exit(1);
}
console.log(`✓ engine — ${passed} checks passed`);
