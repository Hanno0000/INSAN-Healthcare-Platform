import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RetrievalQuery, RetrievalSource, RetrievedRecord, SourceKind } from '../types';

interface KbRow {
  id: string;
  topic: unknown;
  question: unknown;
  answer: unknown;
  similarity: number;
}

/**
 * Prose with no single right answer: policies, FAQs, brochure text.
 *
 * Never schedules, never addresses, never phone numbers — those go through the
 * deterministic source. A similarity search over a schedule returns the nearest
 * schedule, which is a wrong answer delivered with the same confidence as a
 * right one.
 *
 * Below `MIN_SIMILARITY` the turn returns nothing and the engine escalates
 * rather than answering from a weak match.
 */
@Injectable()
export class SemanticSource implements RetrievalSource {
  readonly kind: SourceKind = 'SEMANTIC';
  private readonly logger = new Logger(SemanticSource.name);

  private static readonly MIN_SIMILARITY = 0.55;
  private static readonly LIMIT = 4;

  constructor(private readonly prisma: PrismaService) {}

  async retrieve(query: RetrievalQuery): Promise<RetrievedRecord[]> {
    const vector = await this.embed(query.text);
    if (!vector.length) return [];

    let rows: KbRow[];
    try {
      // NOTE: "isActive" is double-quoted deliberately.
      //
      // The pre-existing implementation in modules/ai/ai.service.ts writes
      // `WHERE isActive = true`. Postgres folds unquoted identifiers to
      // lowercase, Prisma created the column as "isActive", so that query
      // errors on `isactive` — every retrieval silently returned nothing and
      // the assistant answered ungrounded while looking perfectly healthy.
      rows = await this.prisma.$queryRawUnsafe<KbRow[]>(
        `SELECT id, topic, question, answer,
                1 - (embedding <=> $1::vector) AS similarity
           FROM "AiKnowledgeBase"
          WHERE "isActive" = true AND embedding IS NOT NULL
          ORDER BY embedding <=> $1::vector
          LIMIT ${SemanticSource.LIMIT}`,
        `[${vector.join(',')}]`,
      );
    } catch (e) {
      // A failing knowledge search must not take down the turn — the
      // deterministic source may still have the answer.
      this.logger.error(`Semantic retrieval failed: ${(e as Error).message}`);
      return [];
    }

    return rows
      .filter((r) => r.similarity >= SemanticSource.MIN_SIMILARITY)
      .map((r) => ({
        id: `kb:${r.id}`,
        kind: this.kind,
        label: this.ar(r.topic) || this.ar(r.question),
        content: `${this.ar(r.question)}\n${this.ar(r.answer)}`,
        // Knowledge-base entries are operator-authored, so a match above the
        // threshold is `stated`. The threshold is what does the work here.
        confidence: 'stated' as const,
        sourceRef: `AiKnowledgeBase ${r.id}`,
        similarity: r.similarity,
      }));
  }

  /**
   * Embeddings reuse the existing AiProvider row so the operator manages one
   * set of keys in one admin screen. No provider configured means no semantic
   * search — the deterministic path still works, which is the important one.
   */
  private async embed(text: string): Promise<number[]> {
    const provider = await this.prisma.aiProvider.findFirst({
      where: { name: { contains: 'gemini', mode: 'insensitive' }, isActive: true },
    });
    if (!provider) return [];

    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${provider.apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: 'models/text-embedding-004', content: { parts: [{ text }] } }),
        },
      );
      if (!res.ok) {
        this.logger.warn(`Embedding request failed: ${res.status}`);
        return [];
      }
      const data = (await res.json()) as { embedding?: { values?: number[] } };
      return data.embedding?.values ?? [];
    } catch (e) {
      this.logger.warn(`Embedding request threw: ${(e as Error).message}`);
      return [];
    }
  }

  private ar(value: unknown): string {
    if (value && typeof value === 'object' && 'ar' in (value as Record<string, unknown>)) {
      return String((value as Record<string, unknown>).ar ?? '');
    }
    return String(value ?? '');
  }
}
