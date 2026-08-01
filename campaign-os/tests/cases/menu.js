// onOpen — the menu binds by string, and a broken binding is silent.
//
//   .addItem('Build Campaign Card', 'runCardBuilder')
//
// The second argument is a function name in a string. Apps Script does not
// resolve it when the script loads, when the menu is built, or when the sheet
// is opened. It resolves it at the moment the operator clicks the item, and
// only then reports that it does not exist.
//
// So every failure mode here is invisible until someone reaches for the thing:
// a function renamed, a file left out of a paste, a merge that dropped a
// section. Nothing goes red. The menu draws perfectly, with an item that does
// nothing.
//
// This suite reads the bindings out of the source and asks the loaded namespace
// whether each one is really there — which is the question the operator's click
// asks, made cheap enough to ask on every run.

// Pull the (label, target) pairs out of a body of source.
//
// Deliberately not clever: an `addItem` whose target is built at runtime rather
// than written as a literal would not be found here, and that is a shape this
// codebase does not use. If it ever does, `countIsPlausible` below fails rather
// than quietly checking less.
function menuBindings(source) {
  const out = [];
  const pattern = /\.addItem\(\s*(['"])((?:\\.|(?!\1)[^\\])*)\1\s*,\s*(['"])([A-Za-z_$][\w$]*)\3\s*\)/g;
  let m;
  while ((m = pattern.exec(source)) !== null) {
    out.push({ label: m[2], target: m[4] });
  }
  return out;
}

// The audit itself, separated from the sources it runs against so it can be run
// against a deliberately broken one below. A checker nobody has watched fail is
// not evidence of anything.
function auditMenu(source, isDefined) {
  return menuBindings(source)
    .filter((b) => !isDefined(b.target))
    .map((b) => `${b.label} -> ${b.target}`);
}

module.exports = {
  name: 'menu bindings',

  run(t, fx) {
    const files = fx.srcFiles();
    const all = Object.keys(files).sort().map((f) => files[f]).join('\n');

    // --- the extraction is finding something ---
    // Guard first. Every assertion below is a filter over this list, so a
    // pattern that matched nothing would report a clean menu — the exact shape
    // of the weak assertions found on 2026-08-01, where the check could not
    // fail and read as a pass.
    const bindings = menuBindings(all);

    t.ok(bindings.length >= 30,
      `the menu bindings are readable as literals — found ${bindings.length}, ` +
      `and a pattern that found none would report every item healthy`);

    // --- onOpen exists, once ---
    const declarations = Object.keys(files)
      .filter((f) => /^\s*function\s+onOpen\s*\(/m.test(files[f]));

    t.is(declarations.length, 1,
      'exactly one onOpen is declared — two would silently take the last loaded, ' +
      'and the menu the operator sees would depend on filename order');

    t.ok(/function\s+onOpen\s*\(/.test(all), 'onOpen is a plain global function, ' +
      'which is how Apps Script finds it');

    // --- every target resolves ---
    // The whole point of the suite. `global[name]` is the same lookup Apps
    // Script performs on the click, because both load every source into one
    // shared namespace.
    const isDefined = (name) => typeof global[name] === 'function';
    const broken = auditMenu(all, isDefined);

    t.is(broken, [],
      'every menu item points at a function that exists — a menu item pointing ' +
      'at a missing function does not fail at load, it fails when the operator ' +
      'clicks it');

    // --- and the check can fail ---
    // Mutation test. The same audit, run against a source carrying one binding
    // that goes nowhere, must report exactly that binding. Without this, a
    // rewrite of `isDefined` or `menuBindings` could turn the assertion above
    // into decoration and nothing would notice.
    const mutated = all +
      "\n  .addItem('A Deliberately Broken Item', 'noSuchFunction_mutationProbe')\n";

    t.is(auditMenu(mutated, isDefined), ['A Deliberately Broken Item -> noSuchFunction_mutationProbe'],
      'the audit reports a binding whose function is absent — proving the ' +
      'assertion above is capable of failing');

    // And that it discriminates on the function, not on the shape of the string.
    global.noSuchFunction_mutationProbe = function () {};
    t.is(auditMenu(mutated, isDefined), [],
      'and stops reporting it the moment the function exists');
    delete global.noSuchFunction_mutationProbe;

    // A target that exists as something other than a function is still broken:
    // Apps Script needs to call it.
    global.notAFunction_mutationProbe = 'a string';
    t.is(auditMenu(
      all + "\n  .addItem('Not Callable', 'notAFunction_mutationProbe')\n", isDefined),
      ['Not Callable -> notAFunction_mutationProbe'],
      'a name bound to a value that is not callable is reported too');
    delete global.notAFunction_mutationProbe;

    // --- no duplicate labels within the menu ---
    // Two items reading the same and doing different things is an operator trap
    // rather than a crash, but it costs a wrong click on a live system, and
    // Publishing is the one irreversible action here.
    const labels = bindings.map((b) => b.label);
    const duplicated = labels.filter((l, i) => labels.indexOf(l) !== i);
    t.is([...new Set(duplicated)], [], 'no two menu items carry the same label');

    // --- the entry points survive a merge intact ---
    // Named individually rather than counted, so a section dropped from a
    // merged file names itself instead of reporting "expected 31, got 29".
    const required = [
      'showControlCenter',
      'runCardBuilder', 'checkKnowledgeFile', 'runCampaignPlanner',
      'transferRowsForward', 'showUpcomingEvents', 'runPortfolioCritic',
      'runContentStrategyWorker', 'runContentCreationWorker',
      'runCreativeDirectorWorker', 'runFullContentPipeline',
      'runVisualPlannerWorker', 'runMediaGenerationService', 'runVisualQAWorker',
      'reuseApprovedAsset', 'runFullVisualPipeline',
      'runPublishingWorker', 'runPaidAdsWorker',
      'resumeLastRun', 'stopCurrentRun', 'refreshCache', 'systemStatus',
      'preflightCheck', 'checkProjectAssets', 'checkVisualAssetFolders',
      'createManagedColumns', 'syncVocabularyFromConfig', 'relaxDataValidation',
      'showVocabularyGaps', 'showDeploymentIdentifiers', 'checkEntityRegistry',
      'archiveFinishedPlan', 'showJobStatus', 'cancelActiveJob'
    ];

    for (const name of required) {
      t.ok(isDefined(name), `${name} is defined`);
    }

    // The list above and the sheet's menu must not drift apart: an item added to
    // onOpen and forgotten here would go unchecked.
    const unlisted = bindings
      .map((b) => b.target)
      .filter((name) => required.indexOf(name) === -1);

    t.is([...new Set(unlisted)], [],
      'every menu target is named in the list above — add it there when you ' +
      'add a menu item, or it is checked by nothing');
  }
};
