// ================================
// BATCHES
//
// The calendar accumulates. Each planning cycle appends its rows below the last
// — a week here, a month there — and after a few cycles the sheet holds several
// plans at once with nothing saying where one ends and the next begins.
//
// Dates do not settle it. Two cycles can overlap, a cycle can be replanned, and
// "the rows from the fifth onward" stops being an answer the moment a plan is
// added out of order.
//
// So each planning run stamps its rows with one `Batch ID`. That single column
// answers three separate questions that were each being answered by hand:
//
//   which rows belong to the plan I just made
//   which rows should the portfolio critic read     (not all of them — a
//                                                    critic comparing two
//                                                    different campaigns reports
//                                                    variety as inconsistency)
//   which rows are finished and can be archived
//
// The id is the planning moment, not the campaign: BATCH-20260731-1430. A
// campaign name would collide the second time the same campaign is planned, and
// the whole point is to tell those two runs apart.
// ================================

var Batches = {

  COLUMN: 'Batch ID',
  PREFIX: 'BATCH',

  _calendarSheet: function() {
    return (CONFIG.CAMPAIGN_PLANNER || {}).CALENDAR_SHEET_NAME || 'Content Calendar';
  },

  // Stamped once per planning run, from the moment the run happened.
  newId: function(when) {
    var at = when || new Date();

    return this.PREFIX + '-' + Utilities.formatDate(
      at, Session.getScriptTimeZone(), 'yyyyMMdd-HHmm'
    );
  },

  // ------------------------------------------------------------- reading

  // Every batch in the calendar, newest first.
  //
  // Rows without a Batch ID are reported as one pseudo-batch rather than
  // hidden. The calendar already holds 132 rows planned before this column
  // existed, and a picker that silently omitted them would be telling the
  // operator those rows are not there.
  all: function() {
    var sheetName = this._calendarSheet();
    var lastRow = SheetSchema.getLastRow(sheetName);

    if (lastRow < CONFIG.DATA_START_ROW) {
      return [];
    }

    var byId = {};
    var order = [];

    for (var row = CONFIG.DATA_START_ROW; row <= lastRow; row++) {
      var data = SheetSchema.getRowData(row, sheetName);
      var campaign = String(data['Campaign Name'] || '').trim();

      if (!campaign) {
        continue;
      }

      var id = String(data[this.COLUMN] || '').trim() || '(before batches)';

      if (!byId[id]) {
        byId[id] = {
          id: id,
          unstamped: id === '(before batches)',
          rows: [],
          calendarIds: [],
          campaigns: {},
          pages: {},
          firstDay: null,
          lastDay: null
        };
        order.push(byId[id]);
      }

      var batch = byId[id];
      batch.rows.push(row);
      batch.campaigns[campaign] = (batch.campaigns[campaign] || 0) + 1;

      var page = String(data['Page'] || '').trim();
      if (page) {
        batch.pages[page] = true;
      }

      var calendarId = String(data['Calendar ID'] || '').trim();
      if (calendarId) {
        batch.calendarIds.push(calendarId);
      }

      var day = data['Day'];
      if (day instanceof Date && !isNaN(day.getTime())) {
        if (!batch.firstDay || day < batch.firstDay) batch.firstDay = day;
        if (!batch.lastDay || day > batch.lastDay) batch.lastDay = day;
      }
    }

    for (var i = 0; i < order.length; i++) {
      var b = order[i];
      b.count = b.rows.length;
      b.startRow = Math.min.apply(null, b.rows);
      b.endRow = Math.max.apply(null, b.rows);
      b.campaignList = Object.keys(b.campaigns);
      b.pageList = Object.keys(b.pages);
    }

    // Newest first. The unstamped rows are the oldest thing here by definition,
    // so they sort last whatever their row numbers say.
    order.sort(function(a, b) {
      if (a.unstamped !== b.unstamped) return a.unstamped ? 1 : -1;
      return b.startRow - a.startRow;
    });

    return order;
  },

  byId: function(batchId) {
    var wanted = String(batchId || '').trim();
    var all = this.all();

    for (var i = 0; i < all.length; i++) {
      if (all[i].id === wanted) {
        return all[i];
      }
    }

    return null;
  },

  // --------------------------------------------------- crossing the join

  // The rows in another sheet that came from this batch.
  //
  // Resolved through `Calendar ID`, which the operator's own transfer formula
  // already carries into the Content Pipeline. Matching on row position instead
  // would assume the two sheets stay aligned, and they do not: a row deleted by
  // hand in one shifts everything under it in that sheet alone.
  //
  // Returns { rows: [n], contiguous: bool, missing: n }.
  rowsIn: function(batch, sheetName) {
    var wanted = {};
    var wantedCount = 0;

    for (var i = 0; i < batch.calendarIds.length; i++) {
      if (!wanted[batch.calendarIds[i]]) {
        wanted[batch.calendarIds[i]] = true;
        wantedCount++;
      }
    }

    var found = [];
    var lastRow = SheetSchema.getLastRow(sheetName);

    for (var row = CONFIG.DATA_START_ROW; row <= lastRow; row++) {
      var data = SheetSchema.getRowData(row, sheetName);
      var calendarId = String(data['Calendar ID'] || '').trim();

      if (calendarId && wanted[calendarId]) {
        found.push(row);
      }
    }

    var contiguous = found.length > 0 &&
      (found[found.length - 1] - found[0] + 1) === found.length;

    return {
      rows: found,
      contiguous: contiguous,
      startRow: found.length ? found[0] : null,
      endRow: found.length ? found[found.length - 1] : null,
      missing: wantedCount - found.length
    };
  },

  // ------------------------------------------------------------ display

  // One line per batch, for a picker. Deliberately shows the row range: the
  // operator has been reading row numbers off the sheet to answer this, and
  // seeing them here is what makes the picker trustworthy rather than magic.
  describe: function(batch) {
    var parts = [batch.id];

    if (batch.firstDay) {
      var from = Utilities.formatDate(
        batch.firstDay, Session.getScriptTimeZone(), 'd MMM');
      var to = Utilities.formatDate(
        batch.lastDay, Session.getScriptTimeZone(), 'd MMM');
      parts.push(from === to ? from : from + ' – ' + to);
    }

    parts.push(batch.count + ' rows (' + batch.startRow + '–' + batch.endRow + ')');
    parts.push(batch.campaignList.length + ' campaigns');

    if (batch.pageList.length) {
      parts.push(batch.pageList.join('/'));
    }

    return parts.join('  |  ');
  }
};
