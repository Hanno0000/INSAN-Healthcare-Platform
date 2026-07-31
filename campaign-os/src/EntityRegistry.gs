// ================================
// ENTITY REGISTRY  (improvement I7)
//
// Three systems described the same business and agreed on 18% of it. Audit B
// measured 22 distinct entities named across the brand documents, this sheet and
// the website database, with 4 appearing in all three — and the website
// advertising two centers no campaign has ever heard of.
//
// The cause is structural: each project kept its own list. `ENTITY_REGISTRY.md`
// is now the list, and this reads it and compares it against `Campaign Cards`.
//
// It changes nothing on its own. That is deliberate: reconciling the three
// systems is a brand-owner decision about what the business contains, not a
// merge — so this makes the disagreement visible and specific, and leaves the
// decision where it belongs.
// ================================

var EntityRegistry = {

  FILE_NAME: 'ENTITY_REGISTRY.md',
  EMPTY: '—',

  // ----------------------------------------------------------------- loading

  load: function() {
    var content = DriveLoader.loadMarkdown(this.FILE_NAME, CONFIG.DOCS_FOLDER_ID);

    if (!content) {
      throw new Error(
        'Could not load ' + this.FILE_NAME + ' from the docs folder. It is the ' +
        'single list of what this ecosystem contains — see ' +
        'business/brand/ENTITY_REGISTRY.md.'
      );
    }

    return this.parse(content);
  },

  // The registry table, as rows. Anything that is not a six-column data row is
  // skipped — but a row that looks like data and does not parse is reported,
  // because a silently dropped entity is exactly the failure this file exists
  // to prevent.
  parse: function(content) {
    var lines = String(content || '').split('\n');
    var entities = [];
    var malformed = [];

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();

      if (line.indexOf('|') !== 0) {
        continue;
      }

      var cells = line.split('|').slice(1, -1);

      for (var c = 0; c < cells.length; c++) {
        cells[c] = cells[c].trim();
      }

      // Header, separator, and the divergence tables further down the file.
      if (cells.length !== 6 || /^-{2,}$/.test(cells[0]) || cells[0] === 'ID') {
        continue;
      }

      if (!/^[A-Z]{3,4}-\d{3}$/.test(cells[0])) {
        // Looks like a table row in the registry's format but carries no id.
        if (/^(MED|CEN|HOSP|PROG)/i.test(cells[0])) {
          malformed.push({ line: i + 1, text: line.substring(0, 80) });
        }
        continue;
      }

      var campaignName = cells[4] === this.EMPTY ? '' : cells[4];

      entities.push({
        id: cells[0],
        nameEn: cells[1],
        nameAr: cells[2],
        level: cells[3],
        campaignName: campaignName,
        hospitals: cells[5],
        line: i + 1
      });
    }

    return { entities: entities, malformed: malformed };
  },

  // ------------------------------------------------------------ reconciling

  // Compares the registry against Campaign Cards. Reports three kinds of
  // disagreement, each of which means something different:
  //
  //   unscheduled  — registered, real, no card. Legitimate, or a gap.
  //   unregistered — a card naming something the business does not list.
  //   mismatched   — a card whose Service Level contradicts the registry.
  //
  // Only the second and third are defects. The first is information.
  check: function() {
    var registry = this.load();
    var cards = this._readCards();

    var byCampaign = {};
    for (var i = 0; i < registry.entities.length; i++) {
      var e = registry.entities[i];
      if (e.campaignName) {
        byCampaign[e.campaignName.toLowerCase()] = e;
      }
    }

    var unscheduled = [];
    var matched = 0;

    for (var r = 0; r < registry.entities.length; r++) {
      var entity = registry.entities[r];

      if (!entity.campaignName) {
        unscheduled.push(entity);
        continue;
      }

      if (!cards.byName[entity.campaignName.toLowerCase()]) {
        unscheduled.push(entity);
      } else {
        matched++;
      }
    }

    var unregistered = [];
    var mismatched = [];

    for (var name in cards.byName) {
      var card = cards.byName[name];
      var registered = byCampaign[name];

      if (!registered) {
        unregistered.push(card);
        continue;
      }

      if (card.level && registered.level && card.level !== registered.level) {
        mismatched.push({
          campaign: card.name,
          cardLevel: card.level,
          registryLevel: registered.level,
          entity: registered.nameEn
        });
      }
    }

    return {
      registered: registry.entities.length,
      malformed: registry.malformed,
      cards: cards.count,
      matched: matched,
      unscheduled: unscheduled,
      unregistered: unregistered,
      mismatched: mismatched,
      agreement: cards.count
        ? Math.round((matched / Math.max(cards.count, registry.entities.length)) * 100)
        : 0
    };
  },

  _readCards: function() {
    var sheetName = CONFIG.CAMPAIGN_CARDS_SHEET_NAME;
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);

    if (!sheet) {
      throw new Error('Sheet "' + sheetName + '" not found.');
    }

    var map = SheetSchema._getColumnMap(sheetName);
    var nameCol = map['Campaign Name'];
    var levelCol = map['Service Level'];
    var lastRow = sheet.getLastRow();

    if (!nameCol || lastRow < CONFIG.DATA_START_ROW) {
      return { byName: {}, count: 0 };
    }

    var width = levelCol ? Math.max(nameCol, levelCol) : nameCol;
    var values = sheet
      .getRange(CONFIG.DATA_START_ROW, 1, lastRow - CONFIG.DATA_START_ROW + 1, width)
      .getValues();

    var byName = {};
    var count = 0;

    for (var i = 0; i < values.length; i++) {
      var name = String(values[i][nameCol - 1] || '').trim();

      if (!name) {
        continue;
      }

      byName[name.toLowerCase()] = {
        name: name,
        level: levelCol ? String(values[i][levelCol - 1] || '').trim() : '',
        row: CONFIG.DATA_START_ROW + i
      };
      count++;
    }

    return { byName: byName, count: count };
  }
};


// ================================
// MENU — AI Workers → Maintenance → Check Entity Registry
// ================================

function checkEntityRegistry() {
  var ui = SpreadsheetApp.getUi();

  ConfigResolver.apply();

  try {
    var result = EntityRegistry.check();
    var lines = [
      'Registered entities : ' + result.registered,
      'Campaign cards      : ' + result.cards,
      'Agreeing            : ' + result.matched,
      ''
    ];

    if (result.malformed.length) {
      lines.push('⚠️ ' + result.malformed.length + ' registry row(s) could not be read:');
      for (var m = 0; m < Math.min(result.malformed.length, 5); m++) {
        lines.push('   line ' + result.malformed[m].line + ': ' + result.malformed[m].text);
      }
      lines.push('');
    }

    if (result.unregistered.length) {
      lines.push('CARDS NAMING SOMETHING THE BUSINESS DOES NOT LIST — ' +
        result.unregistered.length);
      lines.push('These are the defect. Either the entity is real and belongs in');
      lines.push('the registry, or the card should be retired.');
      for (var u = 0; u < result.unregistered.length; u++) {
        lines.push('   • ' + result.unregistered[u].name +
          '  (row ' + result.unregistered[u].row + ')');
      }
      lines.push('');
    }

    if (result.mismatched.length) {
      lines.push('SERVICE LEVEL DISAGREES WITH THE REGISTRY — ' + result.mismatched.length);
      lines.push('A Department filed as a Center is the modelling error the');
      lines.push('taxonomy exists to prevent.');
      for (var x = 0; x < result.mismatched.length; x++) {
        lines.push('   • ' + result.mismatched[x].campaign + ': card says ' +
          result.mismatched[x].cardLevel + ', registry says ' +
          result.mismatched[x].registryLevel);
      }
      lines.push('');
    }

    if (result.unscheduled.length) {
      lines.push('REGISTERED, NO CARD — ' + result.unscheduled.length);
      lines.push('Not necessarily wrong: the registry describes the business, not');
      lines.push('the plan. It is a gap only where the calendar schedules them.');
      for (var s = 0; s < result.unscheduled.length; s++) {
        lines.push('   · ' + result.unscheduled[s].nameEn +
          ' [' + result.unscheduled[s].level + ']');
      }
      lines.push('');
    }

    if (!result.unregistered.length && !result.mismatched.length &&
        !result.malformed.length) {
      lines.push('No contradictions. Every card names a registered entity at the');
      lines.push('level the registry gives it.');
      lines.push('');
    }

    lines.push('The registry is business/brand/ENTITY_REGISTRY.md. It also lists');
    lines.push('the divergences with the website database, which need a');
    lines.push('brand-owner decision rather than a merge.');

    ui.alert('Entity Registry', lines.join('\n'), ui.ButtonSet.OK);

  } catch (e) {
    ui.alert('Entity Registry', e.message || e.toString(), ui.ButtonSet.OK);
  }
}
