import { Injectable } from '@nestjs/common';
import { RetrievalQuery, RetrievedRecord } from '../types';
import { DeterministicSource } from './deterministic.source';
import { SemanticSource } from './semantic.source';

/**
 * The single entry point for facts.
 *
 * Two sources with deliberately different guarantees, behind one interface so
 * new sources (uploaded PDFs, policy documents, an EMR) plug in without the
 * engine changing. What must never change: which kind of question each source
 * is allowed to answer.
 */
@Injectable()
export class RetrieverService {
  constructor(
    private readonly deterministic: DeterministicSource,
    private readonly semantic: SemanticSource,
  ) {}

  async retrieve(query: RetrievalQuery): Promise<RetrievedRecord[]> {
    // Run both; a question often needs a schedule *and* a policy.
    const [facts, prose] = await Promise.all([
      this.deterministic.retrieve(query),
      this.semantic.retrieve(query),
    ]);

    // Deterministic first: when both speak to the same thing, the exact record
    // is the one the reply should lead with.
    const merged = [...facts, ...prose];

    const seen = new Set<string>();
    return merged.filter((r) => (seen.has(r.id) ? false : (seen.add(r.id), true)));
  }

  /**
   * Render for the prompt. Ids are exposed because the model is required to
   * cite them and the grounding check verifies the citation against this exact
   * set — see GroundingService.
   */
  static render(records: RetrievedRecord[]): string {
    if (records.length === 0) {
      return 'لا توجد معلومات مؤكدة عن هذا السؤال في قاعدة المعرفة.';
    }
    return records
      .map((r) => `[${r.id}] ${r.label}\n${r.content}`)
      .join('\n\n');
  }
}
