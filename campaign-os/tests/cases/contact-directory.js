// The contact numbers, held to one source.
//
// `business/brand/CONTACT_DIRECTORY.md` is the stated source of truth. Code
// cannot read it at runtime — CONFIG loads first and PostFooter needs the numbers
// synchronously — so `Core.gs` holds a copy. This suite is what makes it a copy
// rather than a second opinion.
//
// It exists because there already WAS a second opinion. Measured 2026-08-05:
// Core.gs and receptionist/data/hospitals.json held different numbers for the
// same hospitals, and both were being read by something that talks to patients.
// A patient could read one number in an ad and be given another by the
// receptionist, the same day, for the same hospital.
//
// Same pattern as GLOBALS.txt and identifiers.js: a human maintains the document,
// and a check fails when the code drifts from it.

const DIR = 'business/brand/CONTACT_DIRECTORY.md';

module.exports = {
  name: 'contact directory',

  run(t, fx) {
    t.ok(fx.exists(DIR), 'the contact directory exists');

    const doc = fx.repoFile(DIR);
    const lines = CONFIG.POST_FOOTER.CONTACT_LINES;

    // --- every page in the vocabulary has contact lines ---
    const pages = CONFIG.CONTROLLED_VOCABULARY['Publishing Page'] || [];
    t.ok(pages.length >= 3, `the publishing pages are known — ${pages.join(', ')}`);

    for (const page of pages) {
      t.ok(lines[page], `${page} has contact lines configured`);
    }

    // --- the numbers in the code are the numbers in the document ---
    //
    // Read out of the document rather than restated here, so this file is not a
    // third copy of the same numbers.
    const inDoc = (doc.match(/01\d{9}/g) || []);
    t.ok(inDoc.length >= 6,
      `the directory states real numbers — found ${inDoc.length}`);

    const missingFromDoc = [];

    for (const page of pages) {
      const config = lines[page] || {};
      const all = [].concat(config.hotline || [], config.whatsapp || []);

      for (const number of all) {
        if (inDoc.indexOf(number) === -1) missingFromDoc.push(page + ' → ' + number);
      }
    }

    t.is(missingFromDoc, [],
      'every number Core.gs would publish appears in the directory — a number in ' +
      'the code and not the document is a number nobody agreed to');

    // And the reverse: a number stated in the document that no page uses is
    // either a page that lost its config or a stale line in the document.
    const configured = [];
    for (const page of pages) {
      const c = lines[page] || {};
      [].concat(c.hotline || [], c.whatsapp || []).forEach((n) => configured.push(n));
    }

    const unusedInDoc = [...new Set(inDoc)].filter((n) => configured.indexOf(n) === -1);
    t.is(unusedInDoc, [],
      'and every number in the directory is one some page actually publishes');

    // --- the knowledge files are a third copy, held to the same source ---
    //
    // The booking sections carried a gap marker until 2026-08-08, when the
    // operator pointed out there had never been a question: booking is the
    // hospital hotline, not a per-centre number, and those were already written
    // down. So the numbers were filled from this directory into seven knowledge
    // files — which the receptionist reads directly.
    //
    // Seven more copies is seven more chances to drift, and drift here reaches a
    // patient as a dead number. Same rule as Core.gs: a copy, not an opinion.
    const strays = [];

    for (const rel of knowledgeFiles()) {
      const content = fx.repoFile(rel);
      const name = rel.split('/').pop();

      for (const number of new Set(content.match(/01\d{9}/g) || [])) {
        if (inDoc.indexOf(number) === -1) strays.push(`${name} → ${number}`);
      }
    }

    t.is(strays.sort(), [],
      'no knowledge file states a phone number the contact directory does not — ' +
      'the receptionist reads these files and hands the number to a patient');

    // --- the wa.me rule ---
    //
    // The failure that made this worth checking: a wa.me link is NOT the phone
    // number with the country code glued on. The leading zero is dropped.
    // 01500668657 becomes 201500668657, not 2001500668657. Two of the three
    // links as first supplied carried the extra zero and would have been dead on
    // every post they appeared on — a post that publishes normally and only the
    // reader who taps it finds out.
    for (const page of pages) {
      const config = lines[page] || {};
      if (!config.whatsapp) continue;

      const link = PostFooter.whatsappLink(config.whatsapp);

      t.ok(/^https:\/\/wa\.me\/20\d{10}$/.test(link),
        `${page}'s wa.me link is well formed — got ${link}`);
      t.notOk(/wa\.me\/200/.test(link),
        `${page}'s link does not carry the extra zero that kills it`);

      // And the derived link is the one the directory publishes.
      t.includes(doc, link,
        `${page}'s link in the directory is the one the code derives — a ` +
        'hand-written link in a document is a link nothing checks');
    }

    // The document must not hand-write a dead link either. It documents the
    // trap, so the wrong form appears in it deliberately as an example — inside
    // a fenced block, marked with ❌. What must not appear is a bare
    // https://wa.me/200… presented as usable.
    const deadLinks = (doc.match(/https:\/\/wa\.me\/200\d+/g) || []);
    t.is(deadLinks, [],
      'the directory states no wa.me link with the extra zero — it explains the ' +
      'trap without printing a link someone could copy');

    // --- the labels a reader sees ---
    t.includes(doc, CONFIG.POST_FOOTER.HOTLINE_LABEL,
      'the hotline label in the code is the one the directory states');
    t.includes(doc, CONFIG.POST_FOOTER.WHATSAPP_LABEL,
      'and so is the WhatsApp label');

    // --- the receptionist conflict is recorded, not silently resolved ---
    // Those numbers are different and which is right is not this file's call.
    // What matters is that the disagreement is written down somewhere.
    t.includes(doc, 'receptionist',
      'the directory records that the receptionist held different numbers, ' +
      'rather than one side quietly winning');
  }
};

// Every knowledge file, by path relative to the repo root.
function knowledgeFiles() {
  const fs = require('fs');
  const path = require('path');
  const rel = 'business/knowledge/';
  const root = path.join(__dirname, '..', '..', '..', rel);
  const out = [];

  for (const dir of fs.readdirSync(root)) {
    const full = path.join(root, dir);
    if (!fs.statSync(full).isDirectory()) continue;

    for (const file of fs.readdirSync(full)) {
      if (file.endsWith('.md')) out.push(rel + dir + '/' + file);
    }
  }

  return out.sort();
}
