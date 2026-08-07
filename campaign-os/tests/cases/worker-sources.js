// What each worker reads before it decides anything.
//
// The operator asked whether the workers actually understand they are working
// inside the INSAN platform. Answering it needed a list of what each worker
// loads, and that list existed only as `docs:` arrays scattered through CONFIG
// plus three prompt builders that load documents directly and appear in no array.
//
// So this suite pins the two things that make the answer stay true:
//
//   1. The documents that must bind EVERY content worker are loaded by every
//      content worker — a rule written into a file four of them never open is
//      not a rule.
//   2. Those documents actually carry the platform's identity: the slogan, and
//      the attribution rule for hospital and center pages.
//
// `docs/WORKER_SOURCES_OF_TRUTH.md` is the human-readable version. This is what
// stops it becoming decoration.

const BRAND = 'MASTER_BRAND_ARCHITECTURE.md';
const CONSTITUTION = 'AI_CREATIVE_CONSTITUTION.md';

// Every worker that writes, designs or judges what is published. Deliberately
// excludes W2 and the Portfolio Critic, which schedule rather than write, and
// W7/W9, which make no judgement of their own.
const CONTENT_WORKERS = [
  'CONTENT_STRATEGY_WORKER',
  'CONTENT_CREATION_WORKER',
  'CREATIVE_DIRECTOR_WORKER',
  'VISUAL_PLANNER_WORKER',
  'VISUAL_QA_WORKER'
];

module.exports = {
  name: 'worker sources',

  run(t, fx) {
    // --- 1. every content worker loads the two binding documents ---
    for (const name of CONTENT_WORKERS) {
      const worker = CONFIG.WORKERS[name];
      t.ok(worker, `${name} is configured`);
      if (!worker) continue;

      const docs = worker.docs || [];
      t.includes(docs, BRAND,
        `${name} loads the brand architecture — the hierarchy and the slogan ` +
        'live there, and a worker that does not load it cannot honour either');
      t.includes(docs, CONSTITUTION,
        `${name} loads the creative constitution`);
    }

    // W1 and W10 sit outside CONFIG.WORKERS but produce published material.
    // W1 matters most: every other worker inherits its card.
    const cardBuilder = fx.srcSection('CardBuilder');
    t.includes(cardBuilder, BRAND,
      'W1 loads the brand architecture — it builds the card every downstream ' +
      'worker inherits, so an omission here is inherited by everything');
    t.includes(cardBuilder, CONSTITUTION,
      'and the creative constitution');

    t.includes((CONFIG.PAID_ADS.docs || []), BRAND, 'W10 loads the brand architecture');
    t.includes((CONFIG.PAID_ADS.docs || []), CONSTITUTION, 'W10 loads the constitution');

    // --- 2. the documents carry what they are supposed to carry ---
    const brand = fx.repoFile('business/brand/' + BRAND);
    const constitution = fx.repoFile('business/brand/' + CONSTITUTION);

    // The slogan. It was previously only in PLATFORM_KNOWLEDGE_BASE.md, which
    // W1, W6, W8 and W10 do not load — so four of the workers producing
    // published material had never seen the line the platform is named after.
    t.includes(brand, 'أساس الخدمة الطبية احترام الإنسان',
      'the slogan is in the document every content worker loads');
    t.includes(brand, 'Respect for the human being',
      'with its English rendering, for a worker reasoning in English');

    // And it is framed as a philosophy, not a stamp. A worker told only the
    // words will append them to every post, which is the failure mode.
    t.ok(/not a stamp|philosophy, not|never a signature|not a signature/i.test(brand),
      'and is framed as a philosophy rather than a line to append to posts');

    // The attribution rule — the operator's actual question. A hospital post
    // must carry that the hospital operates under the platform.
    t.ok(/operates? under the INSAN Healthcare Platform/i.test(brand),
      'the brand architecture states that hospitals operate under the platform');
    t.ok(/operates? under the INSAN Healthcare Platform/i.test(constitution),
      'and so does the creative constitution — §16 Ecosystem Cross-Platform ' +
      'Reinforcement, which is where it was already correct');

    // Stated per publishing page, because the requirement differs by page and a
    // worker handling a Delta post needs to know what a Delta post owes.
    for (const page of ['INSAN', 'Future', 'Delta']) {
      t.includes(brand, page, `the attribution guidance names ${page}`);
    }

    // Naturally, not mechanically. Both documents say so, and it is the
    // difference between the rule working and every post ending in a bolted-on
    // credit line.
    t.ok(/never force|naturally, never mechanically|Never force cross-promotion/i
      .test(brand + constitution),
      'and both forbid forcing it — a credit line bolted onto every post is the ' +
      'failure mode, not the requirement');

    // --- 3. the table is not decoration ---
    const table = fx.repoFile('campaign-os/docs/WORKER_SOURCES_OF_TRUTH.md');

    for (const name of CONTENT_WORKERS.concat(['CAMPAIGN_PLANNER'])) {
      // The table names workers by their display name (W3 Content Strategy),
      // not their config key, so check the distinctive part.
      const word = name.replace('_WORKER', '').split('_')[0];
      t.ok(table.toLowerCase().indexOf(word.toLowerCase()) !== -1,
        `the source-of-truth table mentions ${word}`);
    }

    t.ok(table.indexOf('W9') !== -1 && /no model call/i.test(table),
      'and records that W9 makes no model call — a reader looking for its ' +
      'documents should learn it has none rather than assume the row is missing');

    // --- 4. the worker reads the document it is judged against ---
    //
    // Each of these closes a case where a worker decided something it had no
    // written basis for. They are separate checks because they fail separately.

    const SPEC = 'INSAN_VISUAL_LANGUAGE_SPEC.md';

    // W3 writes Visual Concept, Visual Elements, Do NOT Show, Design Notes and
    // Text On Design as free text, and W5 and the Media Designer inherit them.
    // It was choosing this brand's visual direction without the document that
    // describes it.
    t.includes((CONFIG.WORKERS.CONTENT_STRATEGY_WORKER.docs || []), SPEC,
      'W3 loads the visual language spec — it writes nine visual columns, and ' +
      'the five free-text ones are the visual brief everything downstream uses');

    // The strongest of the set: W8 is the gate. Approved / Revision Required /
    // Rejected against Style Ratio, Strictly Prohibited Styles and Quality
    // Criteria — all of which are in a document it did not open.
    t.includes((CONFIG.WORKERS.VISUAL_QA_WORKER.docs || []), SPEC,
      'W8 loads the visual language spec — it scores and approves artwork, and ' +
      'a gate that has not read the standard approves what it should stop');

    // W6 deliberately does NOT. It writes Asset Count, Production Mode and
    // Reference Asset Package: logistics, not aesthetics. Asserted so that a
    // future sweep adding the spec "for consistency" has to argue with this.
    t.notOk((CONFIG.WORKERS.VISUAL_PLANNER_WORKER.docs || []).indexOf(SPEC) !== -1,
      'W6 does not load it, deliberately — it decides how many assets and from ' +
      'where, and pays no visual judgement for the tokens');

    // W10 proposes objective, audience, age range, interests and placements —
    // the whole targeting of a paid campaign. Same class of work as W3 and W4,
    // and it was reading a shorter list than either.
    for (const doc of ['PROJECT_STRUCTURE.md', 'PLATFORM_KNOWLEDGE_BASE.md',
      'SYSTEM_CONSTANTS.md']) {
      t.includes((CONFIG.PAID_ADS.docs || []), doc,
        `W10 loads ${doc} — it drafts the campaign, not the decoration`);
    }

    // The Media Designer composes around a corner reserved for brand marks,
    // knowing only the string "Future".
    const designer = (CONFIG.SERVICES.MEDIA_GENERATION.designer || {});
    t.includes((designer.docs || []), BRAND,
      'the Media Designer loads the brand architecture — it renders a hospital ' +
      'it is otherwise given only the name of');

    // W1: the ecosystem columns. It writes Master Brand, Sub-Brand, Medical
    // Center and Service Level from a file that describes the entity alone.
    //
    // These assert the prompt BANNER, not the filename. Loading a document and
    // not injecting it is a real and silent failure — the load succeeds, the
    // variable is assigned, nothing reads it, and a check for the filename
    // alone passes on a prompt the document never entered.
    const injected = (section, doc) =>
      section.indexOf('=== PROJECT DOCUMENT: ' + doc + ' ===') !== -1;

    t.ok(injected(cardBuilder, 'PROJECT_STRUCTURE.md'),
      'W1 is given the project structure — it writes four columns about where ' +
      'this entity sits, and the knowledge file describes only the entity');
    t.ok(injected(cardBuilder, 'PLATFORM_KNOWLEDGE_BASE.md'),
      'and the platform knowledge base');

    // The front matter states which hospitals run the entity. Until now that
    // line reached nothing: only entity_name_en and service_level were passed,
    // so Sub-Brand was inferred from prose and W2 scheduled against the guess.
    t.includes(cardBuilder, 'frontMatter.hospitals',
      'W1 is told which hospitals run the entity — the line is in every ' +
      'knowledge file and previously reached no prompt');

    // W2 decides which page every post lands on. Nine centres are Delta-only
    // and the registry's Hospitals column is the only place that says so.
    const planner = fx.srcSection('PlannerRunner');
    t.ok(injected(planner, 'ENTITY_REGISTRY.md'),
      'W2 is given the entity registry — it routes campaigns to pages, and the ' +
      'Hospitals column is the only statement of which hospital runs what');
    // The apostrophe is backslash-escaped in the source string literal, so the
    // pattern skips over it rather than matching a character that is not there.
    t.ok(/registry.?.?s Hospitals column is binding/.test(planner),
      'and is told the column is binding — a registry pasted in as background ' +
      'reading is not a routing rule');

    // The Portfolio Critic loaded nothing at all: no promptFile, no docs, its
    // whole prompt a literal. It judges balance across three pages.
    const critic = fx.srcSection('PortfolioCritic');
    t.ok(injected(critic, BRAND),
      'the Portfolio Critic is given the brand architecture — its own prompt ' +
      'says "INSAN, Future and Delta build one brand together" and nothing ' +
      'anywhere defined what that means');
    t.ok(injected(critic, 'PROJECT_STRUCTURE.md'),
      'and the project structure');

    // --- 5. an inline-loaded document is invalidated when the operator edits it ---
    //
    // Documents named through a `docs:` array are swept automatically. The three
    // planning workers name theirs inline, so each one has to be listed by hand
    // — and a document that is loaded but not listed stays cached for six hours
    // after an edit, which the operator experiences as the edit doing nothing.
    // Deriving the list from the source is what stops the two drifting.
    const core = fx.srcSection('DriveLoader');
    const inline = new Set();

    for (const section of [cardBuilder, planner, critic]) {
      const found = section.match(/loadMarkdown\(\s*'([A-Z_]+\.md)'/g) || [];
      for (const hit of found) {
        inline.add(/'([A-Z_]+\.md)'/.exec(hit)[1]);
      }
    }

    t.ok(inline.size >= 6,
      `the planning workers load ${inline.size} documents inline`);

    const sweep = /var planningDocs = \[([\s\S]*?)\];/.exec(core);
    t.ok(sweep, 'the cache sweep lists them');

    for (const doc of inline) {
      t.includes(sweep ? sweep[1] : '', doc,
        `${doc} is invalidated by Refresh Documents — it is loaded inline, so ` +
        'nothing else would clear it');
    }

    // The Media Designer keeps its docs one level down, under `designer`,
    // because the service can run without it — so the registry sweep needs a
    // second pass that entry.docs alone would not reach. It already has one;
    // this pins it, because adding MASTER_BRAND_ARCHITECTURE to that list makes
    // it the difference between an edited brand document reaching the renderer
    // and sitting behind a six-hour cache.
    t.ok(/var nested = \(entry\.designer && entry\.designer\.docs\)/.test(core),
      'the sweep reaches the Media Designer\'s docs, which sit under `designer` ' +
      'and are invisible to a scan of entry.docs alone');
  }
};
