/**
 * The embedding contract, in one place because two programs must agree on it.
 *
 * `SemanticSource` embeds the patient's question at search time and
 * `receptionist/scripts/ingest-knowledge.ts` embeds the knowledge sections at
 * ingest time. Vectors from two different models — or the same model at two
 * different dimensionalities — are not comparable, so a drift between those
 * two files does not raise an error. It silently returns nonsense similarity
 * scores, and the receptionist quietly answers from the wrong section.
 *
 * That is why this file has no imports: the script can read it directly
 * without dragging in Nest or Prisma.
 *
 * ── History worth keeping ────────────────────────────────────────────────
 * Both sides originally called `text-embedding-004`. Google withdrew it, and
 * the endpoint answers 404 "not found for API version v1beta". Because
 * SemanticSource swallows its own errors by design, that 404 produced exactly
 * the same observable behaviour as an empty knowledge base: the assistant said
 * it did not know. It was only visible once the ingester made the same call
 * with the failure surfaced.
 */

/** Current GA text embedding model. `text-embedding-004` is withdrawn. */
export const EMBEDDING_MODEL = 'gemini-embedding-001';

/**
 * Must equal the `vector(N)` width of `AiKnowledgeBase.embedding`.
 *
 * gemini-embedding-001 defaults to 3072 and supports 128–3072 via
 * `outputDimensionality`; 768 is one of the recommended values and is what the
 * column was created with, so it is requested explicitly on every call. Change
 * this and you must ALTER the column and re-embed every row — the dimension is
 * part of the stored data, not a setting.
 */
export const EMBEDDING_DIMENSIONS = 768;

/**
 * Gemini embeddings are asymmetric: a question and the passage that answers it
 * are embedded with different task types, which measurably improves retrieval
 * over embedding both the same way. Getting these backwards is not an error
 * either — just quieter, worse matching.
 */
export const TASK_TYPE_QUERY = 'RETRIEVAL_QUERY';
export const TASK_TYPE_DOCUMENT = 'RETRIEVAL_DOCUMENT';

export const EMBEDDING_URL = (apiKey: string): string =>
  `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:embedContent?key=${apiKey}`;
