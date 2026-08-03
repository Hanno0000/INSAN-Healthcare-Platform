import { Injectable } from '@nestjs/common';
import { SafetyFlag } from '@prisma/client';
import { LexiconLoader } from './lexicon.loader';

export type SafetyAction =
  | 'PROCEED'
  | 'EMERGENCY_STOP'
  | 'SELF_HARM_STOP'
  | 'WARN_ABUSE'
  | 'END_ABUSE'
  | 'MARK_SPAM';

export interface SafetyVerdict {
  action: SafetyAction;
  flag: SafetyFlag | null;
  /** Category id that fired, for the log and the admin timeline. */
  categoryId: string | null;
  /** The lexicon term that matched. Kept for tuning the lexicon against real traffic. */
  matchedTerm: string | null;
  /**
   * Lowered when the message also carries a history marker ("زمان كان عندي...").
   * Never suppresses the action — see the lexicon's note on why.
   */
  confidence: 'high' | 'reduced';
}

const PROCEED: SafetyVerdict = {
  action: 'PROCEED',
  flag: null,
  categoryId: null,
  matchedTerm: null,
  confidence: 'high',
};

/**
 * Deterministic safety layer. Runs before any model call, on every message.
 *
 * Order is load-bearing: self-harm, then medical emergency, then abuse, then
 * spam. A message containing both "عايز اموت" and an insult is a crisis, not an
 * abusive user.
 */
@Injectable()
export class SafetyGateService {
  constructor(private readonly lexicons: LexiconLoader) {}

  /**
   * Fold Arabic orthographic variation so one lexicon entry matches how people
   * actually type. Patients write 'الم فى الصدر' and 'ألم في الصدر' and both
   * must hit the same term.
   */
  static normalize(input: string): string {
    return input
      .replace(/[ً-ْٰ]/g, '') // diacritics
      .replace(/ـ/g, '') // tatweel
      .replace(/[أإآٱ]/g, 'ا')
      .replace(/ة/g, 'ه')
      .replace(/ى/g, 'ي')
      .replace(/ؤ/g, 'و')
      .replace(/ئ/g, 'ي')
      .replace(/[^\p{L}\p{N}\s]/gu, ' ') // punctuation → space
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  private static findTerm(haystack: string, terms: string[]): string | null {
    for (const term of terms) {
      const needle = SafetyGateService.normalize(term);
      if (needle && haystack.includes(needle)) return term;
    }
    return null;
  }

  /**
   * Match a co-occurrence group: every fragment must be present, in any order,
   * with anything in between. Covers Arabic conjugation and word order without
   * enumerating every form — 'امي مش قادرة خالص تتنفس' matches
   * ['مش قادر', 'تنفس'] because 'قادره' contains 'قادر' and 'تتنفس' contains
   * 'تنفس'.
   */
  private static findCooccurrence(haystack: string, groups?: string[][]): string | null {
    if (!groups) return null;
    for (const group of groups) {
      const all = group.every((fragment) => {
        const needle = SafetyGateService.normalize(fragment);
        return needle !== '' && haystack.includes(needle);
      });
      if (all) return group.join(' + ');
    }
    return null;
  }

  /** Terms first, then co-occurrence. Returns the matching rule for the log. */
  private static match(haystack: string, category: { terms: string[]; cooccurrence?: string[][] }): string | null {
    return (
      SafetyGateService.findTerm(haystack, category.terms) ??
      SafetyGateService.findCooccurrence(haystack, category.cooccurrence)
    );
  }

  /**
   * @param text        the patient's message
   * @param recentTexts previous messages this conversation, newest last —
   *                    used only for the repeat/burst spam signals
   */
  evaluate(text: string, recentTexts: string[] = []): SafetyVerdict {
    const normalized = SafetyGateService.normalize(text);
    if (!normalized) return PROCEED;

    const emergency = this.lexicons.getEmergency();

    // 1. Self-harm first. A crisis message that also contains an insult is a
    //    crisis; ordering this after abuse would hand it to the abuse policy.
    const selfHarm = SafetyGateService.match(normalized, emergency.selfHarm);
    if (selfHarm) {
      return {
        action: 'SELF_HARM_STOP',
        flag: SafetyFlag.EMERGENCY,
        categoryId: emergency.selfHarm.id,
        matchedTerm: selfHarm,
        confidence: 'high',
      };
    }

    // 2. Medical emergency.
    for (const category of emergency.categories) {
      const hit = SafetyGateService.match(normalized, category);
      if (!hit) continue;

      const historical = SafetyGateService.findTerm(normalized, emergency.historicalMarkers.terms);
      return {
        action: 'EMERGENCY_STOP',
        flag: SafetyFlag.EMERGENCY,
        categoryId: category.id,
        matchedTerm: hit,
        // A history marker lowers confidence for tuning, and changes nothing
        // about what happens next. Deliberate: see the lexicon's note.
        confidence: historical ? 'reduced' : 'high',
      };
    }

    const abuseLex = this.lexicons.getAbuse();

    // 3. Spam before abuse — a flood of identical junk should not be recorded
    //    as an abusive patient.
    const spam = this.detectSpam(text, recentTexts, abuseLex);
    if (spam) {
      return { action: 'MARK_SPAM', flag: SafetyFlag.SPAM, categoryId: spam, matchedTerm: null, confidence: 'high' };
    }

    // 4. Abuse. Biased toward false negatives: a frightened relative swearing
    //    is not an abusive user, and silencing them is the worse failure.
    const abuse = SafetyGateService.findTerm(normalized, abuseLex.abuse.terms);
    if (abuse) {
      const alreadyWarned = recentTexts.some((t) =>
        SafetyGateService.findTerm(SafetyGateService.normalize(t), abuseLex.abuse.terms),
      );
      return {
        action: alreadyWarned ? 'END_ABUSE' : 'WARN_ABUSE',
        flag: SafetyFlag.ABUSE,
        categoryId: 'ABUSE',
        matchedTerm: abuse,
        confidence: 'high',
      };
    }

    return PROCEED;
  }

  private detectSpam(
    text: string,
    recentTexts: string[],
    lex: ReturnType<LexiconLoader['getAbuse']>,
  ): string | null {
    const repeat = lex.spam.signals.find((s) => s.id === 'REPEAT_IDENTICAL');
    if (repeat?.threshold) {
      const identical = recentTexts.filter((t) => t.trim() === text.trim()).length;
      if (identical + 1 >= repeat.threshold) return 'REPEAT_IDENTICAL';
    }

    const linkOnly = /^\s*https?:\/\/\S+\s*$/i.test(text);
    if (linkOnly) return 'LINK_ONLY';

    const hasArabic = /[؀-ۿ]/.test(text);
    const hasLatin = /[a-zA-Z]/.test(text);
    if (text.trim().length > 8 && !hasArabic && !hasLatin) return 'NO_ARABIC_NO_ENGLISH';

    return null;
  }

  /**
   * The medical-emergency reply for a resolved hospital, or null while the
   * operator has not written it. The gate still detects and still flags — it
   * just refuses to improvise the one message that must not be improvised.
   */
  emergencyReply(hospitalSlug: string | null): string | null {
    return this.lexicons.renderEmergencyReply(hospitalSlug);
  }

  /**
   * The self-harm reply, or null until a clinician has written it.
   *
   * A separate method reading a separate block, on purpose. These two messages
   * must never converge: "go to the emergency department" is the correct
   * response to chest pain and the wrong response to someone in crisis.
   */
  selfHarmReply(): string | null {
    return this.lexicons.renderSelfHarmReply();
  }
}
