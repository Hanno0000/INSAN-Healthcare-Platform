// Operations Enablement — W11, the worker that faces inward.
//
// Every other worker's output is read by a patient. This one's is read by staff
// inside a hospital, as an instruction. That asymmetry is what most of these
// checks are about: a weak advert wastes an impression, a wrong operational
// instruction is a policy nobody approved being followed on a ward.
//
// The other half is cost. The operator's constraint is explicit — media costs
// tokens, and a team sent thirty near-identical videos stops opening the
// channel. So the three filters and the order they run in are pinned here: a
// filter that silently stopped collapsing anything would not fail any other
// check, and the bill would arrive a month later.

module.exports = {
  name: 'enablement',

  run(t, fx) {
    const cfg = CONFIG.ENABLEMENT;
    const R = EnablementRunner;

    // --- 1. it is a read-only branch ---
    //
    // The whole reason this can be added to a pipeline that has never had a
    // clean production run: it writes only into its own two tabs. If it ever
    // wrote into the Content or Visual Pipeline it could corrupt a run in
    // flight, and the operator would have no way to tell which worker did it.
    t.ok(cfg.SHEET_NAME && cfg.LEDGER_SHEET_NAME, 'it has its own two tabs');
    t.ok(cfg.SHEET_NAME !== CONFIG.SHEET_NAME &&
      cfg.SHEET_NAME !== CONFIG.VISUAL_PIPELINE.SHEET_NAME,
      'neither is a pipeline the other workers read — this is a read-only ' +
      'branch like Paid Ads, so it cannot interfere with a run in flight');

    const src = fx.srcSection('EnablementRunner');

    t.notOk(/SheetWriter\.writeCell/.test(src),
      'it never calls SheetWriter — that is how every other worker writes into ' +
      'a shared pipeline, and this one has no business there');

    // --- 2. FILTER 1: the same message on three pages is one brief ---
    const pageA = { 'Campaign Name': 'Critical Care Center', 'Content Angle': 'family updates', 'Publishing Page': 'INSAN' };
    const pageB = { 'Campaign Name': 'Critical Care Center', 'Content Angle': 'family updates', 'Publishing Page': 'Future' };
    const pageC = { 'Campaign Name': 'Critical Care Center', 'Content Angle': 'family updates', 'Publishing Page': 'Delta' };
    const other = { 'Campaign Name': 'Critical Care Center', 'Content Angle': 'who we admit', 'Publishing Page': 'INSAN' };

    t.is(R.groupKey(pageA), R.groupKey(pageB), 'INSAN and Future collapse to one group');
    t.is(R.groupKey(pageB), R.groupKey(pageC), 'and Delta with them');
    t.ok(R.groupKey(pageA) !== R.groupKey(other),
      'but a different angle stays its own group — collapsing on campaign ' +
      'alone would lose everything the campaign says after the first post');

    t.notOk(cfg.GROUP_BY.indexOf('Publishing Page') !== -1,
      'the page is not part of the grouping key, which is the point of it');

    // --- 3. FILTER 3: the ledger, and its three verdicts ---
    const now = new Date('2026-08-07T12:00:00Z');
    const ago = (months) => new Date(now.getTime() - months * 30.44 * 86400000);

    t.is(R.ledgerVerdict(null, now).state, 'new',
      'a behaviour never sent is new');

    t.is(R.ledgerVerdict({ lastSent: ago(1), timesSent: 1 }, now).state, 'covered',
      'one sent last month is covered — not sent again');

    // The operator set four months, and the reason is staff turnover: a nurse
    // who joined in March has never seen January's brief.
    t.is(cfg.RESTATE_AFTER_MONTHS, 4, 'the restate window is four months');

    t.is(R.ledgerVerdict({ lastSent: ago(3), timesSent: 1 }, now).state, 'covered',
      'three months is still inside the window');
    t.is(R.ledgerVerdict({ lastSent: ago(5), timesSent: 1 }, now).state, 'restate',
      'five months asks the operator again');

    // ⚠️ ASKS, does not decide. A block here would mean staff who joined since
    // never see it; an automatic resend would mean the rest see it twice.
    t.ok(cfg.STATUS.RESTATE.indexOf('?') !== -1,
      'and the status it writes is a question, not a decision — the operator ' +
      'answers it, because only they know whether the team has turned over');

    // --- 4. the fingerprint survives a rewording ---
    //
    // If the fingerprint included the headline, every cycle would re-send
    // everything: the same ask phrased differently would look new, the ledger
    // would never match, and all three filters would be pointless.
    const one = R.fingerprint('Critical Care Center', 'update-family-without-being-asked');
    const two = R.fingerprint('critical care center', 'Update-Family-Without-Being-Asked');

    t.is(one, two, 'the fingerprint ignores case on both sides');
    t.ok(one.indexOf('update-family-without-being-asked') !== -1,
      'and is built from the slug — the behaviour, not the wording, so a ' +
      'reworded headline is still recognised as already sent');

    t.ok(R.fingerprint('Critical Care Center', 'a') !==
      R.fingerprint('Emergency Center', 'a'),
      'two campaigns asking for the same thing stay separate — the team needs ' +
      'it in the context of the campaign the patient actually saw');

    // --- 5. the rhythm cap queues, it does not drop ---
    const ledger = {
      a: { lastSent: new Date(now.getTime() - 2 * 86400000) },
      b: { lastSent: new Date(now.getTime() - 5 * 86400000) },
      c: { lastSent: new Date(now.getTime() - 30 * 86400000) }
    };

    t.is(R.sentThisWeek(ledger, now), 2, 'two went out in the trailing week');
    t.ok(cfg.MAX_PER_WEEK >= 1, 'and there is a weekly pace');

    t.ok(/QUEUED/.test(src),
      'what exceeds the pace is Queued, never dropped — the operator set a ' +
      'pace, not a ceiling on what matters');

    // --- 6. the knowledge gate is stricter here than on the campaign side ---
    t.ok(cfg.REFUSE_ON_KNOWLEDGE_GAPS,
      'a knowledge file with an unresolved gap produces no instruction at all');

    const icu = fx.repoFile('business/knowledge/departments/MEDICAL_DEPARTMENT_ICU.md');
    t.ok(R.knowledgeGate(icu, 'MEDICAL_DEPARTMENT_ICU.md').ok,
      'ICU passes the gate — a gate that refuses everything is not a gate');

    const gapped = icu.replace('# Mission', '<!-- NEEDS-OPERATOR: test -->\n\n# Mission');

    // Assert the edit landed before asserting what it caused. The first version
    // of this check inserted after a heading ICU does not have, so it compared
    // the file against itself and passed while testing nothing.
    t.ok(gapped !== icu, 'the test file really did gain a marker');

    const refused = R.knowledgeGate(gapped, 'test.md');

    t.notOk(refused.ok, 'a file carrying a gap marker is refused');
    t.ok(/gap/i.test(refused.reason), 'and the refusal says why');

    // --- 7. approval is the trigger, not publication ---
    //
    // The team has to be ready BEFORE the post goes out. A patient reads the
    // advert at 8am and phones at 9; a brief that waits for publication arrives
    // after the call it was meant to prepare someone for.
    t.ok(/Creative Director Review Status/.test(src),
      'it reads rows the Creative Director approved');
    t.notOk(/Live Post URL/.test(src),
      'and does NOT wait for publication — the Paid Ads worker keys off Live ' +
      'Post URL because an ad needs something to point at; this one must be ' +
      'earlier than that or it is briefing the team after the phone rang');

    // --- 8. nothing reaches staff without the operator ---
    const channel = fx.srcSection('EnablementChannel');
    const gate = EnablementChannel.gate(cfg.STATUS.DRAFT);

    t.notOk(gate.send, 'a Draft brief does not send');
    t.ok(EnablementChannel.gate(cfg.STATUS.APPROVED).send, 'an Approved one does');
    t.ok(cfg.OPERATOR_OWNED.indexOf('Status') !== -1,
      'and Status is operator-owned — the model proposes, it does not approve');

    // --- 9. the credential is never in the repository ---
    t.is(cfg.TELEGRAM.BOT_TOKEN, '',
      'no bot token in CONFIG — this repository is public and a token is live');
    t.is(cfg.TELEGRAM.CHANNEL_ID, '', 'and no channel id');
    t.ok(/TELEGRAM_BOT_TOKEN/.test(fx.srcSection('ConfigResolver')),
      'both come from Script Properties, through the same resolver as every ' +
      'other deployment identifier');

    // --- 10. Arabic is set as type, never generated ---
    //
    // The operator hit this by hand: reversed text, broken letterforms,
    // misspellings, from a video model. It is not a prompt failure — Arabic
    // needs contextual shaping and RTL ordering, which a generative model
    // reproduces by luck. TextOverlay already solved it for campaign artwork.
    t.is(cfg.SLIDE_HEIGHT_PX, 1920, 'slides are 1080x1920 vertical');
    t.is(cfg.SLIDE_WIDTH_PX, 1080, 'the size the 9:16 overlay template holds');
    t.ok((CONFIG.TEXT_OVERLAY.TEMPLATES || {})['9:16'],
      'and that template is configured — the Telegram format is the one the ' +
      'system already renders Arabic type into');

    t.ok(/real type/i.test(channel) && /never generated/i.test(channel),
      'the channel states that Arabic is set as type and never generated — ' +
      'the one thing about this feature that must not be quietly changed');

    // --- 11. the prompt is wired to what the code actually sends ---
    const prompt = fx.repoFile('campaign-os/prompts/enablement/' + cfg.promptFile);

    t.ok(prompt.length > 1000, 'the training manual exists at the configured name');
    t.ok(/slug/i.test(prompt),
      'and teaches the slug — the identity the ledger dedupes on, so a manual ' +
      'that never mentions it would produce a different one every cycle');
    t.ok(/not one post|not one per post|One behaviour/i.test(prompt),
      'and that the unit is a behaviour rather than a post');
    t.ok(/concerns/i.test(prompt),
      'and how to report a promise the knowledge file does not support');

    // The manual predates the code and described a document; the code parses
    // JSON. A manual still specifying prose output would produce a brief that
    // parses as nothing, every time.
    t.ok(/JSON/.test(prompt),
      'the manual returns JSON, matching what _parse reads — it originally ' +
      'specified a prose document, which would parse as nothing');

    t.notOk(/MEDICAL_SERVICE_EMERGENCY\.md/.test(prompt),
      'and its example filenames are files that exist');

    // --- 12. the ledger is written AFTER the send, never before ---
    //
    // A ledger entry for something that never arrived suppresses that behaviour
    // for four months, silently. The team simply never hears it, and the sheet
    // says it was covered. So the write has to be downstream of a successful
    // send, and this pins the order.
    const sendFn = src.slice(src.indexOf('sendApproved: function'));
    const sendAt = sendFn.indexOf('EnablementChannel.send');
    const recordAt = sendFn.indexOf('this._recordSent');

    t.ok(sendAt !== -1 && recordAt !== -1, 'sendApproved both sends and records');
    t.ok(sendAt < recordAt,
      'and records only after sending — a ledger entry written first would ' +
      'suppress a behaviour for four months that nobody ever received');

    // The send is inside a try/catch per brief, so one failure does not stop
    // the rest. A batch that aborts halfway leaves the operator unable to tell
    // which briefs went out.
    t.ok(/catch \(e\)[\s\S]{0,400}ENABLEMENT_SEND_FAILED/.test(sendFn),
      'a brief that fails to send is logged by name and the batch continues');

    // --- 13. the slides borrow the template that already exists ---
    t.ok(/TEXT_OVERLAY\.TEMPLATES \|\| \{\}\)\['9:16'\]/.test(channel),
      'the deck copies the 9:16 template rather than creating a presentation — ' +
      'page size cannot be set through any API, so copying is the only way to ' +
      'get 1080x1920 and a new presentation would export 16:9');

    t.ok(/setTrashed\(true\)/.test(channel),
      'and the scratch copy is trashed — one presentation per brief would ' +
      'otherwise accumulate in the operator\'s Drive forever');

    // BOTH text boxes, counted rather than matched. _drawCard sets a title and
    // a body, and a check that only asked "is END mentioned" passed with the
    // body left-aligned — one Arabic paragraph starting on the wrong side of a
    // card the whole hospital is asked to read.
    const aligned = (channel.match(/ParagraphAlignment\.END/g) || []).length;
    const alignedAny = (channel.match(/setParagraphAlignment/g) || []).length;

    t.is(aligned, alignedAny,
      `every paragraph the card draws is right-aligned — ${aligned} of ` +
      `${alignedAny}. It is Arabic, and Slides does the shaping but not this`);
    t.ok(alignedAny >= 2, 'and both the title and the body are set');
  }
};
