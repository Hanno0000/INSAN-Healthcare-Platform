import { Injectable, Logger } from '@nestjs/common';
import { RetrievedRecord } from '../types';

export interface GroundingResult {
  ok: boolean;
  /** The reply with citation markers stripped — what the patient actually sees. */
  cleanText: string;
  /** Ids that were cited and do exist. Stored on the message for the audit trail. */
  validCitations: string[];
  /** Ids the model invented. Any of these fails the turn. */
  fabricatedCitations: string[];
  reason: string | null;
}

const FALLBACK = 'المعلومة دي مش متأكد منها، هراجعها مع الفريق وأرد عليك.';

/**
 * Verifies that what the reply asserts traces to what was actually retrieved.
 *
 * This is the line between a receptionist and something that invents clinic
 * hours in fluent Arabic. The model is instructed to cite record ids; this
 * checks the citations against the set retrieved for *this turn*, so a
 * plausible-looking id from an earlier turn or from nowhere at all is caught.
 */
@Injectable()
export class GroundingService {
  private readonly logger = new Logger(GroundingService.name);

  /** `[clinic:abc123]`, `[kb:xyz]`, `[hours:delta-hospital:emergency]` */
  private static readonly CITATION = /\[([a-z]+:[A-Za-z0-9_:-]+)\]/g;

  /**
   * Assertions that must be backed by a record. Times and phone numbers are the
   * two things a patient will act on physically — travel somewhere, dial
   * something — so an uncited one is treated as ungrounded even though the
   * model produced no false citation.
   */
  private static readonly FACT_SHAPES: Array<{ pattern: RegExp; what: string }> = [
    { pattern: /\b\d{1,2}\s*[:.]\s*\d{2}\b/, what: 'a clock time' },
    { pattern: /\b(0\d{9,10})\b/, what: 'a phone number' },
    { pattern: /\b\d{1,2}\s*(ص|م|صباحا|مساء)\b/, what: 'a time of day' },
  ];

  verify(replyText: string, retrieved: RetrievedRecord[]): GroundingResult {
    const available = new Set(retrieved.map((r) => r.id));

    const cited: string[] = [];
    let match: RegExpExecArray | null;
    const re = new RegExp(GroundingService.CITATION.source, 'g');
    while ((match = re.exec(replyText)) !== null) cited.push(match[1]);

    const fabricated = cited.filter((id) => !available.has(id));
    const valid = cited.filter((id) => available.has(id));
    const cleanText = replyText.replace(new RegExp(GroundingService.CITATION.source, 'g'), '').replace(/\s{2,}/g, ' ').trim();

    if (fabricated.length > 0) {
      this.logger.warn(`Fabricated citation(s): ${fabricated.join(', ')} — reply replaced.`);
      return {
        ok: false,
        cleanText: FALLBACK,
        validCitations: valid,
        fabricatedCitations: fabricated,
        reason: `cited records that were not retrieved: ${fabricated.join(', ')}`,
      };
    }

    // An uncited time or phone number. The model asserted something actionable
    // without pointing at a record — most often because it paraphrased from its
    // own prior turn rather than from this turn's retrieval.
    if (cited.length === 0) {
      const shape = GroundingService.FACT_SHAPES.find((f) => f.pattern.test(cleanText));
      if (shape) {
        this.logger.warn(`Uncited assertion (${shape.what}) — reply replaced.`);
        return {
          ok: false,
          cleanText: FALLBACK,
          validCitations: [],
          fabricatedCitations: [],
          reason: `asserted ${shape.what} with no citation`,
        };
      }
    }

    return { ok: true, cleanText, validCitations: valid, fabricatedCitations: [], reason: null };
  }
}
