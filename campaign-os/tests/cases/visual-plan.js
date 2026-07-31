// VisualPlan — the deterministic replacement for the Visual Planner worker.
//
// The defect this protects against was found on 2026-07-30: Visual QA loaded at
// most four assets and then failed the row for being short. Any carousel over
// four cards dead-ends — the failure says re-run generation, and re-running
// reproduces it. So the counting has to be right, and it has to agree with the
// Creative Director's scene count rather than estimate one.

module.exports = {
  name: 'visual plan',

  run(t) {
    const count = (row) => VisualPlan.assetCount(row);

    // --- single-asset formats ---
    t.is(count({ 'Content Format': 'Static' }), 1, 'a static post is one asset');
    t.is(count({ 'Content Format': 'Story' }), 1, 'a story is one asset');
    t.is(count({ 'Content Format': 'Reel' }), 1, 'a reel is one asset');
    t.is(count({ 'Content Format': '' }), 1, 'an unset format falls back to one asset');
    t.is(count({ 'Content Format': 'STATIC' }), 1, 'format matching is case-insensitive');
    t.is(count({ 'Content Format': '  Static  ' }), 1, 'and tolerates padding');

    // --- carousels are counted, not guessed ---
    const carousel = (prompt) => count({
      'Content Format': 'Carousel',
      'Creative Director Design Prompt': prompt
    });

    t.is(carousel('Slide 1: the arrival | Slide 2: the team | Slide 3: the room'), 3,
      'pipe-separated scenes are counted');
    t.is(carousel(
      'Slide 1: arrival\nSlide 2: triage\nSlide 3: the team\nSlide 4: the room\n' +
      'Slide 5: going home'), 5,
      'five numbered slides count as five — the >4 case that used to dead-end');
    t.is(carousel('شريحة 1: الوصول\nشريحة 2: الفريق\nشريحة 3: الغرفة'), 3,
      'Arabic scene markers are counted');
    t.is(carousel('Card 1 - arrival\nCard 2 - the team'), 2,
      'other scene words are recognised');

    // --- a carousel with no per-scene direction ---
    // Returning the default here would hand the generator N copies of one
    // paragraph. It falls back, and ServiceRunner refuses the row — which is
    // the right place for it to fail.
    const specs = CONFIG.MEDIA_SPECS.CAROUSEL;
    t.is(carousel('One paragraph of direction with no scenes in it.'),
      specs.assetCount, 'undivided direction falls back to the default count');
    t.is(carousel(''), specs.assetCount, 'empty direction falls back too');
    t.is(carousel('Slide 1: only one scene'), specs.assetCount,
      'a single marker is not a scene division');

    // --- the count stays inside the format's bounds ---
    const many = 'Slide 1: a\nSlide 2: b\nSlide 3: c\nSlide 4: d\nSlide 5: e\n' +
      'Slide 6: f\nSlide 7: g\nSlide 8: h\nSlide 9: i\nSlide 10: j\n' +
      'Slide 11: k\nSlide 12: l';
    t.is(carousel(many), specs.maxAssetCount || 10,
      'a run-away scene count is clamped to the format maximum');

    // --- the Creative Director's prompt wins over the worker's draft ---
    t.is(count({
      'Content Format': 'Carousel',
      'Creative Director Design Prompt': 'Slide 1: a | Slide 2: b',
      'Design Prompt (AI)': 'Slide 1: a | Slide 2: b | Slide 3: c | Slide 4: d'
    }), 2, "the Creative Director's scene count is the answer, not the draft's");

    t.is(count({
      'Content Format': 'Carousel',
      'Creative Director Design Prompt': '',
      'Design Prompt (AI)': 'Slide 1: a | Slide 2: b | Slide 3: c | Slide 4: d'
    }), 4, 'the draft is used only when the Director wrote nothing');

    // --- scene counting on its own ---
    t.is(VisualPlan._sceneCount(''), 0, 'nothing has no scenes');
    t.is(VisualPlan._sceneCount(null), 0, 'missing has no scenes');
    t.is(VisualPlan._sceneCount('a single unbroken paragraph'), 0,
      'prose has no scenes');
    t.is(VisualPlan._sceneCount('one | two'), 2, 'a single pipe divides two scenes');
    t.is(VisualPlan._sceneCount('trailing pipe |'), 0,
      'a stray pipe with nothing after it is not a division');

    // --- specs ---
    t.is(VisualPlan._specsFor('carousel').assetCount, specs.assetCount,
      'the carousel spec is read from CONFIG, not hardcoded');
    t.ok(VisualPlan._specsFor('something-unknown').assetCount >= 1,
      'an unknown format still yields a usable spec');

    // --- the switch ---
    // Off by default until the visual pipeline has completed a production run:
    // a first run testing two unknowns tells you nothing about either.
    t.is(VisualPlan.isEnabled(), false,
      'deterministic visual planning ships off, per START_HERE §6.4 item 1');
  }
};
