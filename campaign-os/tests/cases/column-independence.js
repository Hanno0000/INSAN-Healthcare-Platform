// Every column is resolved by header text, never by position.
//
// The operator asked directly: does any code depend on where a column sits, so
// that moving one breaks something? Measured, not assumed — this suite is that
// measurement, held permanently.
//
// It exists because the answer used to be "one place does": a spreadsheet
// VLOOKUP joined Campaign Cards to Content Pipeline by addressing columns O:Z
// positionally, and three separate comments plus one operator-facing string
// said so. That formula was deleted from the workbook on 2026-08-02 — Transfer.gs
// has matched every field by name since before that, and now the documentation
// says so too.

module.exports = {
  name: 'column independence',

  run(t, fx) {
    // --- the read path: every column lookup goes through the header map ---
    const schema = fx.srcSection('SheetSchema');

    t.includes(schema, '_getColumnMap: function',
      'a single function builds the name→column map, from the header row');
    t.includes(schema, 'headerRow[i]',
      'the map is built by reading header text, not by a fixed offset');

    // --- the write path: appends resolve the header row live, every time ---
    const transfer = fx.srcSection('Transfer');

    t.includes(transfer, "sheet.getRange(CONFIG.HEADER_ROW, 1, 1, lastColumn).getValues()",
      '_append reads the header row fresh before writing, rather than trusting ' +
      'a remembered position');
    t.includes(transfer, 'index[name] = c',
      'and builds its own name→index map from what it just read');

    // --- Transfer.CARD_STRATEGY is a list of names, not positions ---
    t.ok(Array.isArray(Transfer.CARD_STRATEGY) && Transfer.CARD_STRATEGY.length > 0,
      'the strategy fields Transfer carries are a real, non-empty list');
    t.ok(Transfer.CARD_STRATEGY.every((f) => typeof f === 'string' && !/^[A-Z]{1,2}$/.test(f)),
      'and every one is a column NAME — none of them is a bare spreadsheet ' +
      'column letter like "O" or "AA"');

    // --- proof by behaviour: reordering the source columns changes nothing ---
    // The clearest way to show the claim is true rather than merely absent of
    // the old formula: run the actual transfer twice, with Campaign Cards'
    // columns in two different orders, and get the identical result.
    const CARD_HEADERS_FORWARD = ['Campaign Name', 'Campaign Philosophy', 'Trust Platform',
                                   'Core Message', 'Target Audience'];
    const CARD_HEADERS_SHUFFLED = ['Target Audience', 'Campaign Name', 'Core Message',
                                    'Campaign Philosophy', 'Trust Platform'];

    const CARD_VALUES = {
      'Campaign Name': 'ICU Center',
      'Campaign Philosophy': 'Saving Life',
      'Trust Platform': 'Continuity',
      'Core Message': 'Never alone in the critical moment',
      'Target Audience': 'Families of critically ill patients'
    };

    const CALENDAR_HEADERS = ['Day', 'Calendar ID', 'Publishing Page', 'Campaign Group',
                              'Campaign Name', 'Hospital Brand'];
    const CALENDAR_ROW = {
      Day: '2026-08-05', 'Calendar ID': 'CAL-TEST-1', 'Publishing Page': 'INSAN',
      'Campaign Group': 'Medical Services', 'Campaign Name': 'ICU Center',
      'Hospital Brand': 'INSAN'
    };

    function runTransferWithCardColumnOrder(headerOrder) {
      const savedSheet = global.SpreadsheetApp;
      let written = null;

      const sheetFor = (name) => {
        if (name === 'Content Calendar') {
          return {
            getLastRow: () => 2,
            getLastColumn: () => CALENDAR_HEADERS.length,
            getRange: (row, col, numRows, numCols) => ({
              getValues: () => {
                if (row === 1) return [CALENDAR_HEADERS];
                return [CALENDAR_HEADERS.map((h) => CALENDAR_ROW[h] || '')];
              }
            })
          };
        }
        if (name === 'Campaign Cards') {
          return {
            getLastRow: () => 2,
            getLastColumn: () => headerOrder.length,
            getRange: (row) => ({
              getValues: () => {
                if (row === 1) return [headerOrder];
                return [headerOrder.map((h) => CARD_VALUES[h] || '')];
              }
            })
          };
        }
        if (name === 'Content Pipeline') {
          // The destination: a fixed, unrelated header order of its own — proof
          // that source order and destination order are fully independent.
          const pipelineHeaders = ['Content ID', 'Calendar ID', 'Batch ID', 'Campaign Philosophy',
                                    'Trust Platform', 'Core Message', 'Target Audience'];
          return {
            getLastRow: () => 1,
            getLastColumn: () => pipelineHeaders.length,
            getRange: (row, col, numRows, numCols) => {
              if (row === 1 && numRows === 1) {
                return { getValues: () => [pipelineHeaders] };
              }
              return {
                setValues: (rows) => {
                  written = rows.map((line) => {
                    const record = {};
                    pipelineHeaders.forEach((h, i) => { record[h] = line[i]; });
                    return record;
                  });
                }
              };
            }
          };
        }
        return null;
      };

      global.SpreadsheetApp = {
        getActiveSpreadsheet: () => ({ getSheetByName: sheetFor }),
        flush: () => {}
      };

      let result;
      try {
        result = Transfer.calendarToPipeline();
      } finally {
        global.SpreadsheetApp = savedSheet;
      }

      return { result, written };
    }

    const forward = runTransferWithCardColumnOrder(CARD_HEADERS_FORWARD);
    const shuffled = runTransferWithCardColumnOrder(CARD_HEADERS_SHUFFLED);

    t.is(forward.result.written, 1, 'the transfer writes the one calendar row');
    t.is(shuffled.result.written, 1, 'and writes it the same when the card columns are shuffled');

    t.ok(forward.written && forward.written[0], 'a row was actually captured for the forward order');
    t.ok(shuffled.written && shuffled.written[0], 'and for the shuffled order');

    for (const field of ['Campaign Philosophy', 'Trust Platform', 'Core Message', 'Target Audience']) {
      t.is(forward.written[0][field], CARD_VALUES[field],
        `${field} lands correctly with Campaign Cards in its normal column order`);
      t.is(shuffled.written[0][field], CARD_VALUES[field],
        `${field} lands correctly with Campaign Cards' columns reordered — ` +
        'proof this is resolved by name, not position');
    }

    // --- the operator-facing refusal text matches the real mechanism ---
    // Shown directly on the sheet when a worker refuses an empty-strategy row.
    // Audit A's finding here was that this exact string told the operator to
    // look for a VLOOKUP that, as of 2026-08-02, no longer exists.
    const remedy = _refusalRemedy('CONTENT_STRATEGY_WORKER');

    t.notOk(/VLOOKUP/i.test(remedy),
      'the refusal message the operator actually sees does not point at a ' +
      'formula that has been deleted from the sheet');
    t.includes(remedy, 'Transfer Rows Forward',
      'and names the real step that carries strategy into the pipeline');
  }
};
