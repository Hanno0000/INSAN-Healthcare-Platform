# Prompt Caching — Implementation Brief

> **Written:** 2026-07-27
> **For:** a fresh session, with no memory of the sprint that produced it.
> **Goal:** cut input cost substantially without changing a single word of output.
> **Status:** proposal — nothing below has been implemented.

---

## 0. Read this first

This brief is written to be executed by someone (or some session) that has never
seen this codebase. Every claim below was verified against the actual source on
2026-07-27; line numbers are from that day's `main`.

**The constraint that governs everything here:** the operator has just finished a
long sprint tuning content and image quality. Cost work must not touch quality.
That rules out the obvious levers — shorter prompts, fewer docs, a cheaper model.
It leaves caching, which is the only lever that reduces cost while the model sees
*byte-identical* input.

---

## 1. Current cost

| | |
|---|---|
| Measured | ~$0.50/row (5-row validation run ≈ $2.50) |
| At 100 rows/month | ~$50/month, text only |
| Gemini image generation | billed separately, not addressed here |

Input dominates: each row sends the worker prompt + project docs + vocabulary
(large, identical every row) and receives roughly 1–2K tokens back. Cutting input
cost is therefore nearly the same as cutting total cost.

**Do not trust the "~18K tokens" figure from the earlier estimate.** It is
probably low. `CREATIVE_DIRECTOR_WORKER.md` alone is 72,701 characters, and
mixed Arabic/English runs closer to ~3 chars/token than the English ~4. Five
project docs live only in Drive and were never measured. Step 1 below replaces
the guess with the real number, which the API already returns.

---

## 2. The finding that blocks everything

`src/ContextBuilder.gs:144`

```javascript
_buildHeader: function(workerName) {
  return [
    'You are executing inside the INSAN Healthcare AI Operating System.',
    'Worker: ' + workerName,
    'Time: ' + new Date().toISOString(),     // <-- line 149
    ...
```

Every form of prompt caching — Gemini implicit, Gemini explicit, Anthropic
`cache_control` — matches a **prefix, from byte zero**. This timestamp sits on
the third line of every prompt and changes on every call.

The cacheable prefix today is two lines long. **No caching of any kind can work
until this is removed.** Enabling caching without removing it would produce a
100% miss rate and look like the feature simply doesn't work.

Verified: nothing consumes it. `grep -i "time:|timestamp|current date|today"`
across all six prompt files returns two unrelated matches
(`CONTENT_CREATION_WORKER.md:799` "today's post", `CONTENT_STRATEGY_WORKER.md:1419`
"Today's Episode"). No worker is instructed to read the clock, and no output
field depends on it.

---

## 3. The finding that makes this cheap

`src/ContextBuilder.gs:12-18` assembles the prompt in this order:

```javascript
sections.push(this._buildHeader(workerName));            // static per worker
sections.push(this._buildWorkerPrompt(workerName));      // static per worker  ← the bulk
sections.push(this._buildProjectDocs(workerName));       // static per worker  ← the bulk
sections.push(this._buildControlledVocabulary(config));  // static per worker
sections.push(this._buildRowData(config, rowData));      // PER ROW
sections.push(this._buildCreativeMemory(name, rowData)); // PER ROW (and per run position)
sections.push(this._buildOutputFormat(config));          // static, but trailing
```

**Everything static already precedes everything dynamic.** That is the layout
caching requires, and it is already correct. No restructuring is needed.

This matters more than it looks: reordering a prompt *can* change output, and
that is the one thing this work must not do. Because no reordering is needed,
the quality risk of this entire project collapses to a single deleted line.

`_buildOutputFormat` trails the dynamic sections and therefore cannot be cached.
Leave it there. It is ~250 tokens, and moving it would change prompt structure
for a rounding error.

---

## 4. Why this is quality-neutral (and where it isn't)

Caching does not change the tokens the model receives. The same tokens go in, so
the same output distribution comes out. Cached and uncached calls differ in
billing and latency, not in behaviour.

Two honest caveats:

1. **Removing the timestamp does change the prompt** — by one line, in a way
   nothing was reading. Models are sensitive to prompt text, so output is not
   guaranteed bit-identical. This is about as small as a prompt change gets, and
   step 5 checks it.
2. **A stale cache is a real quality regression.** If a prompt file is edited in
   Drive and the cache still holds the old text, rows are produced from the old
   prompt with no error and no warning. This is the single genuine risk in the
   plan. Section 6's content-hash cache key exists specifically to prevent it,
   and it must not be simplified away.

---

## 5. Implementation, in order

### Step 1 — Measure first (no behaviour change, no cost change)

`src/AIProvider.gs:338` already parses `usageMetadata` but reads only three
fields:

```javascript
var usageMetadata = parsed.usageMetadata || {};
return {
  text: text.trim(),
  inputTokens: usageMetadata.promptTokenCount || 0,
  outputTokens: usageMetadata.candidatesTokenCount || 0,
  totalTokens: usageMetadata.totalTokenCount || 0,
  finishReason: candidate.finishReason || 'UNKNOWN'
};
```

Add `cachedContentTokenCount` and log it per call, alongside the worker name.

Do this **before** any other step. Without it there is no way to tell whether
caching is working, and the failure mode of caching is silent — it just quietly
bills full price. This also yields the true prompt size per worker, replacing the
~18K guess.

### Step 2 — Delete the timestamp (free, unblocks everything)

Remove line 149 of `src/ContextBuilder.gs`. Nothing else.

If the timestamp is ever genuinely wanted, it belongs inside the row-data
section, after the cacheable prefix — never before it.

### Step 3 — Confirm what the configured model actually supports

**Do not write caching code from memory.** Check the current Gemini API
documentation for the model in `CONFIG.GEMINI_MODEL` and establish:

- Whether **implicit caching** applies to it (automatic prefix discount, no code)
- The **minimum token count** for a cache to be eligible — this is model-specific
  and has changed repeatedly; if the prefix falls under it, explicit caching
  silently does nothing
- The **discount rate** on cached input tokens
- The **storage price** per token-hour for explicit caches
- Whether `cachedContent` is supported on the `v1beta` `generateContent` endpoint
  this project calls (`src/AIProvider.gs:223`)

If implicit caching applies and the prefix clears the minimum, **steps 1–2 may be
the entire project.** Re-run and read the numbers from step 1 before building
anything further.

### Step 4 — Explicit caching, only if step 3 says it's needed

The design work here is specific to this project's constraints:

**Cache key must include a content hash.** Key on
`workerName + hash(headerText + promptText + docsText + vocabularyText)`. When a
prompt file is edited in Drive, the hash changes, the old cache is abandoned, a
new one is created. Keying on worker name alone would serve stale prompts
indefinitely — see §4 caveat 2.

**The handle must survive across executions.** A 100-row job spans multiple
Apps Script invocations (6-minute ceiling; see `ExecutionBudget` in
`src/WorkerRunner.gs`). Store the cache name and its content hash in Script
Properties, not in a variable.

**TTL and cleanup.** Explicit caches bill for storage per hour whether used or
not. Size the TTL to a run, and delete caches when a job completes — including
the `Cancel Background Job` path. A cache left alive between monthly runs is pure
waste.

**Five separate caches.** Each text worker has a different prompt and doc set, so
each gets its own cache entry. Budget storage accordingly. The image-generation
path (`src/ServiceRunner.gs`) sends short per-row prompts plus reference images
and gains nothing from caching — leave it alone.

**Fail open, always.** Any cache error — creation failure, expired handle,
unsupported model — must fall back to sending the full uncached prompt. A cost
optimisation must never fail a row. This is the same principle already applied to
project assets in `src/DriveLoader.gs`.

### Step 5 — Verify quality is unchanged

Re-run the same rows used in the last validation run and diff the content fields
against the stored output. Compare `Post Copy`, `Visual Concept`, and the
Creative Director scores. Expect close-but-not-identical text (temperature is
non-zero); look for a *shift in character* — register, length, structure — not
for exact matches.

Confirm from the step 1 logs that `cachedContentTokenCount` is non-zero from the
second row onward. Row 1 of each worker is always a miss; that is correct.

---

## 6. Also worth knowing

**`ClaudeProvider` is unaffected but not caching-ready.** `src/AIProvider.gs:146`
builds a plain `messages` payload with no `cache_control` breakpoints. If a
worker is ever moved to Claude (blocked on `ANTHROPIC_API_KEY`), the same prefix
work applies there — the removal in step 2 benefits both providers.

**Do not take these shortcuts**, each of which saves tokens by removing quality:

- Trimming project docs from a worker's `docs` list
- Shortening the tuned prompts
- Switching to a cheaper model to cut cost (a separate decision, on quality
  grounds, not a caching matter)
- Caching anything that varies per row

**Deferred, larger, riskier:** `CREATIVE_DIRECTOR_WORKER.md` is 72,701
characters and may restate material already present in the project docs it also
loads — paid twice on every row. Deduplicating would cut real cost, but it means
editing prompts that were just tuned for quality. Revisit only after quality is
locked and caching is measured.

---

## 7. Expected result

Input tokens are ~90–95% static per worker. If the discount confirmed in step 3
is in the range Gemini has historically offered, per-row cost falls by roughly an
order of magnitude, with output tokens becoming the dominant remaining cost.

**A specific per-row figure is deliberately not quoted here.** The earlier
"$0.15/row" estimate assumed a 90% discount and an 18K-token prefix, neither of
which has been verified. Step 1 supplies the real token count and step 3 the real
discount; compute it then, from measurements.
