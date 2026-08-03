/**
 * Safety gate tests. No database, no network, no model call.
 *
 *   cd website/apps/api
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' ../../../receptionist/scripts/test-safety.ts
 *
 * Untested safety code is not safety code.
 */

import { SafetyGateService } from '../../website/apps/api/src/modules/receptionist/core/safety/safety-gate.service';
import { LexiconLoader } from '../../website/apps/api/src/modules/receptionist/core/safety/lexicon.loader';
import * as path from 'path';

const SAFETY_DIR = path.resolve(__dirname, '..', 'safety');

// Minimal ConfigService stand-in — the loader only reads one key.
const loader = new LexiconLoader({
  get: (k: string) => (k === 'RECEPTIONIST_SAFETY_DIR' ? SAFETY_DIR : undefined),
} as any);
loader.onModuleInit();

const gate = new SafetyGateService(loader);

let passed = 0;
const failures: string[] = [];

function check(name: string, actual: unknown, expected: unknown) {
  if (JSON.stringify(actual) === JSON.stringify(expected)) {
    passed++;
  } else {
    failures.push(`${name}\n      expected ${JSON.stringify(expected)}\n      got      ${JSON.stringify(actual)}`);
  }
}

function action(text: string, recent: string[] = []) {
  return gate.evaluate(text, recent).action;
}

// ─── Normalisation ───────────────────────────────────────────────────
check('normalize folds alef variants', SafetyGateService.normalize('ألم إحساس آخر'), 'الم احساس اخر');
check('normalize folds ta-marbuta and alef-maqsura', SafetyGateService.normalize('عيادة مستشفى'), 'عياده مستشفي');
check('normalize strips diacritics and tatweel', SafetyGateService.normalize('مَرِيــض'), 'مريض');

// ─── Emergencies fire regardless of spelling ─────────────────────────
check('chest pain — standard spelling', action('عندي ألم في الصدر'), 'EMERGENCY_STOP');
check('chest pain — colloquial spelling', action('حاسس بالم فى الصدر من ساعة'), 'EMERGENCY_STOP');
check('breathing', action('امي مش قادرة تتنفس'), 'EMERGENCY_STOP');
check('stroke', action('ابويا وشه اعوج فجأة'), 'EMERGENCY_STOP');
check('bleeding', action('في نزيف مش واقف'), 'EMERGENCY_STOP');
check('unconscious', action('جوزي مغمى عليه'), 'EMERGENCY_STOP');
check('pediatric', action('طفلي مش بيتنفس'), 'EMERGENCY_STOP');

// ─── Conjugation, via co-occurrence rules ────────────────────────────
check('breathing — feminine subject and verb', action('امي مش قادرة تتنفس'), 'EMERGENCY_STOP');
check('breathing — words in between', action('امي مش قادرة خالص تتنفس من امبارح'), 'EMERGENCY_STOP');
check('breathing — first person', action('انا مش قادر اتنفس'), 'EMERGENCY_STOP');
check('cardiac — reordered', action('حاسس بوجع جامد في الصدر'), 'EMERGENCY_STOP');

// ─── False positives that must NOT fire ──────────────────────────────
// 'مش بيرد' + 'مش' was a co-occurrence rule until this case was written down:
// a complaint about an unanswered phone is not a collapse.
check('unanswered phone is not unconsciousness', action('الدكتور مش بيرد على التليفون'), 'PROCEED');
check('asking about breathing tests is not distress', action('عايز اعمل وظايف تنفس'), 'PROCEED');

// ─── Self-harm outranks everything ───────────────────────────────────
check('self-harm', action('انا مش عايز اعيش'), 'SELF_HARM_STOP');
check(
  'self-harm outranks abuse in the same message',
  action('انتم حرامية وانا هموت نفسي'),
  'SELF_HARM_STOP',
);

// ─── History markers reduce confidence, never suppress ────────────────
{
  const v = gate.evaluate('زمان كان عندي ألم في الصدر بس خلص');
  check('history marker still fires', v.action, 'EMERGENCY_STOP');
  check('history marker lowers confidence', v.confidence, 'reduced');
}
{
  const v = gate.evaluate('عندي ألم في الصدر دلوقتي');
  check('no history marker keeps high confidence', v.confidence, 'high');
}

// ─── Ordinary traffic must NOT trip ──────────────────────────────────
check('booking enquiry', action('عايز احجز عند دكتور عظام'), 'PROCEED');
check('hours enquiry', action('العيادات بتفتح امتى؟'), 'PROCEED');
check('greeting', action('السلام عليكم'), 'PROCEED');
check('empty', action('   '), 'PROCEED');
check('frustration is not abuse', action('المستشفى دي وحشة والخدمة بطيئة'), 'PROCEED');

// ─── Abuse: warn once, then end ──────────────────────────────────────
check('abuse first offence warns', action('انتم نصابين'), 'WARN_ABUSE');
check('abuse second offence ends', action('انتم نصابين', ['انتم نصابين']), 'END_ABUSE');

// ─── Spam ────────────────────────────────────────────────────────────
check('link-only is spam', action('https://example.com'), 'MARK_SPAM');
check('repeat flood is spam', action('اهلا', ['اهلا', 'اهلا', 'اهلا']), 'MARK_SPAM');
check('a normal repeat is not spam', action('اهلا', ['اهلا']), 'PROCEED');

// ─── The operator gates ──────────────────────────────────────────────
check('emergency reply is withheld until the operator supplies wording', gate.emergencyReply(null), null);
check('emergency reply is withheld per hospital too', gate.emergencyReply('delta-hospital'), null);
check('self-harm reply is withheld until a clinician supplies wording', gate.selfHarmReply(), null);

// ─── The two crisis paths must stay separate ─────────────────────────
// They shared one code path until 2026-08-03. Telling someone in a
// mental-health crisis to go to an emergency department is the wrong response,
// so these assertions exist to stop them converging again.
check('self-harm and medical emergency are different actions', action('عايز اموت') !== action('وجع في صدري'), true);
check('self-harm action is its own', action('عايز اموت'), 'SELF_HARM_STOP');
check('medical emergency action is its own', action('وجع في صدري'), 'EMERGENCY_STOP');

// ─── Report ──────────────────────────────────────────────────────────
console.log('');
if (failures.length) {
  console.error(`✗ ${failures.length} failed, ${passed} passed\n`);
  failures.forEach((f) => console.error('  ✗ ' + f + '\n'));
  process.exit(1);
}
console.log(`✓ safety gate — ${passed} checks passed`);
