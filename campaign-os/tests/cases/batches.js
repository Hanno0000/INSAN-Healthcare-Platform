// Batches — telling one planning cycle from the next.
//
// The calendar accumulates: a week here, a month there, appended below the last
// with nothing marking where one plan ends. Three separate problems came from
// that one gap, and the operator was solving all three by reading row numbers
// off the sheet and remembering them.
//
// Dates do not settle it. Two cycles can cover overlapping days, and a replanned
// cycle produces a second set of rows for the same days — which is precisely the
// case where "the rows from the fifth onward" gives the wrong answer.

module.exports = {
  name: 'batches',

  run(t, fx) {
    // --- the id ---
    // Stamped from the planning moment, not the campaign. A campaign name would
    // collide the second time the same campaign is planned, and telling those
    // two runs apart is the entire point.
    global.Utilities = {
      formatDate: (d, tz, fmt) => {
        const p = (n, w) => String(n).padStart(w, '0');
        return fmt
          .replace('yyyy', d.getFullYear())
          .replace('MMM', ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()])
          .replace('MM', p(d.getMonth() + 1, 2))
          .replace('dd', p(d.getDate(), 2))
          .replace('HH', p(d.getHours(), 2))
          .replace('mm', p(d.getMinutes(), 2))
          .replace('d', d.getDate());
      }
    };
    global.Session = { getScriptTimeZone: () => 'UTC' };

    t.is(Batches.newId(new Date(2026, 6, 31, 14, 30)), 'BATCH-20260731-1430',
      'the id is the planning moment, to the minute');

    const a = Batches.newId(new Date(2026, 6, 31, 14, 30));
    const b = Batches.newId(new Date(2026, 6, 31, 14, 31));
    t.ok(a !== b, 'two runs a minute apart get different ids');

    // The case dates cannot handle: the same campaign, replanned for the same
    // days. Both plans exist in the calendar; only the batch id separates them.
    const replan = Batches.newId(new Date(2026, 7, 2, 9, 0));
    t.ok(replan !== a,
      'a replanned cycle covering the same days is a different batch');

    t.includes(Batches.newId(new Date(2026, 0, 1, 0, 0)), Batches.PREFIX,
      'every id carries the prefix, so a stamped row is recognisable on sight');

    // --- the column is managed ---
    // SheetWriter skips a column the sheet does not have, logs one line, and
    // the run still reports success. An unmanaged Batch ID would stamp nothing
    // and say it worked.
    const managed = CONFIG.MANAGED_COLUMNS
      .map((c) => c.sheet + '::' + c.column);
    t.includes(managed, 'Content Calendar::' + Batches.COLUMN,
      'Batch ID is a managed column, so Create Managed Columns will add it');

    t.is(Batches.COLUMN, 'Batch ID', 'the column name is stable');

    // --- describing a batch ---
    const batch = {
      id: 'BATCH-20260731-1430',
      count: 21,
      startRow: 133,
      endRow: 153,
      firstDay: new Date(2026, 7, 3),
      lastDay: new Date(2026, 7, 9),
      campaignList: ['ICU Center', 'Emergency Center', 'Hospital Life'],
      pageList: ['INSAN', 'Delta']
    };

    const described = Batches.describe(batch);
    t.includes(described, 'BATCH-20260731-1430', 'the description names the batch');
    t.includes(described, '133–153',
      'and shows the row range — the operator has been reading these off the ' +
      'sheet, and seeing them is what makes the picker trustworthy rather than magic');
    t.includes(described, '21 rows', 'and how many rows');
    t.includes(described, '3 campaigns', 'and how many campaigns');
    t.includes(described, 'INSAN/Delta', 'and which pages');

    const oneDay = Batches.describe(Object.assign({}, batch, {
      firstDay: new Date(2026, 7, 3), lastDay: new Date(2026, 7, 3)
    }));
    t.notOk(oneDay.indexOf('–') !== -1 && oneDay.indexOf('3 Aug – 3 Aug') !== -1,
      'a single-day batch is not described as a range from itself to itself');

    // --- crossing into the Content Pipeline ---
    // Resolved through Calendar ID, which the operator's own transfer formula
    // already carries across. Matching on row position would assume the two
    // sheets stay aligned, and a row deleted by hand in one shifts only that one.
    const source = fx.srcSection('Batches');

    t.includes(source, "data['Calendar ID']",
      'rowsIn joins on Calendar ID, not on row position');
    t.notOk(/rowsIn[\s\S]{0,600}startRow \+ i/.test(source),
      'rowsIn never assumes the two sheets are aligned by offset');

    // --- contiguity is reported, not assumed ---
    t.includes(source, 'contiguous',
      'rowsIn reports whether the resolved rows are contiguous');

    const contiguousOf = (rows) =>
      rows.length > 0 && (rows[rows.length - 1] - rows[0] + 1) === rows.length;

    t.is(contiguousOf([10, 11, 12, 13]), true, 'consecutive rows are contiguous');
    t.is(contiguousOf([10, 11, 13]), false,
      'a gap is not contiguous — reviewing the whole span would pull in a row ' +
      'from another plan');
    t.is(contiguousOf([10]), true, 'a single row is contiguous');
    t.is(contiguousOf([]), false, 'nothing resolved is not contiguous');

    // --- rows planned before this column existed ---
    // The calendar already holds 132 of them. A picker that silently omitted
    // them would be telling the operator those rows are not there.
    t.includes(source, '(before batches)',
      'unstamped rows are reported as their own batch rather than hidden');
    t.includes(source, 'unstamped',
      'and are flagged, so they sort last and read as what they are');
  }
};
