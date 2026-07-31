// EventsCalendar — what is coming, and what it refuses to guess.
//
// Closes Audit B's B10: nothing in this system knew a season was approaching.
//
// The rule worth protecting is the refusal. Ramadan and Eid follow the Hijri
// calendar and are confirmed locally by announcement; a tabular approximation
// is routinely a day out, and a Ramadan date one day out misplans a month of
// medication-timing content. So a year with no date entered is REPORTED AS
// MISSING, never estimated.

module.exports = {
  name: 'events calendar',

  run(t) {
    // --- date parsing is strict ---
    t.ok(EventsCalendar._parseISO('2027-02-04'), 'a real date parses');
    t.is(EventsCalendar._parseISO('2027-02-31'), null,
      '31 February is rejected, not rolled over into March');
    t.is(EventsCalendar._parseISO('2027-13-01'), null, 'month 13 is rejected');
    t.is(EventsCalendar._parseISO('04/02/2027'), null, 'only ISO is accepted');
    t.is(EventsCalendar._parseISO(''), null, 'empty is not a date');
    t.is(EventsCalendar._parseISO(null), null, 'missing is not a date');
    t.is(EventsCalendar._format(new Date(2027, 1, 4)), '2027-02-04',
      'formatting round-trips');

    // --- a fixed event, found inside the window ---
    // World Cancer Day is 4 February in CONFIG.EVENTS_CALENDAR.FIXED.
    const feb = EventsCalendar.forRange(new Date(2027, 1, 1), 14);
    const names = feb.events.map((e) => e.name);
    t.includes(names, 'World Cancer Day', 'an event inside the window is found');

    // --- lead time reaches forward, not only inward ---
    // World Cancer Day carries leadDays: 14, so a window a week earlier should
    // already surface it: the content has to be written before the day.
    const lateJan = EventsCalendar.forRange(new Date(2027, 0, 25), 3);
    t.includes(lateJan.events.map((e) => e.name), 'World Cancer Day',
      'an event whose lead time has begun is surfaced before it arrives');

    // --- a quiet window stays quiet ---
    const quiet = EventsCalendar.forRange(new Date(2027, 6, 7), 3);
    t.is(quiet.events.filter((e) => e.weight === 'critical').length, 0,
      'a window with nothing critical in it does not invent one');

    // --- the refusal ---
    const missing = feb.missing.map((m) => m.key);
    t.includes(missing, 'ramadan', 'Ramadan with no date recorded is reported missing');
    t.includes(missing, 'eid-fitr', 'Eid al-Fitr is reported missing');
    t.includes(missing, 'eid-adha', 'Eid al-Adha is reported missing');
    t.ok(feb.missing.every((m) => m.year && m.name),
      'each missing entry names the event and the year it is missing for');
    t.is(feb.events.filter((e) => e.key === 'ramadan').length, 0,
      'no Ramadan is produced from an approximation');

    // --- once a date is entered by hand, it behaves like any other event ---
    const config = CONFIG.EVENTS_CALENDAR;
    const ramadan = config.MOVEABLE.filter((e) => e.key === 'ramadan')[0];
    const restore = JSON.parse(JSON.stringify(ramadan.dates));

    try {
      ramadan.dates['2027'] = { start: '2027-02-08', end: '2027-03-09' };
      const withDate = EventsCalendar.forRange(new Date(2027, 1, 1), 14);

      t.includes(withDate.events.map((e) => e.key), 'ramadan',
        'an entered Ramadan is found like any other event');
      t.is(withDate.missing.filter((m) => m.key === 'ramadan').length, 0,
        'and is no longer reported missing');

      // Lead time is 30 days, so a January window should already see it.
      const early = EventsCalendar.forRange(new Date(2027, 0, 15), 7);
      t.includes(early.events.map((e) => e.key), 'ramadan',
        "Ramadan's 30-day lead time surfaces it a month ahead — the content has "
        + 'to be written and clinically reviewed before the month starts');
    } finally {
      ramadan.dates = restore;
    }

    // --- an entered date that is malformed is treated as absent, not as a date ---
    try {
      ramadan.dates['2027'] = { start: '2027-02-30', end: '' };
      const bad = EventsCalendar.forRange(new Date(2027, 1, 1), 14);
      t.includes(bad.missing.map((m) => m.key), 'ramadan',
        'an impossible entered date is reported missing rather than silently shifted');
    } finally {
      ramadan.dates = restore;
    }

    // --- no duplicates when a window touches two years ---
    const yearEnd = EventsCalendar.forRange(new Date(2026, 11, 20), 30);
    const keys = yearEnd.events.map((e) => e.key + '@' + e.start.getTime());
    t.is(keys.length, new Set(keys).size,
      'a window spanning the year end reports each occurrence once');

    // --- the switch ---
    const wasEnabled = config.ENABLED;
    try {
      config.ENABLED = false;
      const off = EventsCalendar.forRange(new Date(2027, 1, 1), 14);
      t.is(off.events, [], 'disabled means no events');
      t.is(off.missing, [], 'and no missing report either');
    } finally {
      config.ENABLED = wasEnabled;
    }

    // --- config integrity ---
    t.ok(config.FIXED.every((e) => e.month >= 1 && e.month <= 12),
      'every fixed event has a real month');
    t.ok(config.FIXED.every((e) => e.day >= 1 && e.day <= 31),
      'every fixed event has a real day');
    t.ok(config.FIXED.every((e) => e.key && e.name),
      'every fixed event is named');
    t.ok(config.MOVEABLE.every((e) => e.dates && typeof e.dates === 'object'),
      'every moveable event has a dates table, even when empty');
  }
};
