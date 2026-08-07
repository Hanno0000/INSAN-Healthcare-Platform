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
  }
};
