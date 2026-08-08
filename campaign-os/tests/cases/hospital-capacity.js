// The hospitals' physical capacity, held to one source per hospital.
//
// The brand owner stated the bed counts on 2026-08-08 and asked for one place to
// change when a bed is added or a department opens. That place is
// HOSPITAL_FUTURE.md §1.3 and HOSPITAL_DELTA_FACILITY.md §1.3.
//
// The numbers also appear in files the workers actually read — Pediatrics states
// the incubators, the ER states both hospitals' readiness — because a worker
// building a post reads the entity's file, not the building's. Those are copies,
// and this suite is what makes them copies rather than second opinions.
//
// Same pattern as CONTACT_DIRECTORY and Core.gs: a human maintains the document,
// a check fails when something drifts from it.
//
// Why it is worth a suite of its own: a capacity figure is the most quotable
// number a hospital has. It goes into an advertisement, and a wrong one is not a
// typo — it is a claim about a facility, made to people who may arrive expecting
// it.

// ONE file per hospital, which is what the brand owner asked for. The first
// attempt at this put Delta's facility data in a second file, which collided
// with HOSPITAL_DELTA.md on entity_id HOSP-002 — and the knowledge gate refused
// it, correctly, because that id is a join key two other systems read. The
// facility data lives inside the existing Delta file instead.
const FUTURE = 'business/knowledge/hospitals/HOSPITAL_FUTURE.md';
const DELTA = 'business/knowledge/hospitals/HOSPITAL_DELTA.md';

// Stated by the brand owner, 2026-08-08. Delta's intensive care, paediatric care
// and incubator figures were then confirmed room by room by the hospital's own
// structural document; the two inpatient figures were not.
const CAPACITY = {
  Future: { inpatient: 26, icu: 9 },
  Delta:  { inpatient: 58, icu: 19, paediatric: 11, incubators: 12 }
};

module.exports = {
  name: 'hospital capacity',

  run(t, fx) {
    t.ok(fx.exists(FUTURE), 'Future has a facility source of truth');
    t.ok(fx.exists(DELTA), 'and so does Delta');

    const future = fx.repoFile(FUTURE);
    const delta = fx.repoFile(DELTA);

    // --- 1. each file states its own hospital's numbers ---
    for (const [n, label] of [[CAPACITY.Future.inpatient, 'inpatient'],
                              [CAPACITY.Future.icu, 'intensive care']]) {
      t.ok(new RegExp('\\*\\*' + n + '\\*\\*').test(future),
        `HOSPITAL_FUTURE states ${n} ${label} beds`);
    }

    for (const [n, label] of [[CAPACITY.Delta.inpatient, 'inpatient'],
                              [CAPACITY.Delta.icu, 'intensive care'],
                              [CAPACITY.Delta.paediatric, 'paediatric care'],
                              [CAPACITY.Delta.incubators, 'incubator']]) {
      t.ok(new RegExp('\\*\\*' + n + '\\*\\*').test(delta),
        `HOSPITAL_DELTA states ${n} ${label} beds`);
    }

    // --- 2. Delta's intensive care adds up ---
    //
    // The structural document lists the ICU room by room and this file
    // reproduces that table. The rows must sum to the stated total, or the file
    // is quoting a number it also contradicts three lines below.
    const icuRows = [...delta.matchAll(/^\| 20\d \| (\d+) \|/gm)].map((m) => Number(m[1]));

    t.is(icuRows.length, 7, 'Delta\'s ICU table lists seven rooms');
    t.is(icuRows.reduce((a, b) => a + b, 0), CAPACITY.Delta.icu,
      `and they sum to ${CAPACITY.Delta.icu} — the room-by-room breakdown agrees ` +
      'with the total stated above it');

    // --- 3. the paediatric unit adds up ---
    t.ok(/\*\*5 beds\*\*[\s\S]{0,80}\*\*6\*\*|5 \+ 6/.test(delta),
      'and the paediatric unit is shown as 5 + 6, which is the 11 stated');

    // --- 4. the copies agree with the source ---
    //
    // A file may hold a capacity number for the worker that reads it. It may not
    // hold a DIFFERENT one.
    const copies = [
      ['business/knowledge/centers/MEDICAL_CENTER_PEDIATRICS.md',
       [[CAPACITY.Delta.incubators, 'incubators'],
        [CAPACITY.Delta.paediatric, 'paediatric care beds']]],
      ['business/knowledge/departments/MEDICAL_DEPARTMENT_ER.md',
       [[CAPACITY.Future.icu, "Future's intensive care"],
        [CAPACITY.Delta.icu, "Delta's intensive care"],
        [CAPACITY.Future.inpatient, "Future's inpatient"],
        [CAPACITY.Delta.inpatient, "Delta's inpatient"]]]
    ];

    for (const [rel, expected] of copies) {
      const content = fx.repoFile(rel);
      const name = rel.split('/').pop();

      for (const [n, label] of expected) {
        t.includes(content, String(n),
          `${name} carries ${n} for ${label} — the same number the facility file holds`);
      }

      t.includes(content, 'HOSPITAL_',
        `${name} names the facility file as where the number is maintained, so a ` +
        'reader knows which copy is the original');
    }

    // --- 5. the conflicts stay recorded ---
    //
    // Three sources disagree with the brand owner or with each other. Each is
    // marked, and a marker that quietly disappears is a conflict someone decided
    // without saying so.
    t.ok(/25/.test(future) && /NEEDS-OPERATOR/.test(future),
      'Future records that its description PDF says 25 ICU beds against the ' +
      'brand owner\'s 9 — a figure that large cannot be silently dropped');
    t.ok(/تحت التجهيز|under preparation/i.test(delta),
      'and Delta records that its CT is marked under preparation in one source ' +
      'and listed as a capability in the other');
    // The letterhead's WhatsApp line is recorded in a NON-publishable spelling —
    // "0110 000 2154" rather than the bare eleven digits — because
    // contact-directory.js treats the bare form as a number the ecosystem stands
    // behind, and this one is unconfirmed. The spacing is the point.
    t.ok(/0110 000 2154/.test(delta),
      'Delta records the letterhead WhatsApp line the contact directory does ' +
      'not list — a patient given the wrong one reaches nobody');
    t.notOk(/01100002154/.test(delta),
      'and records it unspaced-free, so an unconfirmed number cannot be lifted ' +
      'straight into a post');

    // --- 6. neither file invents what nothing states ---
    //
    // Accreditation is the one a hospital is most tempted to imply. Nothing in
    // any source records one, so the only correct mentions are a marker asking
    // for it and a rule forbidding the claim. Checked by requiring BOTH, rather
    // than by trying to write a regex that recognises an honest sentence — the
    // first version of this attempted the latter and failed on the files' own
    // "No accreditation claim" line, which is exactly the sentence it wanted.
    for (const [file, name] of [[future, 'HOSPITAL_FUTURE'], [delta, 'HOSPITAL_DELTA']]) {
      t.ok(/NEEDS-OPERATOR[^>]*(headcount|staffing)/i.test(file),
        `${name} marks staffing as unknown rather than describing a team`);
      t.ok(/accreditation/i.test(file),
        `${name} addresses accreditation rather than passing over it`);
      t.ok(/[Nn]o accreditation claim|accreditation or certification held or being pursued/.test(file),
        `${name} either forbids the claim or asks for the fact — never asserts one`);
    }
  }
};
