// ===========================================================================
// Planning.gs
//
// Everything upstream of production: what to say, when to say it, and what
// happens to a plan once it is finished.
//
// Merged from 9 source files on 2026-08-02. Apps Script has no
// modules: every .gs is evaluated into one shared scope before anything is
// called, so which file a definition sits in has never affected what runs.
// They were split for reading and merged because the operator pastes each
// file into the editor by hand.
//
// The BEGIN/END banners below are load-bearing for the tests, which read a
// section by name — see tests/run.js, fixtures.srcSection.
//
// Contents:
//   CardBuilder.gs
//   PlannerRunner.gs
//   PortfolioCritic.gs
//   EventsCalendar.gs
//   EntityRegistry.gs
//   Batches.gs
//   Transfer.gs
//   Archive.gs
//   PostFooter.gs
// ===========================================================================


// ---------------------------------------------------------------------------
// BEGIN SOURCE FILE: CardBuilder.gs
// ---------------------------------------------------------------------------
// W1 — CAMPAIGN CARD BUILDER
//
// Turns one knowledge file into one Campaign Cards row.
//
// This is the worker the system was missing. Measured on the sheet as it stood
// on 2026-07-29: the Content Calendar scheduled 41 distinct campaigns, Campaign
// Cards covered 16, and 89 of 132 pipeline rows (67%) reached the Content
// Strategy Worker with all twelve strategy fields blank — the campaigns with no
// card resolved to nothing. The workers were not failing on those rows —
// they were inventing, because nothing had been said.
// (Audit A, findings F1 and F7; SYSTEM_ARCHITECTURE §9.2.)
//
// Knowledge flows one way:
//
//   knowledge file  →  W1  →  one row in Campaign Cards  →  Transfer.gs  →  pipeline
//
// (Transfer.gs replaced a spreadsheet VLOOKUP that did this same join
// positionally; see Transfer.CARD_STRATEGY below.)
//
// The card is a derivation, never a copy. A wrong fact is fixed in the knowledge
// file and the card rebuilt — fixing it in the card alone leaves the file wrong
// and the correction is lost on the next rebuild.

var CardBuilder = {

  WORKER_NAME: 'CAMPAIGN_CARD_BUILDER',

  _config: function() {
    return CONFIG.CARD_BUILDER || {};
  },

  _property: function(name) {
    var value = PropertiesService.getScriptProperties().getProperty(name);
    return value && String(value).trim() ? String(value).trim() : null;
  },

  // ---------------------------------------------------------------- reading

  // Knowledge files sit in one folder per level — departments, centers,
  // hospitals, supporting. Searching recursively from the knowledge root means
  // the operator sets one property instead of seven, and moving a file between
  // levels does not break the link.
  findKnowledgeFile: function(fileName) {
    // Identifiers from Script Properties where set, CONFIG.gs otherwise.
    // Idempotent; see ConfigResolver (Audit A, F17).
    ConfigResolver.apply();

    // Script Property first, CONFIG.gs second — the same rule as every other
    // identifier since F17. Both empty is a real misconfiguration and says so.
    var rootId = this._property('KNOWLEDGE_FOLDER_ID') || CONFIG.KNOWLEDGE_FOLDER_ID;

    if (!rootId) {
      throw new Error(
        'No knowledge folder is configured. Set KNOWLEDGE_FOLDER_ID in Script ' +
        'Properties, or CONFIG.KNOWLEDGE_FOLDER_ID, pointing at the ' +
        'business/knowledge folder in Drive.'
      );
    }

    var root;
    try {
      root = DriveApp.getFolderById(rootId);
    } catch (e) {
      throw new Error(
        'KNOWLEDGE_FOLDER_ID does not resolve to a folder this script can open: ' +
        e.toString()
      );
    }

    var found = this._searchFolder(root, fileName, 0);

    if (!found) {
      throw new Error(
        'Knowledge file "' + fileName + '" was not found under the knowledge ' +
        'folder or its subfolders. Check the name in KNOWLEDGE_BASE_SPEC §3 — ' +
        'the filename is the join key and a rename breaks the card.'
      );
    }

    return found;
  },

  // Every `.md` under the knowledge root, so a caller can offer a list instead
  // of asking the operator to type a filename exactly.
  //
  // The filename is the join key: `findKnowledgeFile` matches on it exactly, and
  // a typo is reported as "not found" — which reads like a missing file rather
  // than a mistyped one. A list removes the class of error entirely.
  //
  // Reads names only. The content of ~26 files is several hundred KB and none of
  // it is needed to draw a list.
  listKnowledgeFiles: function() {
    ConfigResolver.apply();

    var rootId = this._property('KNOWLEDGE_FOLDER_ID') || CONFIG.KNOWLEDGE_FOLDER_ID;
    if (!rootId) return [];

    var root;
    try {
      root = DriveApp.getFolderById(rootId);
    } catch (e) {
      Logger.log('CARD_BUILDER | knowledge folder does not resolve: ' + e.toString());
      return [];
    }

    var found = [];
    this._collectNames(root, found, 0);

    // A file reachable by two paths is one file to the operator.
    var seen = {};
    var unique = [];

    for (var i = 0; i < found.length; i++) {
      if (seen[found[i].name]) continue;
      seen[found[i].name] = true;
      unique.push(found[i]);
    }

    unique.sort(function(a, b) { return a.name < b.name ? -1 : a.name > b.name ? 1 : 0; });

    return unique;
  },

  _collectNames: function(folder, out, depth) {
    // Same bound as the search below, for the same reason.
    if (depth > 3) return;

    var files = folder.getFiles();

    while (files.hasNext()) {
      var file = files.next();
      var name = file.getName();
      if (/\.md$/i.test(name)) {
        out.push({ name: name, folder: folder.getName() });
      }
    }

    var subfolders = folder.getFolders();

    while (subfolders.hasNext()) {
      this._collectNames(subfolders.next(), out, depth + 1);
    }
  },

  _searchFolder: function(folder, fileName, depth) {
    // The knowledge tree is two levels deep by design. A bound stops a stray
    // shortcut turning a lookup into a full-Drive walk.
    if (depth > 3) {
      return null;
    }

    var files = folder.getFilesByName(fileName);

    if (files.hasNext()) {
      var file = files.next();
      return {
        name: file.getName(),
        folder: folder.getName(),
        content: file.getBlob().getDataAsString('UTF-8')
      };
    }

    var subfolders = folder.getFolders();

    while (subfolders.hasNext()) {
      var hit = this._searchFolder(subfolders.next(), fileName, depth + 1);
      if (hit) {
        return hit;
      }
    }

    return null;
  },

  // ------------------------------------------------------------- validating

  // Everything below runs before the model is called. A file that cannot
  // support a card fails in milliseconds naming what is missing, rather than
  // producing a card that looks complete because a model filled the silence.

  parseFrontMatter: function(content) {
    var match = /^---\s*\n([\s\S]*?)\n---/.exec(content);

    if (!match) {
      return {};
    }

    var fields = {};
    var lines = match[1].split('\n');

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      var sep = line.indexOf(':');

      // Only top-level keys. Nested list items belong to the key above them and
      // are not card inputs.
      if (sep === -1 || /^\s/.test(line)) {
        continue;
      }

      var key = line.substring(0, sep).trim();
      var value = line.substring(sep + 1).trim();

      if (key) {
        fields[key] = value;
      }
    }

    return fields;
  },

  // Strips the template's [REQUIRED] tags, card-column arrows and decorative
  // rules so a heading is matched on its name alone. The level matters: it is
  // what distinguishes a subsection from the next sibling section.
  _heading: function(line) {
    var m = /^(#{1,6})\s+(.+?)\s*$/.exec(line);

    if (!m) {
      return null;
    }

    var text = m[2]
      .replace(/\*\*\[REQUIRED\]\*\*/g, '')
      .replace(/\[REQUIRED\]/g, '')
      .replace(/→.*$/, '')
      .replace(/[═─]+/g, '')
      .trim();

    return text ? { text: text, level: m[1].length } : null;
  },

  // Finds a section by any of its accepted name patterns and returns its
  // heading and the text under it, up to the next heading of any level.
  //
  // A heading with nothing beneath it is not a written section — that is the
  // distinction KNOWLEDGE_BASE_SPEC §6 draws between "every heading has a
  // sentence" and done.
  _findSection: function(content, patterns) {
    var lines = content.split('\n');
    var matched = null;
    var matchedAt = -1;

    for (var i = 0; i < lines.length && matchedAt === -1; i++) {
      var heading = this._heading(lines[i]);

      if (!heading) {
        continue;
      }

      var lowered = heading.text.toLowerCase();

      for (var p = 0; p < patterns.length; p++) {
        if (lowered.indexOf(patterns[p]) !== -1) {
          matched = heading;
          matchedAt = i;
          break;
        }
      }
    }

    if (matchedAt === -1) {
      return null;
    }

    var body = [];

    for (var b = matchedAt + 1; b < lines.length; b++) {
      if (this._heading(lines[b])) {
        break;
      }
      body.push(lines[b]);
    }

    var text = body.join('\n').replace(/^[\s-]+$/gm, '').trim();

    // A section whose own paragraph is empty but which opens straight onto
    // subsections is written — the reference file's "Audience" and "Core
    // Features" are both shaped that way, and both are required.
    //
    // Only a deeper heading counts. Accepting the next heading of any level
    // would let an empty section borrow the body of the sibling below it, and
    // an empty required section is exactly what this check exists to catch.
    if (!text) {
      for (var s = matchedAt + 1; s < lines.length; s++) {
        var next = this._heading(lines[s]);

        if (!next) {
          continue;
        }

        if (next.level <= matched.level) {
          break;
        }

        var subBody = [];

        for (var t = s + 1; t < lines.length; t++) {
          if (this._heading(lines[t])) {
            break;
          }
          subBody.push(lines[t]);
        }

        text = subBody.join('\n').trim();
        break;
      }
    }

    return { heading: matched.text, body: text, line: matchedAt + 1 };
  },

  validate: function(content, fileName) {
    var config = this._config();
    var problems = [];
    var frontMatter = this.parseFrontMatter(content);

    if (!frontMatter.service_level) {
      problems.push(
        'front matter has no service_level — without it a Department gets ' +
        'filed as a Center'
      );
    } else if (CONFIG.CONTROLLED_VOCABULARY['Service Level']
        .indexOf(frontMatter.service_level) === -1) {
      problems.push(
        'service_level is "' + frontMatter.service_level + '", which is not one of ' +
        CONFIG.CONTROLLED_VOCABULARY['Service Level'].join(', ')
      );
    }

    if (!frontMatter.entity_name_en) {
      problems.push('front matter has no entity_name_en');
    }

    var required = config.REQUIRED_SECTIONS || [];
    var resolved = {};

    for (var i = 0; i < required.length; i++) {
      var section = required[i];
      var hit = this._findSection(content, section.match);

      if (!hit) {
        problems.push('required section missing: ' + section.name);
        continue;
      }

      if (!hit.body) {
        problems.push(
          'required section is empty: ' + section.name +
          ' (heading "' + hit.heading + '", line ' + hit.line + ')'
        );
        continue;
      }

      resolved[section.name] = hit.heading;
    }

    // Unresolved gaps. These are deliberate: a file may be structurally
    // complete and still be waiting on facts only the operator has — equipment,
    // staffing, response times, names. Building past one would put an invented
    // fact into the source of truth for every campaign about this entity.
    var marker = config.GAP_MARKER || 'NEEDS-OPERATOR';
    var gaps = this._findGaps(content, marker);

    return {
      ok: problems.length === 0 && gaps.length === 0,
      problems: problems,
      gaps: gaps,
      sections: resolved,
      frontMatter: frontMatter,
      fileName: fileName
    };
  },

  _findGaps: function(content, marker) {
    var gaps = [];
    var lines = content.split('\n');
    var heading = '(before the first heading)';

    for (var i = 0; i < lines.length; i++) {
      var h = /^#{1,6}\s+(.+?)\s*$/.exec(lines[i]);

      if (h) {
        heading = h[1].replace(/[═─]+/g, '').trim();
        continue;
      }

      if (lines[i].indexOf(marker) !== -1) {
        var note = lines[i]
          .replace(/<!--/, '').replace(/-->/, '')
          .replace(marker, '').replace(/^[:\s]+/, '').trim();

        gaps.push({ section: heading, note: note.substring(0, 160), line: i + 1 });
      }
    }

    return gaps;
  },

  // --------------------------------------------------------------- building

  _buildPrompt: function(knowledge, frontMatter) {
    var config = this._config();
    var folderId = this._property('PLANNING_PROMPTS_FOLDER_ID') ||
      CONFIG.PLANNING_PROMPTS_FOLDER_ID || CONFIG.PROMPTS_FOLDER_ID;

    var manual = DriveLoader.loadMarkdown(config.promptFile, folderId);

    if (!manual) {
      throw new Error(
        'Could not load ' + config.promptFile + '. Put it in the prompts ' +
        'folder, or set PLANNING_PROMPTS_FOLDER_ID in Script Properties.'
      );
    }

    // W1 is the worker every other worker inherits from: the card it writes is
    // the strategy for every post about this entity for as long as the card
    // stands. It was reading the two brand documents and nothing else, while
    // writing `Master Brand`, `Sub-Brand`, `Medical Center` and `Service Level`
    // — four columns about where this entity sits in the ecosystem — from a
    // knowledge file that describes the entity and not the ecosystem around it.
    var brand = DriveLoader.loadMarkdown('MASTER_BRAND_ARCHITECTURE.md',
      CONFIG.DOCS_FOLDER_ID) || '[not loaded]';
    var constitution = DriveLoader.loadMarkdown('AI_CREATIVE_CONSTITUTION.md',
      CONFIG.DOCS_FOLDER_ID) || '[not loaded]';
    var structure = DriveLoader.loadMarkdown('PROJECT_STRUCTURE.md',
      CONFIG.DOCS_FOLDER_ID) || '[not loaded]';
    var platform = DriveLoader.loadMarkdown('PLATFORM_KNOWLEDGE_BASE.md',
      CONFIG.DOCS_FOLDER_ID) || '[not loaded]';

    var schemaLines = [];
    for (var field in config.OUTPUT_FIELDS) {
      schemaLines.push('  "' + field + '": "..."');
    }

    var vocabulary = [];
    for (var vField in config.OUTPUT_FIELDS) {
      if (config.OUTPUT_FIELDS[vField] === 'controlled' &&
          CONFIG.CONTROLLED_VOCABULARY[vField]) {
        vocabulary.push(
          vField + ':\n  Allowed values: ' +
          CONFIG.CONTROLLED_VOCABULARY[vField].join(', ')
        );
      }
    }

    // Static first, dynamic last — the order every caching mechanism needs.
    var staticPart = [
      'You are executing inside the INSAN Healthcare AI Operating System.',
      'Worker: ' + this.WORKER_NAME,
      '',
      'You build one campaign card from one knowledge file.',
      'You derive. You never invent.',
      '',
      '=== YOUR TRAINING MANUAL ===',
      '',
      manual,
      '',
      '=== END OF TRAINING MANUAL ===',
      '',
      '=== PROJECT DOCUMENT: MASTER_BRAND_ARCHITECTURE.md ===',
      brand,
      '',
      '=== PROJECT DOCUMENT: AI_CREATIVE_CONSTITUTION.md ===',
      constitution,
      '',
      '=== PROJECT DOCUMENT: PROJECT_STRUCTURE.md ===',
      structure,
      '',
      '=== PROJECT DOCUMENT: PLATFORM_KNOWLEDGE_BASE.md ===',
      platform,
      '',
      '=== CONTROLLED VOCABULARY (USE EXACT VALUES) ===',
      '',
      vocabulary.join('\n\n'),
      '',
      '=== END OF CONTROLLED VOCABULARY ==='
    ].join('\n');

    var dynamicPart = [
      '=== KNOWLEDGE FILE: ' + frontMatter.entity_name_en + ' ===',
      '',
      'Everything you write must be traceable to a line in this file.',
      'service_level: ' + frontMatter.service_level,

      // Every knowledge file states which hospitals run the entity, and until
      // now that line reached nothing: _buildPrompt passed entity_name_en and
      // service_level only. So W1 wrote `Sub-Brand` — which hospital this
      // campaign belongs to — by reading it out of the prose, and W2 then read
      // that guess off the card and scheduled the campaign on a page. Nine
      // centres run at Delta alone; nothing downstream could tell.
      'hospitals: ' + (String(frontMatter.hospitals || '').trim() ||
        '[not stated — do not guess; if Sub-Brand does not follow from the ' +
        'file, return INSUFFICIENT]'),
      '',
      knowledge,
      '',
      '=== END OF KNOWLEDGE FILE ===',
      '',
      '=== OUTPUT FORMAT ===',
      '',
      'Return a single valid JSON object. No markdown fences. No text around it.',
      'Every field must be filled from the knowledge file above.',
      '',
      '{',
      schemaLines.join(',\n'),
      '}',
      '',
      'If the file genuinely does not support a field, return the exact string',
      '"INSUFFICIENT" for that field. Never fill it with something plausible —',
      'a plausible answer here becomes the strategy for every post about this',
      'entity, and nobody downstream can tell it was a guess.',
      '',
      '=== END OF OUTPUT FORMAT ==='
    ].join('\n');

    return { prompt: staticPart + '\n\n' + dynamicPart, staticPart: staticPart };
  },

  // ---------------------------------------------------------------- writing

  // The name the card is filed under, which is the join key the whole pipeline
  // turns on: Content Pipeline looks the campaign up in Campaign Cards once per
  // scheduled post.
  //
  // A knowledge file describes an *entity*, and an entity's name is not always
  // the *campaign's*. Measured against the live workbook: the ICU file names
  // "Intensive Care Unit" while the calendar schedules "ICU Center" (11 slots),
  // the Emergency file names "Emergency Department" against "Emergency Center"
  // (16), and the Delta file names the hospital against "Delta Restore Trust"
  // (8). Filing the card under the entity name leaves Transfer.gs unable to
  // find it for any of the 35 — the 67% defect again, this time arriving
  // underneath a card that reported success.
  //
  // So a file may state campaign_name when the two differ. Where it does not,
  // the entity name is the campaign name — true of every supporting campaign.
  campaignNameFor: function(frontMatter) {
    var explicit = String((frontMatter || {}).campaign_name || '').trim();
    return explicit || String((frontMatter || {}).entity_name_en || '').trim();
  },

  // How many scheduled posts a card under this name would actually serve.
  //
  // Zero means the card is orphaned: correct in itself, joined to nothing, and
  // indistinguishable from a working one until 132 rows arrive with no
  // strategy. Returns null when the calendar cannot be read, so an offline
  // check is never blocked by it.
  calendarUsage: function(campaignName) {
    try {
      var sheetName = (CONFIG.CAMPAIGN_PLANNER || {}).CALENDAR_SHEET_NAME ||
        'Content Calendar';
      var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);

      if (!sheet) {
        return null;
      }

      var nameCol = SheetSchema._getColumnMap(sheetName)['Campaign Name'];
      var lastRow = sheet.getLastRow();

      if (!nameCol || lastRow < CONFIG.DATA_START_ROW) {
        return null;
      }

      var values = sheet
        .getRange(CONFIG.DATA_START_ROW, nameCol, lastRow - CONFIG.DATA_START_ROW + 1, 1)
        .getValues();

      var wanted = String(campaignName || '').trim().toLowerCase();
      var slots = 0;
      var others = {};

      for (var i = 0; i < values.length; i++) {
        var name = String(values[i][0] || '').trim();

        if (!name) {
          continue;
        }

        if (name.toLowerCase() === wanted) {
          slots++;
        } else {
          others[name] = (others[name] || 0) + 1;
        }
      }

      return { slots: slots, near: slots ? [] : this._nearNames(wanted, others) };

    } catch (e) {
      Logger.log('CARD_BUILDER | calendar usage unavailable: ' + e.toString());
      return null;
    }
  },

  // Calendar names sharing a word with the one asked for. The mismatch is
  // almost always a rename rather than a genuinely absent campaign, so naming
  // the candidates turns "no rows use this" into an obvious one-line fix.
  _nearNames: function(wanted, others) {
    var words = wanted.split(/[^a-z0-9؀-ۿ]+/).filter(function(w) {
      return w.length > 3;
    });

    var hits = [];

    for (var name in others) {
      var lower = name.toLowerCase();

      for (var w = 0; w < words.length; w++) {
        if (lower.indexOf(words[w]) !== -1) {
          hits.push(name + ' (' + others[name] + ' slots)');
          break;
        }
      }
    }

    return hits.slice(0, 5);
  },

  _findCardRow: function(campaignName) {
    var sheetName = CONFIG.CAMPAIGN_CARDS_SHEET_NAME;
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);

    if (!sheet) {
      throw new Error('Sheet "' + sheetName + '" not found.');
    }

    var columnMap = SheetSchema._getColumnMap(sheetName);
    var nameCol = columnMap['Campaign Name'];

    if (!nameCol) {
      throw new Error(
        'Campaign Cards has no "Campaign Name" column — cannot place the card.'
      );
    }

    var lastRow = sheet.getLastRow();
    var wanted = String(campaignName).trim().toLowerCase();

    if (lastRow >= CONFIG.DATA_START_ROW) {
      var names = sheet
        .getRange(CONFIG.DATA_START_ROW, nameCol, lastRow - CONFIG.DATA_START_ROW + 1, 1)
        .getValues();

      for (var i = 0; i < names.length; i++) {
        if (String(names[i][0]).trim().toLowerCase() === wanted) {
          return { row: CONFIG.DATA_START_ROW + i, existed: true };
        }
      }
    }

    return { row: Math.max(lastRow + 1, CONFIG.DATA_START_ROW), existed: false };
  },

  // -------------------------------------------------------------- the entry

  build: function(fileName) {
    var startTime = new Date().getTime();
    var sheetName = CONFIG.CAMPAIGN_CARDS_SHEET_NAME;
    var config = this._config();

    var file = this.findKnowledgeFile(fileName);
    var check = this.validate(file.content, fileName);

    if (!check.ok) {
      var reasons = [];

      for (var p = 0; p < check.problems.length; p++) {
        reasons.push('• ' + check.problems[p]);
      }

      for (var g = 0; g < check.gaps.length; g++) {
        reasons.push('• "' + check.gaps[g].section + '" still needs the ' +
          'operator (line ' + check.gaps[g].line + ')' +
          (check.gaps[g].note ? ': ' + check.gaps[g].note : ''));
      }

      var msg = 'No card was built from ' + fileName + '.\n\n' +
        reasons.join('\n') + '\n\n' +
        'A card built on an incomplete file pushes the same gap downstream ' +
        'wearing a completed badge.';

      Logger.logFailure(this.WORKER_NAME, 0, 0, msg);
      throw new Error(msg);
    }

    var built = this._buildPrompt(file.content, check.frontMatter);

    var response = AIProvider.call(built.prompt, {
      temperature: config.temperature,
      provider: config.provider || undefined,
      model: config.model || undefined,
      cachePrefix: built.staticPart
    });

    var parsed = this._parse(response.text, fileName);

    // The knowledge file decides what the entity is; the front matter is more
    // reliable than a model re-reading it, so identity comes from there.
    parsed['Campaign Name'] = this.campaignNameFor(check.frontMatter);
    parsed['Service Level'] = check.frontMatter.service_level;

    var target = this._findCardRow(parsed['Campaign Name']);
    var written = [];
    var preserved = [];

    var existing = target.existed
      ? SheetSchema.getRowData(target.row, sheetName)
      : {};

    for (var field in config.OUTPUT_FIELDS) {
      var value = parsed[field];

      if (value === undefined || value === null || String(value).trim() === '') {
        continue;
      }

      // A planning decision the operator already made is not the knowledge
      // file's to overwrite. Kept, and reported rather than silently dropped.
      if (config.OPERATOR_OWNED.indexOf(field) !== -1 &&
          String(existing[field] || '').trim()) {
        preserved.push(field + ' = "' + String(existing[field]).trim() + '"');
        continue;
      }

      if (SheetWriter.writeCell(target.row, field, value, sheetName)) {
        written.push(field);
      }
    }

    SheetWriter.writeCell(target.row, 'Campaign Name',
      parsed['Campaign Name'], sheetName);

    // Provenance. An empty Knowledge Source means the card was hand-written and
    // is unmanaged — SYSTEM_ARCHITECTURE §3.3 treats that as a defect.
    SheetWriter.writeCell(target.row, 'Knowledge Source',
      file.folder + '/' + file.name, sheetName);
    SheetWriter.writeCell(target.row, 'Card Built At',
      new Date(), sheetName);

    var runtime = new Date().getTime() - startTime;
    var details = 'Card ' + (target.existed ? 'rebuilt' : 'created') +
      ' on row ' + target.row + ' from ' + fileName +
      ' | Written: ' + written.length + ' fields';

    if (preserved.length) {
      details += ' | Kept operator values: ' + preserved.join(', ');
    }

    if (parsed._insufficient && parsed._insufficient.length) {
      details += ' | Not supported by the file: ' + parsed._insufficient.join(', ');
    }

    details += ' | ' + AIProvider.cacheSummary(response);

    // A card nothing schedules is worth saying out loud. It is the one failure
    // this worker cannot see in its own output: every field correct, joined to
    // no row in the calendar.
    var usage = this.calendarUsage(parsed['Campaign Name']);

    if (usage) {
      details += usage.slots
        ? ' | Serves ' + usage.slots + ' scheduled slot(s)'
        : ' | ORPHANED: no calendar row is named "' + parsed['Campaign Name'] + '"' +
          (usage.near.length ? ' — close names: ' + usage.near.join(', ') : '');
    }

    Logger.logSuccess(
      this.WORKER_NAME, target.row, runtime,
      response.inputTokens, response.outputTokens, details
    );

    return {
      row: target.row,
      existed: target.existed,
      written: written,
      preserved: preserved,
      insufficient: parsed._insufficient || [],
      fileName: fileName
    };
  },

  _parse: function(text, fileName) {
    var cleaned = String(text).trim();

    if (cleaned.indexOf('```') === 0) {
      cleaned = cleaned.replace(/^```(json)?/, '').replace(/```$/, '').trim();
    }

    var first = cleaned.indexOf('{');
    var last = cleaned.lastIndexOf('}');

    if (first === -1 || last <= first) {
      throw new Error(
        'The card builder returned no JSON for ' + fileName +
        '. Response began: ' + cleaned.substring(0, 200)
      );
    }

    var parsed;
    try {
      parsed = JSON.parse(cleaned.substring(first, last + 1));
    } catch (e) {
      throw new Error(
        'The card builder returned malformed JSON for ' + fileName + ': ' +
        e.toString()
      );
    }

    // "INSUFFICIENT" is the worker reporting that the file does not support a
    // field. Recorded and left blank — a blank cell is visibly missing, where a
    // filled one is indistinguishable from a derived answer.
    var insufficient = [];

    for (var field in parsed) {
      if (String(parsed[field]).trim().toUpperCase() === 'INSUFFICIENT') {
        insufficient.push(field);
        delete parsed[field];
      }
    }

    parsed._insufficient = insufficient;
    return parsed;
  }
};

// ---------------------------------------------------------------------------
// END SOURCE FILE: CardBuilder.gs
// ---------------------------------------------------------------------------


// ---------------------------------------------------------------------------
// BEGIN SOURCE FILE: PlannerRunner.gs
// ---------------------------------------------------------------------------
// W2 — CAMPAIGN PLANNER
//
// Turns an operator brief into Content Calendar rows.
//
// The Content Calendar currently schedules 41 distinct campaigns. Campaign Cards
// covers 16. Nothing checked, so 89 of 132 rows (67%) reached the pipeline with
// every strategy field blank and the workers wrote strategy for all of them.
// (Audit A, findings F1 and F8.)
//
// This worker's most important behaviour is therefore not planning. It is
// refusing: a campaign with no card cannot be scheduled, and saying so before
// the plan exists is the only point at which that gap is cheap to fix.
//
// It also asks before it assumes. An operator brief is short and the questions
// it leaves open — which pages, what mix, whether a campaign that has no card
// should be dropped or built first — are exactly the questions that produced a
// silently broken plan last time. (Improvement I6.)

var PlannerRunner = {

  WORKER_NAME: 'CAMPAIGN_PLANNER',

  _config: function() {
    return CONFIG.CAMPAIGN_PLANNER || {};
  },

  // ------------------------------------------------------------ what exists

  // Every campaign with a card, and whether that card carries a strategy. A row
  // in Campaign Cards is not the same thing as a usable card: 15 of 16 existing
  // cards have empty depth columns, and a card with no Core Message transfers
  // nothing.
  readCards: function() {
    var sheetName = CONFIG.CAMPAIGN_CARDS_SHEET_NAME;
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);

    if (!sheet) {
      throw new Error('Sheet "' + sheetName + '" not found.');
    }

    var lastRow = sheet.getLastRow();
    var cards = {};

    if (lastRow < CONFIG.DATA_START_ROW) {
      return cards;
    }

    for (var row = CONFIG.DATA_START_ROW; row <= lastRow; row++) {
      var data = SheetSchema.getRowData(row, sheetName);
      var name = String(data['Campaign Name'] || '').trim();

      if (!name) {
        continue;
      }

      // The twelve strategy fields are what the Content Pipeline actually looks
      // up. A card missing them is a name, not a strategy.
      var strategyFields = [
        'Campaign Philosophy', 'Core Message', 'Trust Promise',
        'Content Pillars', 'Target Audience', 'CTA Strategy'
      ];
      var filled = 0;

      for (var f = 0; f < strategyFields.length; f++) {
        if (String(data[strategyFields[f]] || '').trim()) {
          filled++;
        }
      }

      cards[name.toLowerCase()] = {
        name: name,
        row: row,
        status: String(data['Status'] || '').trim(),
        serviceLevel: String(data['Service Level'] || '').trim(),
        group: String(data['Umbrella Campaign'] || '').trim(),
        subBrand: String(data['Sub-Brand'] || '').trim(),
        targetPosts: parseInt(data['Target Posts'], 10) || null,
        priority: String(data['Priority'] || '').trim(),
        knowledgeSource: String(data['Knowledge Source'] || '').trim(),
        strategyFilled: filled,
        strategyTotal: strategyFields.length,
        usable: filled >= 4
      };
    }

    return cards;
  },

  // -------------------------------------------------------------- the guard

  // Runs before anything is planned. This is the check whose absence produced
  // the 67% defect: a campaign named in a brief but absent from Campaign Cards
  // used to be scheduled anyway, and the failure only became visible three
  // workers later as invented strategy.
  checkCampaigns: function(names, cards) {
    var missing = [];
    var thin = [];
    var inactive = [];
    var ready = [];

    for (var i = 0; i < names.length; i++) {
      var name = String(names[i]).trim();

      if (!name) {
        continue;
      }

      var card = cards[name.toLowerCase()];

      if (!card) {
        missing.push(name);
        continue;
      }

      if (card.status && card.status.toLowerCase() !== 'active') {
        inactive.push(name + ' (Status: ' + card.status + ')');
        continue;
      }

      if (!card.usable) {
        thin.push(name + ' (' + card.strategyFilled + ' of ' +
          card.strategyTotal + ' strategy fields)');
        continue;
      }

      ready.push(card);
    }

    return { ready: ready, missing: missing, thin: thin, inactive: inactive };
  },

  // ------------------------------------------------------------- the brief

  // What the brief leaves open. Asked before planning rather than resolved by
  // assumption — the assumption is what produced a plan nobody could use.
  openQuestions: function(brief, check) {
    var questions = [];

    if (!brief.days) {
      questions.push('How many days should the plan cover?');
    }

    if (!brief.pages || !brief.pages.length) {
      questions.push('Which pages — INSAN, Future, Delta, or some of them?');
    }

    if (!brief.postsPerDay) {
      questions.push('How many posts per page per day? ' +
        'PROJECT_DECISIONS caps this at 3 and recommends 1.5–2.');
    }

    if (check.missing.length) {
      questions.push(
        check.missing.length + ' campaign' +
        (check.missing.length === 1 ? ' has' : 's have') + ' no card: ' +
        check.missing.join(', ') + '. Build the card first, or drop ' +
        (check.missing.length === 1 ? 'it' : 'them') + ' from this plan?'
      );
    }

    if (check.thin.length) {
      questions.push(
        'Cards with almost no strategy: ' + check.thin.join(', ') +
        '. Scheduling these produces posts written from nothing. ' +
        'Rebuild the cards first, or plan around them?'
      );
    }

    if (!brief.objective) {
      questions.push('What is this cycle for — awareness, bookings, trust, ' +
        'recruitment? It decides the funnel mix.');
    }

    return questions;
  },

  // -------------------------------------------------------------- planning

  _dateFor: function(startDate, dayIndex) {
    var d = new Date(startDate.getTime());
    d.setDate(d.getDate() + dayIndex);
    return d;
  },

  _buildPrompt: function(brief, check, existing) {
    var config = this._config();
    var folderId = PropertiesService.getScriptProperties()
      .getProperty('PLANNING_PROMPTS_FOLDER_ID') ||
      CONFIG.PLANNING_PROMPTS_FOLDER_ID || CONFIG.PROMPTS_FOLDER_ID;

    var manual = DriveLoader.loadMarkdown(config.promptFile, folderId);

    if (!manual) {
      throw new Error(
        'Could not load ' + config.promptFile + '. Put it in the prompts ' +
        'folder, or set PLANNING_PROMPTS_FOLDER_ID in Script Properties.'
      );
    }

    var decisions = DriveLoader.loadMarkdown('PROJECT_DECISIONS.md',
      CONFIG.DOCS_FOLDER_ID) || '[not loaded]';
    var structure = DriveLoader.loadMarkdown('PROJECT_STRUCTURE.md',
      CONFIG.DOCS_FOLDER_ID) || '[not loaded]';

    // The registry's Hospitals column is the only place that states which
    // hospital actually runs each entity, and this worker decides which page
    // every post lands on. Nine centres operate at Delta alone; the card's
    // Sub-Brand is the planner's only other signal and it is written by a model
    // from prose. Putting a Delta-only centre on the Future page advertises a
    // service that hospital does not have, and nothing downstream re-checks it.
    var registry = DriveLoader.loadMarkdown('ENTITY_REGISTRY.md',
      CONFIG.DOCS_FOLDER_ID) || '[not loaded]';

    var staticPart = [
      'You are executing inside the INSAN Healthcare AI Operating System.',
      'Worker: ' + this.WORKER_NAME,
      '',
      'You turn an operator brief into a publishing calendar.',
      'You schedule only campaigns that have a usable card. That has already',
      'been checked — every campaign you are given is eligible.',
      '',
      '=== YOUR TRAINING MANUAL ===',
      '',
      manual,
      '',
      '=== END OF TRAINING MANUAL ===',
      '',
      '=== PROJECT DOCUMENT: PROJECT_DECISIONS.md ===',
      decisions,
      '',
      '=== PROJECT DOCUMENT: PROJECT_STRUCTURE.md ===',
      structure,
      '',
      '=== PROJECT DOCUMENT: ENTITY_REGISTRY.md ===',
      registry,
      '',
      'The registry\'s Hospitals column is binding. Never schedule a campaign',
      'on a hospital page the registry does not list for that entity.',
      '',
      '=== END OF PROJECT DOCUMENTATION ==='
    ].join('\n');

    var campaignLines = [];
    for (var i = 0; i < check.ready.length; i++) {
      var c = check.ready[i];
      campaignLines.push(
        '- ' + c.name +
        ' | level: ' + (c.serviceLevel || 'unspecified') +
        ' | group: ' + (c.group || 'unspecified') +
        ' | sub-brand: ' + (c.subBrand || 'any') +
        (c.targetPosts ? ' | target posts: ' + c.targetPosts : '') +
        (c.priority ? ' | priority: ' + c.priority : '')
      );
    }

    var existingLines = [];
    for (var e = 0; e < Math.min(existing.length, 40); e++) {
      existingLines.push('- ' + existing[e]);
    }

    var dynamicPart = [
      '=== THE BRIEF ===',
      '',
      'duration      : ' + brief.days + ' days, starting ' + brief.startText,
      'pages         : ' + brief.pages.join(', '),
      'posts per day : ' + brief.postsPerDay + ' per page',
      'total slots   : ' + (brief.days * brief.pages.length * brief.postsPerDay),
      'objective     : ' + (brief.objective || 'not stated'),
      'emphasis      : ' + (brief.emphasis || 'none stated'),
      '',

      // What the system could not see at all before: whether this window
      // overlaps a period that changes what is worth publishing. A plan made
      // blind to Ramadan is a normal month scheduled over the highest-attention
      // window of the year. (Audit B, B10 — improvement I5.)
      EventsCalendar.briefBlock(brief.startDate, brief.days),
      '',
      '=== CAMPAIGNS YOU MAY SCHEDULE ===',
      '',
      'These all have a usable card. Nothing else may appear in the plan.',
      '',
      campaignLines.join('\n'),
      '',
      '=== ALREADY SCHEDULED ===',
      '',
      existingLines.length
        ? 'Recently scheduled, so the plan does not repeat them immediately:\n' +
          existingLines.join('\n')
        : 'Nothing scheduled yet.',
      '',
      '=== OUTPUT FORMAT ===',
      '',
      'Return a single valid JSON object. No markdown fences, no text around it.',
      '',
      '{',
      '  "plan": [',
      '    {',
      '      "day": 1,',
      '      "slot": 1,',
      '      "page": "INSAN | Future | Delta",',
      '      "campaign": "exact campaign name from the list above",',
      '      "reason": "one short clause on why here"',
      '    }',
      '  ],',
      '  "notes": "anything the operator should know about this plan"',
      '}',
      '',
      'Produce exactly ' + (brief.days * brief.pages.length * brief.postsPerDay) +
        ' entries — one per slot.',
      'Use only campaign names from the list. A name not on the list is a',
      'campaign with no strategy behind it, and scheduling it is the defect',
      'this worker exists to prevent.',
      '',
      '=== END OF OUTPUT FORMAT ==='
    ].join('\n');

    return { prompt: staticPart + '\n\n' + dynamicPart, staticPart: staticPart };
  },

  // Recent calendar entries, so a plan does not immediately repeat what was
  // just published.
  readRecent: function(limit) {
    var sheetName = (this._config().CALENDAR_SHEET_NAME) || 'Content Calendar';
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);

    if (!sheet) {
      return [];
    }

    var lastRow = sheet.getLastRow();

    if (lastRow < CONFIG.DATA_START_ROW) {
      return [];
    }

    var from = Math.max(CONFIG.DATA_START_ROW, lastRow - (limit || 40) + 1);
    var recent = [];

    for (var row = from; row <= lastRow; row++) {
      var data = SheetSchema.getRowData(row, sheetName);
      var campaign = String(data['Campaign Name'] || '').trim();

      if (campaign) {
        recent.push(campaign + ' on ' + String(data['Page'] || '').trim());
      }
    }

    return recent;
  },

  // --------------------------------------------------------------- writing

  // Which brand's marks a post on this page carries, by default.
  //
  // Returns '' for a page with no brand set rather than guessing one. Branding
  // already refuses to place marks it cannot justify, and a wrong logo on a real
  // hospital's post is worse than no logo.
  brandFor: function(page) {
    var name = String(page == null ? '' : page).trim();
    if (!name) return '';

    var sets = ((CONFIG.BRANDING || {}).BRAND_SETS) || {};

    if (sets.hasOwnProperty(name)) return name;

    // Case-insensitive, because the page vocabulary and the brand sets are
    // maintained in two places and 'delta' should not cost a post its logos.
    for (var key in sets) {
      if (sets.hasOwnProperty(key) && key.toLowerCase() === name.toLowerCase()) {
        return key;
      }
    }

    Logger.log('PLANNER | page "' + name + '" has no brand set — Hospital Brand ' +
      'left blank, and the artwork for these rows will carry no marks until it ' +
      'is filled in.');

    return '';
  },

  write: function(plan, brief) {
    var sheetName = (this._config().CALENDAR_SHEET_NAME) || 'Content Calendar';
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);

    if (!sheet) {
      throw new Error('Sheet "' + sheetName + '" not found.');
    }

    var startRow = Math.max(sheet.getLastRow() + 1, CONFIG.DATA_START_ROW);
    var written = 0;

    // One id for the whole run. The calendar accumulates cycle after cycle and
    // dates alone cannot separate them — two cycles can overlap, and a replanned
    // cycle produces a second set of rows for the same days. This is what later
    // tells the portfolio critic which rows are one plan, and what tells the
    // archiver which rows finished together.
    var batchId = Batches.newId();

    for (var i = 0; i < plan.length; i++) {
      var entry = plan[i];
      var row = startRow + i;
      var day = parseInt(entry.day, 10) || 1;

      SheetWriter.writeCell(row, Batches.COLUMN, batchId, sheetName);
      SheetWriter.writeCell(row, 'Day',
        this._dateFor(brief.startDate, day - 1), sheetName);
      SheetWriter.writeCell(row, 'Post Slot', entry.slot || 1, sheetName);
      SheetWriter.writeCell(row, 'Status', 'Planned', sheetName);
      SheetWriter.writeCell(row, 'Calendar ID',
        'CAL-' + Utilities.formatDate(this._dateFor(brief.startDate, day - 1),
          Session.getScriptTimeZone(), 'yyyyMMdd') + '-' + (entry.slot || 1) +
        '-' + String(entry.page || '').substring(0, 3).toUpperCase(), sheetName);
      SheetWriter.writeCell(row, 'Page', entry.page, sheetName);
      SheetWriter.writeCell(row, 'Campaign Name', entry.campaign, sheetName);

      // Hospital Brand, defaulted from the page.
      //
      // Nothing used to write this column, and Transfer carries it all the way
      // to the Visual Pipeline, where `Branding.marksFor` reads it to decide
      // which logos go on the artwork. An unrecognised brand gets NO marks
      // rather than the wrong ones — which is correct, and means a blank here
      // produced unbranded artwork on every post, reported as one log line.
      //
      // The page is the right default because CONFIG.BRANDING.BRAND_SETS is
      // keyed by exactly the page names. It is a default, not a rule: a post
      // that runs on the INSAN page about Future is a real case, and the
      // operator changes the cell.
      SheetWriter.writeCell(row, 'Hospital Brand',
        this.brandFor(entry.page), sheetName);

      // What this cycle is for, stamped on every row of the batch.
      //
      // The operator states an objective when they plan — "this month is about
      // the new clinic, not bookings" — and the planner used it to choose the
      // slots and then dropped it. It reached no column, so the Content
      // Strategy Worker never saw it and decided each row's Content Objective
      // from the campaign card alone. The card describes what the campaign
      // permanently IS; the objective is what this particular cycle WANTS, and
      // those are different questions that were being answered by one source.
      //
      // Per row rather than per batch because a row travels alone: Transfer
      // carries it into the pipeline, and W3 reads one row at a time and never
      // sees the batch it belongs to.
      SheetWriter.writeCell(row, 'Cycle Objective',
        String(brief.objective || '').trim(), sheetName);

      if (entry.group) {
        SheetWriter.writeCell(row, 'Campaign Group', entry.group, sheetName);
      }

      written++;
    }

    return { startRow: startRow, written: written, batchId: batchId };
  },

  // -------------------------------------------------------------- the entry

  plan: function(brief) {
    // Identifiers from Script Properties where set, CONFIG.gs otherwise.
    // Idempotent; see ConfigResolver (Audit A, F17).
    ConfigResolver.apply();

    var startTime = new Date().getTime();
    var config = this._config();

    var cards = this.readCards();
    var check = this.checkCampaigns(brief.campaigns || Object.keys(cards)
      .map(function(k) { return cards[k].name; }), cards);

    if (!check.ready.length) {
      throw new Error(
        'Nothing can be scheduled. No campaign in this brief has a usable card.\n\n' +
        (check.missing.length ? 'No card at all: ' + check.missing.join(', ') + '\n' : '') +
        (check.thin.length ? 'Card with almost no strategy: ' + check.thin.join(', ') + '\n' : '') +
        (check.inactive.length ? 'Not Active: ' + check.inactive.join(', ') + '\n' : '') +
        '\nBuild the cards first — AI Workers → Planning → Build Campaign Card.'
      );
    }

    var built = this._buildPrompt(brief, check, this.readRecent(40));

    var response = AIProvider.call(built.prompt, {
      temperature: config.temperature,
      provider: config.provider || undefined,
      model: config.model || undefined,
      cachePrefix: built.staticPart
    });

    var parsed = this._parse(response.text);
    var plan = parsed.plan || [];

    // The model was told to use only eligible names. Verified rather than
    // trusted — this is the guard, and a guard that is not enforced in code is
    // a request.
    var allowed = {};
    for (var a = 0; a < check.ready.length; a++) {
      allowed[check.ready[a].name.toLowerCase()] = check.ready[a];
    }

    var rejected = [];
    var accepted = [];

    for (var p = 0; p < plan.length; p++) {
      var card = allowed[String(plan[p].campaign || '').trim().toLowerCase()];

      if (!card) {
        rejected.push(plan[p].campaign);
        continue;
      }

      plan[p].group = card.group;
      accepted.push(plan[p]);
    }

    var result = this.write(accepted, brief);
    var runtime = new Date().getTime() - startTime;

    Logger.logSuccess(
      this.WORKER_NAME, result.startRow, runtime,
      response.inputTokens, response.outputTokens,
      'Planned ' + accepted.length + ' slots from row ' + result.startRow +
      ' | ' + result.batchId +
      ' | Eligible campaigns: ' + check.ready.length +
      (check.missing.length ? ' | Refused (no card): ' + check.missing.join(', ') : '') +
      (rejected.length ? ' | Dropped ineligible: ' + rejected.join(', ') : '') +
      ' | ' + AIProvider.cacheSummary(response)
    );

    return {
      startRow: result.startRow,
      written: accepted.length,
      batchId: result.batchId,
      rejected: rejected,
      check: check,
      notes: parsed.notes || ''
    };
  },

  _parse: function(text) {
    var cleaned = String(text).trim();

    if (cleaned.indexOf('```') === 0) {
      cleaned = cleaned.replace(/^```(json)?/, '').replace(/```$/, '').trim();
    }

    var first = cleaned.indexOf('{');
    var last = cleaned.lastIndexOf('}');

    if (first === -1 || last <= first) {
      throw new Error(
        'The planner returned no JSON. Response began: ' + cleaned.substring(0, 200)
      );
    }

    return JSON.parse(cleaned.substring(first, last + 1));
  }
};

// ---------------------------------------------------------------------------
// END SOURCE FILE: PlannerRunner.gs
// ---------------------------------------------------------------------------


// ---------------------------------------------------------------------------
// BEGIN SOURCE FILE: PortfolioCritic.gs
// ---------------------------------------------------------------------------
// PORTFOLIO CRITIC — I1
//
// Every worker in this system sees exactly one row. That is correct for the
// decisions each worker owns, and it is why nothing could see that 88% of
// finished posts opened with one of five constructions, that 79% were
// carousels, that the funnel had one stage, or that the same campaign ran on
// two pages in the same week. Each post, read alone, was good.
//
// Those are not four defects. They are one blindness expressed in four columns.
// (Audit B, findings B1, B2, B4, B5 and B6.)
//
// This reads the whole plan once, before production spends anything on it.
//
//   one call per plan          ~15,000 tokens
//   against 132 rows           ~10,800,000 tokens
//
// Arithmetic is settled in code and judgement is left to the model. The same
// division AssetIntegrity applies before Visual QA: a grader asked about
// composition reports on composition, and a model asked to count will
// approximate. Counting is not a judgement call.

var PortfolioCritic = {

  WORKER_NAME: 'PORTFOLIO_CRITIC',

  _config: function() {
    return CONFIG.PORTFOLIO_CRITIC || {};
  },

  // ------------------------------------------------------------- measuring

  _firstLine: function(text) {
    var value = String(text || '').trim();

    if (!value) {
      return '';
    }

    var lines = value.split('\n');

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      if (line) {
        return line;
      }
    }

    return '';
  },

  // The five constructions Audit B measured across the finished posts. Kept
  // because they are the known failure, not because they are the only one —
  // see _openingStems, which finds formulas nobody has named yet.
  // \b is defined on [A-Za-z0-9_], so it never matches at the edge of an Arabic
  // word — every pattern written with it silently matched nothing. The boundary
  // here is "not followed by another Arabic letter", which is the real one.
  _ARABIC_BOUNDARY: '(?![\\u0600-\\u06FF])',

  _startsWith: function(text, words) {
    return new RegExp('^(' + words.join('|') + ')' + this._ARABIC_BOUNDARY).test(text);
  },

  _classifyOpening: function(line) {
    if (!line) {
      return 'none';
    }

    var text = line.trim();

    if (/^["'«“”„‘]/.test(text)) {
      return 'quotation';
    }

    if (this._startsWith(text,
        ['أصعب', 'اصعب', 'أهم', 'اهم', 'أخطر', 'اخطر', 'أقوى', 'اقوى',
         'أكتر', 'أكثر', 'اكتر', 'أجمل', 'اجمل', 'أسوأ', 'اسوأ', 'أطول', 'اطول'])) {
      return 'superlative';
    }

    if (this._startsWith(text,
        ['لما', 'لمّا', 'قبل ما', 'بعد ما', 'أول ما', 'اول ما',
         'في اللحظة', 'ساعة ما', 'وقت ما', 'لحظة', 'يوم ما'])) {
      return 'temporal';
    }

    if (this._startsWith(text, ['مش', 'ليس', 'ليست', 'مو']) ||
        /(مش|ليس)\s+مجرد/.test(text)) {
      return 'negation';
    }

    if (/[?؟]/.test(text) ||
        this._startsWith(text,
          ['هل', 'إيه', 'ايه', 'ليه', 'إزاي', 'ازاي', 'ماذا', 'كيف', 'لماذا',
           'مين', 'مَن', 'إمتى', 'امتى', 'فين', 'أمتى'])) {
      return 'question';
    }

    return 'other';
  },

  // The first two words of every opening, counted. This catches the formula
  // that has not been named yet — the five patterns above were derived from one
  // sample of 33 posts and a portfolio will invent new ones.
  _openingStems: function(openings) {
    var stems = {};

    for (var i = 0; i < openings.length; i++) {
      var words = String(openings[i]).replace(/[«»"'“”.,!?؟]/g, ' ')
        .split(/\s+/).filter(function(w) { return w; });

      if (words.length < 2) {
        continue;
      }

      var stem = words[0] + ' ' + words[1];
      stems[stem] = (stems[stem] || 0) + 1;
    }

    return stems;
  },

  _count: function(values) {
    var counts = {};

    for (var i = 0; i < values.length; i++) {
      var key = String(values[i] || '').trim() || '(blank)';
      counts[key] = (counts[key] || 0) + 1;
    }

    return counts;
  },

  _topEntries: function(counts, limit, minimum) {
    var entries = [];

    for (var key in counts) {
      if (counts[key] >= (minimum || 1)) {
        entries.push({ key: key, count: counts[key] });
      }
    }

    entries.sort(function(a, b) { return b.count - a.count; });
    return entries.slice(0, limit || 10);
  },

  // Reads the plan and settles everything a number can settle.
  measure: function(startRow, endRow) {
    var sheetName = CONFIG.SHEET_NAME;
    var rows = [];

    for (var row = startRow; row <= endRow; row++) {
      var data = SheetSchema.getRowData(row, sheetName);

      // A row with no campaign is an empty calendar slot, not a plan entry.
      if (!String(data['Campaign Name'] || '').trim()) {
        continue;
      }

      var copy = String(data['Creative Director Post Copy'] || '').trim() ||
        String(data['Post Copy (AI)'] || '').trim();

      rows.push({
        row: row,
        campaign: String(data['Campaign Name'] || '').trim(),
        page: String(data['Publishing Page'] || '').trim(),
        date: data['Publishing Date'],
        format: String(data['Content Format'] || '').trim(),
        type: String(data['Content Type'] || '').trim(),
        funnel: String(data['Content Funnel Stage'] || '').trim(),
        objective: String(data['Content Objective'] || '').trim(),
        cta: String(data['CTA Strategy'] || '').trim(),
        opening: this._firstLine(copy),
        alternative: this._firstLine(data['Alternative Opening']),
        hasCopy: !!copy
      });
    }

    var written = rows.filter(function(r) { return r.hasCopy; });
    var openings = written.map(function(r) { return r.opening; });

    // Openings by construction.
    var formulaCounts = {};
    for (var i = 0; i < openings.length; i++) {
      var kind = this._classifyOpening(openings[i]);
      formulaCounts[kind] = (formulaCounts[kind] || 0) + 1;
    }

    var formulaic = 0;
    for (var kind2 in formulaCounts) {
      if (kind2 !== 'other' && kind2 !== 'none') {
        formulaic += formulaCounts[kind2];
      }
    }

    // Openings that are the same, or nearly. Near-duplicates matter more than
    // exact ones: r14 and r17 in the audit were not identical, they were the
    // same post wearing two words of difference, on two pages of one ecosystem.
    var seen = {};
    var duplicates = [];

    for (var d = 0; d < written.length; d++) {
      var head = written[d].opening.substring(0, 30);

      if (!head) {
        continue;
      }

      if (seen[head] !== undefined) {
        duplicates.push({
          rows: [seen[head].row, written[d].row],
          pages: [seen[head].page, written[d].page],
          opening: written[d].opening.substring(0, 70)
        });
      } else {
        seen[head] = written[d];
      }
    }

    // The same campaign twice on one page on one day, which the planner is
    // supposed to prevent and currently nothing checks.
    var slots = {};
    var clashes = [];

    for (var c = 0; c < rows.length; c++) {
      var day = rows[c].date instanceof Date
        ? Utilities.formatDate(rows[c].date, Session.getScriptTimeZone(), 'yyyy-MM-dd')
        : String(rows[c].date || '').trim();

      if (!day || !rows[c].page) {
        continue;
      }

      var slotKey = day + ' | ' + rows[c].page + ' | ' + rows[c].campaign;

      if (slots[slotKey]) {
        clashes.push({ day: day, page: rows[c].page, campaign: rows[c].campaign });
      } else {
        slots[slotKey] = true;
      }
    }

    return {
      total: rows.length,
      written: written.length,
      unwritten: rows.length - written.length,
      formulas: formulaCounts,
      formulaicShare: written.length
        ? Math.round((formulaic / written.length) * 100) : 0,
      stems: this._topEntries(this._openingStems(openings), 8, 2),
      duplicates: duplicates,
      formats: this._count(rows.map(function(r) { return r.format; })),
      types: this._count(rows.map(function(r) { return r.type; })),
      funnel: this._count(rows.map(function(r) { return r.funnel; })),
      objectives: this._count(rows.map(function(r) { return r.objective; })),
      ctas: this._count(rows.map(function(r) { return r.cta; })),
      pages: this._count(rows.map(function(r) { return r.page; })),
      campaigns: this._count(rows.map(function(r) { return r.campaign; })),
      clashes: clashes,
      withAlternative: written.filter(function(r) { return r.alternative; }).length
    };
  },

  // --------------------------------------------------------------- reading

  _dominant: function(counts, total) {
    var top = this._topEntries(counts, 1)[0];

    if (!top || !total) {
      return null;
    }

    return { key: top.key, count: top.count, share: Math.round((top.count / total) * 100) };
  },

  // Everything a number can answer, answered — so the model spends its
  // attention on what the numbers mean rather than on producing them.
  _digest: function(m) {
    var lines = [];
    var self = this;

    function distribution(label, counts, total) {
      var entries = self._topEntries(counts, 8);
      var parts = [];

      for (var i = 0; i < entries.length; i++) {
        parts.push(entries[i].key + ' ' + entries[i].count +
          ' (' + Math.round((entries[i].count / total) * 100) + '%)');
      }

      lines.push(label + ': ' + parts.join(' · '));
    }

    lines.push('PLAN SIZE');
    lines.push('rows in plan: ' + m.total + ' | copy written: ' + m.written +
      ' | not yet written: ' + m.unwritten);
    lines.push('');

    lines.push('OPENINGS  (measured across the ' + m.written + ' rows that have copy)');
    lines.push('share opening with a known formula: ' + m.formulaicShare + '%');
    distribution('by construction', m.formulas, Math.max(m.written, 1));

    if (m.stems.length) {
      var stemParts = [];
      for (var s = 0; s < m.stems.length; s++) {
        stemParts.push('"' + m.stems[s].key + '" ×' + m.stems[s].count);
      }
      lines.push('repeated opening stems: ' + stemParts.join(' · '));
    } else {
      lines.push('repeated opening stems: none');
    }

    if (m.duplicates.length) {
      lines.push('near-identical openings: ' + m.duplicates.length);
      for (var d = 0; d < Math.min(m.duplicates.length, 6); d++) {
        var dup = m.duplicates[d];
        lines.push('  rows ' + dup.rows.join(' and ') +
          ' [' + dup.pages.join(' / ') + ']: "' + dup.opening + '"');
      }
    } else {
      lines.push('near-identical openings: none');
    }

    lines.push('second openings available: ' + m.withAlternative + ' of ' + m.written);
    lines.push('');

    lines.push('SHAPE OF THE PLAN');
    distribution('format', m.formats, m.total);
    distribution('content type', m.types, m.total);
    distribution('funnel stage', m.funnel, m.total);
    distribution('objective', m.objectives, m.total);
    distribution('CTA', m.ctas, m.total);
    lines.push('');

    lines.push('DISTRIBUTION');
    distribution('page', m.pages, m.total);
    distribution('campaign', m.campaigns, m.total);

    if (m.clashes.length) {
      lines.push('same campaign twice on one page on one day: ' + m.clashes.length);
      for (var c = 0; c < Math.min(m.clashes.length, 6); c++) {
        lines.push('  ' + m.clashes[c].day + ' — ' + m.clashes[c].page +
          ' — ' + m.clashes[c].campaign);
      }
    } else {
      lines.push('same campaign twice on one page on one day: none');
    }

    return lines.join('\n');
  },

  _buildPrompt: function(digest) {
    // This worker loaded no document of any kind — its whole prompt was the
    // literal below. That was survivable while it only counted repetition, and
    // it is not survivable for the judgement it is actually asked to make:
    // "INSAN, Future and Delta build one brand together" appears in its own
    // instructions, and nothing told it what that sentence means.
    var brand = DriveLoader.loadMarkdown('MASTER_BRAND_ARCHITECTURE.md',
      CONFIG.DOCS_FOLDER_ID) || '[not loaded]';
    var structure = DriveLoader.loadMarkdown('PROJECT_STRUCTURE.md',
      CONFIG.DOCS_FOLDER_ID) || '[not loaded]';

    var staticPart = [
      'You are executing inside the INSAN Healthcare AI Operating System.',
      'Worker: ' + this.WORKER_NAME,
      '',
      '=== PROJECT DOCUMENT: MASTER_BRAND_ARCHITECTURE.md ===',
      brand,
      '',
      '=== PROJECT DOCUMENT: PROJECT_STRUCTURE.md ===',
      structure,
      '',
      'You are the only worker that sees the whole plan.',
      '',
      'Every other worker in this system reads one row. That is deliberate and',
      'it is why nobody noticed that 88% of finished posts opened with one of',
      'five constructions, that 79% were carousels, and that the funnel had one',
      'stage. Each post, read alone, was good. The feed was formulaic.',
      '',
      'You are given measurements, not posts. The counting is already done and',
      'it is correct — do not re-derive it, do not estimate, and do not dispute',
      'a number. Your job is what the numbers mean and what to do about them.',
      '',
      '=== WHAT MATTERS ===',
      '',
      'A reader meets this plan as a feed, in order, at two or three posts a',
      'day. Judge it the way they will experience it:',
      '',
      '- Repetition is the primary defect. Two posts that open the same way on',
      '  two pages of one ecosystem are one post published twice.',
      '- Concentration is the second. A plan that is 79% one format is a plan',
      '  a reader stops seeing.',
      '- A funnel with one stage never asks for anything, or asks every time.',
      '- A campaign clustered into three consecutive days is exhausted by day',
      '  four and absent for the rest of the month.',
      '- Balance across the three pages is an ecosystem question, not a',
      '  scheduling one: INSAN, Future and Delta build one brand together.',
      '',
      'Be specific and be brief. Name the rows. An observation that does not',
      'name what to change is not worth the call.',
      '',
      'Do not praise the plan. If something is genuinely fine, say nothing',
      'about it — the operator is reading this to find what needs work.',
      '',
      '=== OUTPUT FORMAT ===',
      '',
      'Return a single valid JSON object. No markdown fences, no text around it.',
      '',
      '{',
      '  "verdict": "one sentence: is this plan publishable as it stands?",',
      '  "findings": [',
      '    {',
      '      "severity": "high | medium | low",',
      '      "what": "the problem, in one sentence, with the number",',
      '      "where": "rows or pages affected",',
      '      "fix": "the specific change to make"',
      '    }',
      '  ],',
      '  "strongest": "the single most valuable change, if only one is made"',
      '}',
      '',
      'At most six findings. Fewer is better if fewer are real.',
      '',
      '=== END OF OUTPUT FORMAT ==='
    ].join('\n');

    var dynamicPart = [
      '=== MEASUREMENTS ===',
      '',
      digest,
      '',
      '=== END OF MEASUREMENTS ==='
    ].join('\n');

    return { prompt: staticPart + '\n\n' + dynamicPart, staticPart: staticPart };
  },

  // -------------------------------------------------------------- the entry

  review: function(startRow, endRow) {
    // Identifiers from Script Properties where set, CONFIG.gs otherwise.
    // Idempotent; see ConfigResolver (Audit A, F17).
    ConfigResolver.apply();

    var startTime = new Date().getTime();
    var config = this._config();

    var measured = this.measure(startRow, endRow);

    if (!measured.total) {
      throw new Error(
        'No plan rows found between ' + startRow + ' and ' + endRow +
        '. A row needs a Campaign Name to count as part of the plan.'
      );
    }

    var digest = this._digest(measured);
    var built = this._buildPrompt(digest);

    var response = AIProvider.call(built.prompt, {
      temperature: config.temperature,
      provider: config.provider || undefined,
      model: config.model || undefined,
      cachePrefix: built.staticPart
    });

    var parsed = this._parse(response.text);
    var runtime = new Date().getTime() - startTime;

    Logger.logSuccess(
      this.WORKER_NAME, startRow, runtime,
      response.inputTokens, response.outputTokens,
      'Reviewed ' + measured.total + ' rows (' + measured.written + ' with copy) | ' +
      'Formulaic openings: ' + measured.formulaicShare + '% | ' +
      'Findings: ' + (parsed.findings || []).length +
      ' | ' + AIProvider.cacheSummary(response)
    );

    return { measured: measured, digest: digest, review: parsed };
  },

  _parse: function(text) {
    var cleaned = String(text).trim();

    if (cleaned.indexOf('```') === 0) {
      cleaned = cleaned.replace(/^```(json)?/, '').replace(/```$/, '').trim();
    }

    var first = cleaned.indexOf('{');
    var last = cleaned.lastIndexOf('}');

    if (first === -1 || last <= first) {
      throw new Error(
        'The portfolio critic returned no JSON. Response began: ' +
        cleaned.substring(0, 200)
      );
    }

    return JSON.parse(cleaned.substring(first, last + 1));
  }
};

// ---------------------------------------------------------------------------
// END SOURCE FILE: PortfolioCritic.gs
// ---------------------------------------------------------------------------


// ---------------------------------------------------------------------------
// BEGIN SOURCE FILE: EventsCalendar.gs
// ---------------------------------------------------------------------------
// ================================
// EGYPTIAN EVENTS CALENDAR  (improvement I5)
//
// Nothing in this system knew a season was coming. Audit B recorded it as B10:
// no way to plan around Ramadan, Eid or awareness days — the highest-attention
// windows of the year in this market, and the only content that genuinely
// cannot be produced retrospectively. Seasonal content needs its clinical
// review, its material and its timing arranged before the period begins.
//
// This answers one question: **what falls inside, or just before, the window
// being planned?** The planner is told, in its brief, and the operator can ask
// directly from the menu.
//
// It never computes a Hijri date. Ramadan and Eid are entered by hand per year
// in CONFIG.EVENTS_CALENDAR.MOVEABLE, and a year with no entry is reported as
// missing rather than estimated — a Ramadan date one day out would misplan a
// month of content about medication timing.
// ================================

var EventsCalendar = {

  _config: function() {
    return CONFIG.EVENTS_CALENDAR || {};
  },

  // ------------------------------------------------------------------ dates

  _startOfDay: function(date) {
    var d = new Date(date.getTime());
    d.setHours(0, 0, 0, 0);
    return d;
  },

  _addDays: function(date, days) {
    var d = new Date(date.getTime());
    d.setDate(d.getDate() + days);
    return d;
  },

  _parseISO: function(text) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(text || '').trim());

    if (!m) {
      return null;
    }

    var d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    d.setHours(0, 0, 0, 0);

    // Rejects 2027-02-31 and similar, which JavaScript would silently roll over
    // into March.
    if (d.getFullYear() !== Number(m[1]) || d.getMonth() !== Number(m[2]) - 1 ||
        d.getDate() !== Number(m[3])) {
      return null;
    }

    return d;
  },

  _format: function(date) {
    var m = ('0' + (date.getMonth() + 1)).slice(-2);
    var d = ('0' + date.getDate()).slice(-2);
    return date.getFullYear() + '-' + m + '-' + d;
  },

  // A fixed event's window in a given year. Windows that cross the year end —
  // exam season runs from December into January — produce a range whose end is
  // in the following year, which is why the end is built from the start rather
  // than from the same year.
  _fixedWindow: function(event, year) {
    var start = new Date(year, event.month - 1, event.day);
    start.setHours(0, 0, 0, 0);

    if (!event.endMonth) {
      return { start: start, end: start };
    }

    var endYear = (event.endMonth < event.month) ? year + 1 : year;
    var end = new Date(endYear, event.endMonth - 1, event.endDay || event.day);
    end.setHours(0, 0, 0, 0);

    return { start: start, end: end };
  },

  // ----------------------------------------------------------------- lookup

  // Everything relevant to a planning window: events inside it, and events
  // close enough after it that their lead time has already begun.
  //
  // Returns { events: [...], missing: [...] } — `missing` names moveable
  // events with no date recorded for a year the window touches, because a
  // planner that silently omits Ramadan is worse than one that says it does
  // not know when Ramadan is.
  forRange: function(startDate, days) {
    var config = this._config();

    if (!config.ENABLED) {
      return { events: [], missing: [] };
    }

    var windowStart = this._startOfDay(startDate);
    var windowEnd = this._addDays(windowStart, Math.max(0, (days || 1) - 1));
    var trailing = config.TRAILING_DAYS || 0;

    var years = {};
    years[windowStart.getFullYear()] = true;
    years[windowEnd.getFullYear()] = true;
    // A long lead time can reach back into the previous year's window.
    years[windowStart.getFullYear() - 1] = true;
    years[windowEnd.getFullYear() + 1] = true;

    var found = [];
    var missing = [];

    var fixed = config.FIXED || [];
    for (var i = 0; i < fixed.length; i++) {
      for (var year in years) {
        var window = this._fixedWindow(fixed[i], Number(year));
        var hit = this._relevance(window, windowStart, windowEnd, fixed[i], trailing);

        if (hit) {
          found.push(hit);
        }
      }
    }

    var moveable = config.MOVEABLE || [];
    for (var m = 0; m < moveable.length; m++) {
      for (var y in years) {
        var recorded = (moveable[m].dates || {})[String(y)];
        var start = recorded ? this._parseISO(recorded.start) : null;

        if (!start) {
          // Only worth reporting for years the window actually touches — the
          // ±1 years are scanned for lead time, not for completeness.
          if (Number(y) === windowStart.getFullYear() ||
              Number(y) === windowEnd.getFullYear()) {
            missing.push({ key: moveable[m].key, name: moveable[m].name, year: String(y) });
          }
          continue;
        }

        var end = recorded.end ? this._parseISO(recorded.end) : start;
        var moveHit = this._relevance(
          { start: start, end: end || start }, windowStart, windowEnd, moveable[m], trailing
        );

        if (moveHit) {
          found.push(moveHit);
        }
      }
    }

    // Nearest first — a period starting inside the window matters more than
    // one whose lead time has merely begun.
    found.sort(function(a, b) { return a.start.getTime() - b.start.getTime(); });

    return { events: this._dedupe(found), missing: missing };
  },

  // Is this event's window, or its lead-in, relevant to the planning window?
  _relevance: function(window, windowStart, windowEnd, event, trailing) {
    var leadStart = this._addDays(window.start, -(event.leadDays || 0));
    var effectiveEnd = this._addDays(window.end, trailing || 0);

    var overlaps = window.start <= windowEnd && effectiveEnd >= windowStart;
    var leadIn = !overlaps && leadStart <= windowEnd && window.start > windowEnd;

    if (!overlaps && !leadIn) {
      return null;
    }

    return {
      key: event.key,
      name: event.name,
      weight: event.weight || 'medium',
      start: window.start,
      end: window.end,
      startText: this._format(window.start),
      endText: this._format(window.end),
      state: overlaps ? 'in-window' : 'approaching',
      daysUntilStart: Math.round(
        (window.start.getTime() - windowStart.getTime()) / 86400000
      )
    };
  },

  _dedupe: function(events) {
    var seen = {};
    var out = [];

    for (var i = 0; i < events.length; i++) {
      var id = events[i].key + '|' + events[i].startText;
      if (!seen[id]) {
        seen[id] = true;
        out.push(events[i]);
      }
    }

    return out;
  },

  // ------------------------------------------------------------- for the AI

  // The block injected into the planner's brief. Deliberately says what is
  // missing as well as what is known: a planner told nothing about Ramadan
  // plans a normal month, which is the failure this exists to prevent.
  briefBlock: function(startDate, days) {
    var result = this.forRange(startDate, days);

    if (!result.events.length && !result.missing.length) {
      return '';
    }

    var lines = ['=== WHAT IS HAPPENING DURING THIS WINDOW ===', ''];

    if (result.events.length) {
      lines.push(
        'These periods fall inside the window being planned, or begin soon',
        'enough that content for them has to be planned now. A period changes',
        'what is worth publishing; it is not a decoration.',
        ''
      );

      for (var i = 0; i < result.events.length; i++) {
        var e = result.events[i];
        lines.push(
          '- ' + e.name +
          ' | ' + e.startText + (e.endText !== e.startText ? ' to ' + e.endText : '') +
          ' | ' + e.state +
          ' | importance: ' + e.weight
        );
      }

      lines.push(
        '',
        'Seasonal content belongs to the Seasonal Campaigns campaign and only',
        'where that campaign has a usable card. Do not reassign another',
        'campaign to a period — a medical campaign scheduled during Ramadan is',
        'still that campaign.'
      );
    }

    if (result.missing.length) {
      var names = [];
      for (var m = 0; m < result.missing.length; m++) {
        names.push(result.missing[m].name + ' (' + result.missing[m].year + ')');
      }

      lines.push(
        '',
        '⚠️ DATES NOT RECORDED: ' + names.join(', ') + '.',
        'These follow the Hijri calendar and are entered by hand. This system',
        'does not estimate them. If one of them falls inside this window, the',
        'plan will be wrong and nobody will notice until the period arrives —',
        'say so in your notes.'
      );
    }

    lines.push('', '=== END OF WINDOW CONTEXT ===');

    return lines.join('\n');
  },

  // ------------------------------------------------------- for the operator

  // Everything in the next N days, for the menu. Answers the question the
  // system could not answer at all before: what is coming that we should
  // already be preparing for?
  upcoming: function(days) {
    return this.forRange(new Date(), days || 90);
  }
};


// ================================
// MENU — AI Workers → Planning → What Is Coming
// ================================

function showUpcomingEvents() {
  var ui = SpreadsheetApp.getUi();
  var horizon = 90;

  try {
    var result = EventsCalendar.upcoming(horizon);
    var lines = ['The next ' + horizon + ' days', ''];

    if (!result.events.length) {
      lines.push('Nothing recorded in this window.');
    }

    for (var i = 0; i < result.events.length; i++) {
      var e = result.events[i];
      lines.push(
        (e.state === 'in-window' ? '• ' : '→ ') + e.name +
        '  ' + e.startText + (e.endText !== e.startText ? ' – ' + e.endText : '') +
        (e.daysUntilStart > 0 ? '  (in ' + e.daysUntilStart + ' days)' : '') +
        (e.weight === 'critical' || e.weight === 'high' ? '  [' + e.weight + ']' : '')
      );
    }

    if (result.missing.length) {
      lines.push('', '⚠️ Dates you have not entered yet:');

      for (var m = 0; m < result.missing.length; m++) {
        lines.push('   ' + result.missing[m].name + ' — ' + result.missing[m].year);
      }

      lines.push(
        '',
        'These follow the Hijri calendar and are confirmed by announcement, so',
        'the system will not estimate them. Add them to',
        'CONFIG.EVENTS_CALENDAR.MOVEABLE as YYYY-MM-DD.',
        '',
        'Ramadan needs the most notice: medication-timing content has to be',
        'written and clinically reviewed before the month starts.'
      );
    }

    ui.alert('What Is Coming', lines.join('\n'), ui.ButtonSet.OK);

  } catch (e) {
    ui.alert('What Is Coming', e.message || e.toString(), ui.ButtonSet.OK);
  }
}

// ---------------------------------------------------------------------------
// END SOURCE FILE: EventsCalendar.gs
// ---------------------------------------------------------------------------


// ---------------------------------------------------------------------------
// BEGIN SOURCE FILE: EntityRegistry.gs
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// END SOURCE FILE: EntityRegistry.gs
// ---------------------------------------------------------------------------


// ---------------------------------------------------------------------------
// BEGIN SOURCE FILE: Batches.gs
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// END SOURCE FILE: Batches.gs
// ---------------------------------------------------------------------------


// ---------------------------------------------------------------------------
// BEGIN SOURCE FILE: Transfer.gs
// ---------------------------------------------------------------------------
// ================================
// TRANSFER
//
// Moves a row from one tab to the next by key, as values.
//
// ------------------------------------------------------------------------
// WHY THIS EXISTS — the defect it replaces
//
// The workbook moved rows between tabs with position-bound formulas:
//
//   Content Pipeline  B2 = IF('Content Calendar'!D2:D1000="","",
//                            'Content Calendar'!D2:H1000)
//   Content Pipeline  G2 = IF('Campaign Cards'!O2:O1000="","",
//                            'Campaign Cards'!O2:Z1000)
//   Visual Pipeline   2,244 individual cells, each 'Content Pipeline'!<cell>
//
// Two array formulas anchored in row 2 fed the whole Content Pipeline, and the
// Visual Pipeline read the Content Pipeline one cell reference at a time.
//
// That makes ROW POSITION load-bearing across tabs, and it fails in the worst
// possible way — silently:
//
//   delete Content Calendar rows 2–50
//     → the array in Content Pipeline B2 re-renders from the new source range
//     → Content Pipeline row 2 now shows what used to be calendar row 51
//     → but S:AX on row 2 — everything the workers wrote — never moved
//     → every post's strategy is now paired with a different post's copy
//
// No #REF!. No error. Nothing in the sheet looks wrong. And deleting row 2
// itself destroys the array formula outright, so the transfer stops for good.
//
// The same coupling makes ordinary editing dangerous: a single row deleted by
// hand does this, with no code involved at all.
//
// ------------------------------------------------------------------------
// WHAT REPLACES IT
//
// Each tab owns its rows. A row is written once, as values, and is joined to
// its neighbours by a key it carries in a column:
//
//   Content Calendar ──Calendar ID──▶ Content Pipeline
//   Content Pipeline ──Content ID───▶ Visual Pipeline
//   Visual Pipeline  ──Content ID───▶ Ads Pipeline        (already like this)
//
// Ads Pipeline has always worked this way — written by AdsRunner, keyed on
// Content ID, no formulas. It is the only tab in the workbook with no
// positional coupling, and it is the model the others now follow.
//
// Transfers are idempotent: a row whose key is already present downstream is
// skipped, never duplicated. Running twice is a no-op, which is what makes it
// safe to run on a schedule or after every plan.
// ================================

var Transfer = {

  // ------------------------------------------------------------- plumbing

  _sheet: function(name) {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);

    if (!sheet) {
      throw new Error('Sheet "' + name + '" not found.');
    }

    return sheet;
  },

  // Every value already present in one column, as a lookup. Read in a single
  // call: asking row by row across a few hundred rows is what makes a transfer
  // outlast the execution budget.
  _existingKeys: function(sheetName, columnName) {
    var sheet = this._sheet(sheetName);
    var lastRow = sheet.getLastRow();
    var seen = {};

    if (lastRow < CONFIG.DATA_START_ROW) {
      return seen;
    }

    var map = SheetSchema._getColumnMap(sheetName);
    var column = map[columnName];

    if (!column) {
      throw new Error(
        'Sheet "' + sheetName + '" has no "' + columnName + '" column. ' +
        'Run Maintenance → Create Managed Columns.'
      );
    }

    var values = sheet
      .getRange(CONFIG.DATA_START_ROW, column, lastRow - CONFIG.DATA_START_ROW + 1, 1)
      .getValues();

    for (var i = 0; i < values.length; i++) {
      var key = String(values[i][0] || '').trim();

      if (key) {
        seen[key] = CONFIG.DATA_START_ROW + i;
      }
    }

    return seen;
  },

  // Reads a whole sheet once, as objects keyed by column name.
  _readAll: function(sheetName) {
    var sheet = this._sheet(sheetName);
    var lastRow = sheet.getLastRow();
    var lastColumn = sheet.getLastColumn();

    if (lastRow < CONFIG.DATA_START_ROW) {
      return [];
    }

    var header = sheet.getRange(CONFIG.HEADER_ROW, 1, 1, lastColumn).getValues()[0];
    var body = sheet
      .getRange(CONFIG.DATA_START_ROW, 1, lastRow - CONFIG.DATA_START_ROW + 1, lastColumn)
      .getValues();
    var out = [];

    for (var r = 0; r < body.length; r++) {
      var row = { _row: CONFIG.DATA_START_ROW + r };

      for (var c = 0; c < header.length; c++) {
        var name = String(header[c] || '').trim();

        if (name) {
          row[name] = body[r][c];
        }
      }

      out.push(row);
    }

    return out;
  },

  // Appends rows in one write. Column names are resolved against the target's
  // own header, so a column that has moved is still written to the right place
  // and a column the target does not have is reported rather than dropped.
  _append: function(sheetName, records) {
    if (!records.length) {
      return { written: 0, unknown: [] };
    }

    var sheet = this._sheet(sheetName);
    var lastColumn = sheet.getLastColumn();
    var header = sheet.getRange(CONFIG.HEADER_ROW, 1, 1, lastColumn).getValues()[0];
    var index = {};
    var unknown = {};

    for (var c = 0; c < header.length; c++) {
      var name = String(header[c] || '').trim();

      if (name) {
        index[name] = c;
      }
    }

    var payload = [];

    for (var i = 0; i < records.length; i++) {
      var line = new Array(lastColumn).fill('');

      for (var key in records[i]) {
        if (index[key] === undefined) {
          unknown[key] = true;
          continue;
        }

        line[index[key]] = records[i][key];
      }

      payload.push(line);
    }

    var at = sheet.getLastRow() + 1;

    if (at < CONFIG.DATA_START_ROW) {
      at = CONFIG.DATA_START_ROW;
    }

    sheet.getRange(at, 1, payload.length, lastColumn).setValues(payload);
    SpreadsheetApp.flush();

    return { written: payload.length, unknown: Object.keys(unknown), startRow: at };
  },

  // ------------------------------------------ calendar → content pipeline

  // What the Content Pipeline takes from the Content Calendar, and what it
  // takes from the campaign's card. Together these replace the two array
  // formulas that used to anchor the whole tab in row 2.
  CALENDAR_TO_PIPELINE: {
    'Day': 'Publishing Date',
    'Calendar ID': 'Calendar ID',
    'Page': 'Publishing Page',
    'Campaign Group': 'Campaign Group',
    'Campaign Name': 'Campaign Name',
    'Hospital Brand': 'Hospital Brand',

    // What the cycle was for. Written per row by the planner and carried
    // forward so the Content Strategy Worker can read it — it is the only
    // input that says what this cycle wants, as distinct from what the
    // campaign permanently is.
    'Cycle Objective': 'Cycle Objective'
  },

  // The twelve strategy fields on Campaign Cards, copied per row because the
  // Content Strategy Worker reads them off the row it is given. Matched by
  // header name on both sheets — this list is not a position.
  CARD_STRATEGY: [
    'Campaign Philosophy', 'Trust Platform', 'Core Message', 'Trust Promise',
    'Emotional Trigger', 'Psychological Barrier', 'Content Pillars',
    'Approved Content Angles', 'Non-Negotiable Rules', 'CTA Strategy',
    'Primary KPI', 'Target Audience'
  ],

  calendarToPipeline: function() {
    ConfigResolver.apply();

    var calendarName = (CONFIG.CAMPAIGN_PLANNER || {}).CALENDAR_SHEET_NAME ||
      'Content Calendar';
    var pipelineName = CONFIG.SHEET_NAME;

    var calendar = this._readAll(calendarName);
    var already = this._existingKeys(pipelineName, 'Calendar ID');

    // The card carries the strategy. A row whose campaign has no card is the
    // 67% blank-strategy defect, so it is refused by name rather than
    // transferred empty — the whole point of W1 was to stop that arriving
    // silently.
    var cards = {};
    var cardRows = this._readAll(CONFIG.CAMPAIGN_CARDS_SHEET_NAME);

    for (var c = 0; c < cardRows.length; c++) {
      var cardName = String(cardRows[c]['Campaign Name'] || '').trim();

      if (cardName) {
        cards[cardName] = cardRows[c];
      }
    }

    var records = [];
    var skipped = 0;
    var noCard = {};

    for (var i = 0; i < calendar.length; i++) {
      var row = calendar[i];
      var calendarId = String(row['Calendar ID'] || '').trim();
      var campaign = String(row['Campaign Name'] || '').trim();

      if (!calendarId || !campaign) {
        continue;
      }

      if (already[calendarId]) {
        skipped++;
        continue;
      }

      var record = {};

      for (var from in this.CALENDAR_TO_PIPELINE) {
        record[this.CALENDAR_TO_PIPELINE[from]] = row[from] === undefined ? '' : row[from];
      }

      var card = cards[campaign];

      if (!card) {
        noCard[campaign] = (noCard[campaign] || 0) + 1;
      } else {
        for (var s = 0; s < this.CARD_STRATEGY.length; s++) {
          var field = this.CARD_STRATEGY[s];
          record[field] = card[field] === undefined ? '' : card[field];
        }
      }

      // Identity for everything downstream. Generated here because this is
      // where the row starts existing.
      record['Content ID'] = 'CNT-' + calendarId;
      record['Batch ID'] = row['Batch ID'] === undefined ? '' : row['Batch ID'];

      records.push(record);
    }

    var result = this._append(pipelineName, records);

    Logger.log(
      'TRANSFER | calendar → pipeline | ' + result.written + ' new, ' +
      skipped + ' already present' +
      (result.unknown.length ? ' | no column for: ' + result.unknown.join(', ') : '')
    );

    return {
      written: result.written,
      skipped: skipped,
      startRow: result.startRow,
      noCard: noCard,
      unknownColumns: result.unknown
    };
  },

  // -------------------------------------- content pipeline → visual pipeline

  // The Creative Package — Visual Pipeline A:Q. What the visual team is given
  // and may not change. The Creative Director's final copy and design prompt
  // win over the drafts, because approval is what makes them final.
  PIPELINE_TO_VISUAL: [
    'Content ID', 'Calendar ID', 'Campaign Name', 'Hospital Brand',
    'Content Type', 'Content Format', 'Visual Concept', 'Visual Focus',
    'Visual Priority', 'Design Mood', 'Composition', 'Visual Elements',
    'Do NOT Show', 'Text On Design', 'Design Notes'
  ],

  pipelineToVisual: function() {
    ConfigResolver.apply();

    var pipelineName = CONFIG.SHEET_NAME;
    var visualName = CONFIG.VISUAL_PIPELINE.SHEET_NAME;

    var pipeline = this._readAll(pipelineName);
    var already = this._existingKeys(visualName, 'Content ID');

    var records = [];
    var skipped = 0;
    var notApproved = 0;

    for (var i = 0; i < pipeline.length; i++) {
      var row = pipeline[i];
      var contentId = String(row['Content ID'] || '').trim();

      if (!contentId) {
        continue;
      }

      // Approval is the gate. A row the Creative Director has not passed is not
      // a creative package; sending it to the visual team would spend
      // generation on copy that may still change.
      if (String(row['Creative Director Review Status'] || '').trim() !== 'Approved') {
        notApproved++;
        continue;
      }

      if (already[contentId]) {
        skipped++;
        continue;
      }

      var record = {};

      for (var f = 0; f < this.PIPELINE_TO_VISUAL.length; f++) {
        var field = this.PIPELINE_TO_VISUAL[f];
        record[field] = row[field] === undefined ? '' : row[field];
      }

      // The approved versions win over the drafts.
      record['Post Copy (AI)'] = row['Creative Director Post Copy'] ||
        row['Post Copy (AI)'] || '';
      record['Creative Director Design Prompt'] =
        row['Creative Director Design Prompt'] || row['Design Prompt (AI)'] || '';

      record['Batch ID'] = row['Batch ID'] === undefined ? '' : row['Batch ID'];
      record['VISUAL_STAGE'] = 'PLANNING';

      records.push(record);
    }

    var result = this._append(visualName, records);

    Logger.log(
      'TRANSFER | pipeline → visual | ' + result.written + ' new, ' +
      skipped + ' already present, ' + notApproved + ' not approved' +
      (result.unknown.length ? ' | no column for: ' + result.unknown.join(', ') : '')
    );

    return {
      written: result.written,
      skipped: skipped,
      notApproved: notApproved,
      startRow: result.startRow,
      unknownColumns: result.unknown
    };
  }
};


// ================================
// MENU — AI Workers → Planning → Transfer Rows Forward
// ================================

function transferRowsForward() {
  var ui = SpreadsheetApp.getUi();

  try {
    var toPipeline = Transfer.calendarToPipeline();
    var toVisual = Transfer.pipelineToVisual();

    var lines = [
      'Content Calendar → Content Pipeline',
      '   ' + toPipeline.written + ' new row(s)' +
        (toPipeline.skipped ? ', ' + toPipeline.skipped + ' already there' : ''),
      '',
      'Content Pipeline → Visual Pipeline',
      '   ' + toVisual.written + ' new row(s)' +
        (toVisual.skipped ? ', ' + toVisual.skipped + ' already there' : '') +
        (toVisual.notApproved ? ', ' + toVisual.notApproved +
          ' waiting on the Creative Director' : '')
    ];

    var campaigns = Object.keys(toPipeline.noCard);

    if (campaigns.length) {
      lines.push('');
      lines.push('─────────────────────────────');
      lines.push('Transferred with NO strategy — these campaigns have no card:');

      for (var i = 0; i < campaigns.length; i++) {
        lines.push('   ' + campaigns[i] + ' (' + toPipeline.noCard[campaigns[i]] + ' rows)');
      }

      lines.push('');
      lines.push('The workers will refuse these rows rather than invent a strategy');
      lines.push('for them. Build the cards, then run this again — the rows already');
      lines.push('transferred are not duplicated.');
    }

    var unknown = toPipeline.unknownColumns.concat(toVisual.unknownColumns);

    if (unknown.length) {
      lines.push('');
      lines.push('No column exists for: ' + unknown.join(', '));
      lines.push('Run Maintenance → Create Managed Columns.');
    }

    ui.alert('Transfer Rows Forward', lines.join('\n'), ui.ButtonSet.OK);

  } catch (e) {
    ui.alert('Transfer Rows Forward', e.message || e.toString(), ui.ButtonSet.OK);
  }
}

// ---------------------------------------------------------------------------
// END SOURCE FILE: Transfer.gs
// ---------------------------------------------------------------------------


// ---------------------------------------------------------------------------
// BEGIN SOURCE FILE: Archive.gs
// ---------------------------------------------------------------------------
// ================================
// ARCHIVE
//
// A finished plan is still weight. Every cycle adds rows to four tabs and none
// of them ever shrink, so the workbook a year from now carries every post ever
// made in the tabs the workers read on every run.
//
// One row of a post's life is spread across four tabs — what was scheduled,
// what was written, what was produced, what was advertised. Archiving joins
// those four into ONE row in ONE sheet, then removes them from the working
// tabs.
//
// The join is on identity, not position:
//
//   Content Calendar ──Calendar ID──▶ Content Pipeline
//   Content Pipeline ──Content ID───▶ Visual Pipeline ──Content ID──▶ Ads Pipeline
//
// Columns that appear in more than one tab — Calendar ID, Campaign Name,
// Content Format and the rest — are written once. A joined row is the post's
// whole history read left to right, not four copies of its name.
//
// ------------------------------------------------------------------------
// THIS IS SAFE ONLY BECAUSE THE TRANSFERS ARE NOW CODE
//
// While the tabs were joined by position-bound formulas — two array formulas
// anchored in Content Pipeline row 2, and 2,244 individual cell references in
// the Visual Pipeline — deleting any row silently re-pointed every formula
// below it. Row 2 could not be deleted at all without destroying the transfer.
//
// Transfer.gs replaced that with values written once and joined by key, which
// is what makes a row independent enough to remove. See its header for the
// defect in full. If those formulas are ever put back, this becomes unsafe
// again — `assertNoTransferFormulas` below refuses to run when it finds them.
// ================================

var Archive = {

  SHEET_NAME: 'Archive',
  STAMP: 'Archived At',

  // Deleted in this order: furthest downstream first. Nothing references a row
  // that has already been removed, so no stale key is ever left pointing at a
  // row that no longer exists.
  ORDER: ['ADS', 'VISUAL', 'PIPELINE', 'CALENDAR'],

  _sheets: function() {
    return {
      CALENDAR: (CONFIG.CAMPAIGN_PLANNER || {}).CALENDAR_SHEET_NAME || 'Content Calendar',
      PIPELINE: CONFIG.SHEET_NAME,
      VISUAL:   CONFIG.VISUAL_PIPELINE.SHEET_NAME,
      ADS:      CONFIG.PAID_ADS.SHEET_NAME
    };
  },

  // ------------------------------------------------------------- the guard

  // Refuses to run while any tab still transfers by formula. A single array
  // formula left in place makes every row position load-bearing again, and the
  // corruption that follows a delete is silent.
  assertNoTransferFormulas: function() {
    var sheets = this._sheets();
    var offenders = [];
    var watched = [sheets.PIPELINE, sheets.VISUAL];

    for (var i = 0; i < watched.length; i++) {
      var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(watched[i]);

      if (!sheet) {
        continue;
      }

      var lastRow = Math.min(sheet.getLastRow(), 400);
      var lastColumn = sheet.getLastColumn();

      if (lastRow < CONFIG.DATA_START_ROW || !lastColumn) {
        continue;
      }

      var formulas = sheet
        .getRange(CONFIG.DATA_START_ROW, 1,
          lastRow - CONFIG.DATA_START_ROW + 1, lastColumn)
        .getFormulas();
      var found = 0;

      for (var r = 0; r < formulas.length; r++) {
        for (var c = 0; c < formulas[r].length; c++) {
          if (formulas[r][c]) {
            found++;
          }
        }
      }

      if (found) {
        offenders.push(watched[i] + ' (' + found + ' formula cells)');
      }
    }

    if (offenders.length) {
      throw new Error(
        'Archiving is refused while these tabs still pull their rows by ' +
        'formula: ' + offenders.join(', ') + '.\n\n' +
        'A formula binds a row to its POSITION. Deleting a row above it makes ' +
        'every formula below silently read a different post\'s data — no ' +
        '#REF!, no error, nothing to notice.\n\n' +
        'Replace them with AI Workers → Planning → Transfer Rows Forward, ' +
        'which writes the same values keyed on Calendar ID and Content ID. ' +
        'Then archiving is safe.'
      );
    }
  },

  // ------------------------------------------------------------- readiness

  progress: function(batch) {
    var sheets = this._sheets();
    var visual = Batches.rowsIn(batch, sheets.VISUAL);
    var published = 0;

    for (var i = 0; i < visual.rows.length; i++) {
      var data = SheetSchema.getRowData(visual.rows[i], sheets.VISUAL);

      if (String(data['Live Post URL'] || '').trim()) {
        published++;
      }
    }

    return {
      planned: batch.count,
      inVisual: visual.rows.length,
      published: published,
      unpublished: visual.rows.length - published,
      neverReachedVisual: batch.count - visual.rows.length,
      finished: batch.count > 0 &&
        visual.rows.length === batch.count &&
        published === batch.count
    };
  },

  // Batches safe to archive, newest first. A batch still in production is not
  // offered — archiving work in progress takes it out from under the workers.
  candidates: function() {
    var out = [];
    var all = Batches.all();

    for (var i = 0; i < all.length; i++) {
      if (all[i].unstamped) {
        // Rows planned before Batch ID existed have no boundary anyone can
        // trust. Archiving them would mean archiving "everything before some
        // point nobody wrote down".
        continue;
      }

      var state = this.progress(all[i]);

      if (state.finished) {
        out.push({ batch: all[i], progress: state });
      }
    }

    return out;
  },

  // --------------------------------------------------------- the joined row

  // Reads a batch out of all four tabs and joins it into one record per post.
  //
  // Column names are namespaced by the tab they came from ONLY where two tabs
  // use the same name for different things. Where a column is genuinely the
  // same fact — Calendar ID, Campaign Name — it is written once.
  collect: function(batch) {
    var sheets = this._sheets();
    var calendarRows = {};
    var order = [];

    // --- the calendar: one entry per scheduled post ---
    for (var i = 0; i < batch.rows.length; i++) {
      var row = SheetSchema.getRowData(batch.rows[i], sheets.CALENDAR);
      var calendarId = String(row['Calendar ID'] || '').trim();

      if (!calendarId) {
        continue;
      }

      calendarRows[calendarId] = { calendar: row, row: batch.rows[i] };
      order.push(calendarId);
    }

    // --- the pipeline, joined on Calendar ID ---
    var pipeline = Batches.rowsIn(batch, sheets.PIPELINE);
    var byContentId = {};

    for (var p = 0; p < pipeline.rows.length; p++) {
      var pipelineRow = SheetSchema.getRowData(pipeline.rows[p], sheets.PIPELINE);
      var key = String(pipelineRow['Calendar ID'] || '').trim();

      if (calendarRows[key]) {
        calendarRows[key].pipeline = pipelineRow;

        var contentId = String(pipelineRow['Content ID'] || '').trim();

        if (contentId) {
          byContentId[contentId] = calendarRows[key];
        }
      }
    }

    // --- the visual and ads tabs, joined on Content ID ---
    var joins = [
      { key: 'visual', sheet: sheets.VISUAL },
      { key: 'ads', sheet: sheets.ADS }
    ];

    for (var j = 0; j < joins.length; j++) {
      var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(joins[j].sheet);

      if (!sheet) {
        continue;
      }

      var lastRow = sheet.getLastRow();

      for (var r = CONFIG.DATA_START_ROW; r <= lastRow; r++) {
        var data = SheetSchema.getRowData(r, joins[j].sheet);
        var id = String(data['Content ID'] || '').trim();

        if (id && byContentId[id]) {
          byContentId[id][joins[j].key] = data;
          byContentId[id][joins[j].key + 'Row'] = r;
        }
      }
    }

    var records = [];

    for (var o = 0; o < order.length; o++) {
      records.push(calendarRows[order[o]]);
    }

    return records;
  },

  // The archive's own column order. Built from what each tab contributes that
  // nothing before it already said, so the same fact is never stored twice.
  columns: function() {
    var seen = {};
    var out = [];
    var sheets = this._sheets();
    var sources = [
      { prefix: '', sheet: sheets.CALENDAR },
      { prefix: '', sheet: sheets.PIPELINE },
      { prefix: '', sheet: sheets.VISUAL },
      { prefix: 'Ad ', sheet: sheets.ADS }
    ];

    for (var s = 0; s < sources.length; s++) {
      var sheet = SpreadsheetApp.getActiveSpreadsheet()
        .getSheetByName(sources[s].sheet);

      if (!sheet || !sheet.getLastColumn()) {
        continue;
      }

      var header = sheet
        .getRange(CONFIG.HEADER_ROW, 1, 1, sheet.getLastColumn())
        .getValues()[0];

      for (var c = 0; c < header.length; c++) {
        var name = String(header[c] || '').trim();

        if (!name) {
          continue;
        }

        // The ads tab repeats identity columns it was given. Those are the same
        // fact, so they are skipped rather than prefixed into a near-duplicate.
        var label = seen[name] && sources[s].prefix
          ? sources[s].prefix + name
          : name;

        if (seen[label]) {
          continue;
        }

        seen[label] = true;
        out.push({ label: label, from: sources[s].sheet, column: name });
      }
    }

    out.push({ label: this.STAMP, from: null, column: null });

    return out;
  },

  _mirror: function(columns) {
    var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = spreadsheet.getSheetByName(this.SHEET_NAME);
    var header = columns.map(function(c) { return c.label; });

    if (!sheet) {
      sheet = spreadsheet.insertSheet(this.SHEET_NAME);
      sheet.getRange(1, 1, 1, header.length).setValues([header]);
      sheet.getRange(1, 1, 1, header.length).setFontWeight('bold');
      sheet.setFrozenRows(1);
      sheet.hideSheet();

      Logger.log('ARCHIVE | created "' + this.SHEET_NAME + '" with ' +
        header.length + ' columns');
      return sheet;
    }

    // A working tab may have gained a column since the archive was made.
    if (sheet.getLastColumn() < header.length) {
      sheet.getRange(1, 1, 1, header.length).setValues([header]);
    }

    return sheet;
  },

  // -------------------------------------------------------------- the plan

  preview: function(batchId) {
    var batch = Batches.byId(batchId);

    if (!batch) {
      throw new Error('No batch called "' + batchId + '".');
    }

    var sheets = this._sheets();
    var records = this.collect(batch);
    var plan = [];
    var total = 0;

    for (var i = 0; i < this.ORDER.length; i++) {
      var key = this.ORDER[i];
      var rows = [];

      for (var r = 0; r < records.length; r++) {
        if (key === 'CALENDAR') {
          rows.push(records[r].row);
        } else if (key === 'PIPELINE' && records[r].pipeline) {
          rows.push(records[r].pipeline._row || null);
        } else if (key === 'VISUAL' && records[r].visualRow) {
          rows.push(records[r].visualRow);
        } else if (key === 'ADS' && records[r].adsRow) {
          rows.push(records[r].adsRow);
        }
      }

      rows = rows.filter(function(n) { return n; });

      plan.push({ key: key, sheet: sheets[key], rows: rows, count: rows.length });
      total += rows.length;
    }

    return {
      batch: batch,
      progress: this.progress(batch),
      records: records,
      plan: plan,
      total: total
    };
  },

  // ------------------------------------------------------------- the move

  run: function(batchId) {
    this.assertNoTransferFormulas();

    var preview = this.preview(batchId);
    var columns = this.columns();
    var stampedAt = new Date();
    var sheet = this._mirror(columns);

    // --- phase one: write the joined rows, and count them ---
    var payload = [];

    for (var i = 0; i < preview.records.length; i++) {
      var record = preview.records[i];
      var source = {
        calendar: record.calendar,
        pipeline: record.pipeline,
        visual: record.visual,
        ads: record.ads
      };
      var sheets = this._sheets();
      var line = [];

      for (var c = 0; c < columns.length; c++) {
        var column = columns[c];

        if (column.label === this.STAMP) {
          line.push(stampedAt);
          continue;
        }

        var from =
          column.from === sheets.CALENDAR ? source.calendar :
          column.from === sheets.PIPELINE ? source.pipeline :
          column.from === sheets.VISUAL   ? source.visual :
          column.from === sheets.ADS      ? source.ads : null;

        line.push(from && from[column.column] !== undefined ? from[column.column] : '');
      }

      payload.push(line);
    }

    if (!payload.length) {
      throw new Error('Nothing to archive: ' + batchId + ' resolved to no rows.');
    }

    var at = sheet.getLastRow() + 1;
    sheet.getRange(at, 1, payload.length, columns.length).setValues(payload);
    SpreadsheetApp.flush();

    var landed = sheet.getLastRow() - at + 1;

    if (landed !== payload.length) {
      throw new Error(
        'Archiving stopped before deleting anything. ' + payload.length +
        ' rows were meant to be written and ' + landed + ' landed. Nothing has ' +
        'been removed from the working tabs. The partial write is at the bottom ' +
        'of the "' + this.SHEET_NAME + '" sheet and can be deleted by hand.'
      );
    }

    // --- phase two: delete, furthest downstream first ---
    var removed = 0;
    var report = [];

    for (var j = 0; j < preview.plan.length; j++) {
      var step = preview.plan[j];

      if (!step.count) {
        report.push({ sheet: step.sheet, removed: 0 });
        continue;
      }

      var target = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(step.sheet);
      var ordered = step.rows.slice().sort(function(a, b) { return b - a; });

      for (var d = 0; d < ordered.length; d++) {
        target.deleteRow(ordered[d]);
        removed++;
      }

      SpreadsheetApp.flush();
      report.push({ sheet: step.sheet, removed: ordered.length });
    }

    Logger.log(
      'ARCHIVE | ' + batchId + ' | ' + landed + ' joined rows written, ' +
      removed + ' rows removed | ' + report.map(function(r) {
        return r.sheet + ':' + r.removed;
      }).join(' ')
    );

    return { batchId: batchId, archived: landed, removed: removed, sheets: report };
  }
};


// ================================
// MENU — AI Workers → Maintenance → Archive A Finished Plan
// ================================

function archiveFinishedPlan() {
  var ui = SpreadsheetApp.getUi();

  try {
    Archive.assertNoTransferFormulas();

    var candidates = Archive.candidates();

    if (!candidates.length) {
      var all = Batches.all().filter(function(b) { return !b.unstamped; });

      if (!all.length) {
        ui.alert('Archive A Finished Plan',
          'No batch has been planned yet. Rows planned before Batch ID existed ' +
          'are not archivable — there is no recorded boundary to trust.',
          ui.ButtonSet.OK);
        return;
      }

      var lines = ['No plan is finished yet.', ''];

      for (var i = 0; i < Math.min(all.length, 5); i++) {
        var p = Archive.progress(all[i]);
        lines.push(all[i].id + ' — ' + p.published + ' of ' + p.planned +
          ' published' +
          (p.neverReachedVisual ? ', ' + p.neverReachedVisual +
            ' never reached the Visual Pipeline' : ''));
      }

      lines.push('');
      lines.push('A plan is archivable when every one of its rows is live.');
      lines.push('Archiving work in progress takes it out from under the workers.');

      ui.alert('Archive A Finished Plan', lines.join('\n'), ui.ButtonSet.OK);
      return;
    }

    var pick = ['Finished plans:', ''];

    for (var c = 0; c < Math.min(candidates.length, 9); c++) {
      pick.push((c + 1) + ')  ' + Batches.describe(candidates[c].batch));
    }

    pick.push('');
    pick.push('Enter a number.');

    var choice = ui.prompt('Archive A Finished Plan', pick.join('\n'),
      ui.ButtonSet.OK_CANCEL);

    if (choice.getSelectedButton() !== ui.Button.OK) {
      return;
    }

    var index = parseInt(choice.getResponseText(), 10);

    if (isNaN(index) || index < 1 || index > Math.min(candidates.length, 9)) {
      ui.alert('Archive A Finished Plan', 'No plan with that number.', ui.ButtonSet.OK);
      return;
    }

    var batchId = candidates[index - 1].batch.id;
    var preview = Archive.preview(batchId);
    var detail = [
      preview.records.length + ' posts will be joined into one row each in the ' +
        '"' + Archive.SHEET_NAME + '" sheet — what was scheduled, written, ' +
        'produced and advertised, read left to right.',
      '',
      'Then ' + preview.total + ' rows are removed:'
    ];

    for (var p = 0; p < preview.plan.length; p++) {
      if (preview.plan[p].count) {
        detail.push('   ' + preview.plan[p].count + ' from ' + preview.plan[p].sheet);
      }
    }

    detail.push('');
    detail.push('The joined rows are written and counted first. If the write is');
    detail.push('short, nothing is deleted.');
    detail.push('');
    detail.push('This is the only operation in the system that removes rows from a');
    detail.push('working tab. Type the batch id to confirm:');
    detail.push('');
    detail.push(batchId);

    var confirm = ui.prompt('Archive A Finished Plan', detail.join('\n'),
      ui.ButtonSet.OK_CANCEL);

    if (confirm.getSelectedButton() !== ui.Button.OK) {
      return;
    }

    if (String(confirm.getResponseText()).trim() !== batchId) {
      ui.alert('Archive A Finished Plan',
        'That did not match the batch id. Nothing was moved.', ui.ButtonSet.OK);
      return;
    }

    var result = Archive.run(batchId);

    ui.alert(
      'Archive A Finished Plan',
      result.archived + ' posts archived, ' + result.removed + ' rows removed ' +
      'from the working tabs.\n\n' +
      'They are in the hidden "' + Archive.SHEET_NAME + '" sheet. Unhide it ' +
      'from the sheet tab menu if you want to read them.',
      ui.ButtonSet.OK
    );

  } catch (e) {
    ui.alert('Archive A Finished Plan', e.message || e.toString(), ui.ButtonSet.OK);
  }
}

// ---------------------------------------------------------------------------
// END SOURCE FILE: Archive.gs
// ---------------------------------------------------------------------------


// ---------------------------------------------------------------------------
// BEGIN SOURCE FILE: PostFooter.gs
// ---------------------------------------------------------------------------
// ================================
// POST FOOTER
//
// What sits under the body of every published post: the page's standing
// hashtags merged with the one or two this post earned, then the hotline, then
// the WhatsApp link.
//
// ------------------------------------------------------------------------
// WHY THE MERGE IS IN CODE
//
// The Content Creation Worker is told what the standing set is, so it does not
// repeat it and can choose tags that complement it. But it does not assemble
// the final list. A model asked to reproduce six fixed hashtags will get it
// right nineteen times and drop one on the twentieth, and nobody reads twenty
// published posts looking for a missing brand tag.
//
// So the worker contributes only what is genuinely its judgement — what this
// particular post is about — and everything standing is merged here, the same
// way, every time.
//
// ------------------------------------------------------------------------
// THE wa.me TRAP
//
// A WhatsApp link is not the phone number with a country code glued to the
// front. wa.me wants an international number with the leading zero REMOVED:
//
//   01500668657   →   201500668657      correct
//   01500668657   →   2001500668657     dead link
//
// Two of the three links first supplied by hand carried the extra zero. They
// are derived from the phone number here so that mistake cannot be made again
// by typing.
// ================================

var PostFooter = {

  _config: function() {
    return CONFIG.POST_FOOTER || {};
  },

  _forPage: function(table, page) {
    var wanted = String(page || '').trim();

    if (!wanted || !table) {
      return null;
    }

    if (table[wanted]) {
      return table[wanted];
    }

    for (var key in table) {
      if (key.toLowerCase() === wanted.toLowerCase()) {
        return table[key];
      }
    }

    return null;
  },

  // ------------------------------------------------------------ hashtags

  // Standing tags first, then whatever the writer added that is not already
  // there. Order is deliberate: the brand set is what every post of this page
  // carries, and a reader scanning the block should meet it in the same place
  // each time.
  //
  // `written` is the raw column value — one line of space-separated tags.
  mergeHashtags: function(page, written, language) {
    var standing = this._forPage(this._config().HASHTAGS, page);
    var fixed = (standing && standing[language]) ? standing[language] : [];

    var seen = {};
    var out = [];

    var add = function(tag) {
      var clean = String(tag || '').trim();

      if (!clean) {
        return;
      }

      if (clean.charAt(0) !== '#') {
        clean = '#' + clean;
      }

      // Case-insensitive on the Latin side; Arabic has no case, so this is
      // simply a normalised key.
      var key = clean.toLowerCase();

      if (seen[key]) {
        return;
      }

      seen[key] = true;
      out.push(clean);
    };

    for (var i = 0; i < fixed.length; i++) {
      add(fixed[i]);
    }

    var extra = String(written || '').split(/[\s,]+/);

    for (var j = 0; j < extra.length; j++) {
      add(extra[j]);
    }

    // Reported, never truncated. Which tag to drop is a brand decision, and a
    // tag silently missing from a published post is worse than a long block —
    // it looks like an oversight nobody can trace.
    var limit = this._config().MAX_TAGS_PER_LANGUAGE || 0;

    if (limit && out.length > limit) {
      Logger.log(
        'POST_FOOTER | ' + String(page || '') + ' carries ' + out.length + ' ' +
        language.toUpperCase() + ' hashtags, over the ' + limit + ' the block ' +
        'is meant to hold. Nothing was dropped. On Facebook a long tag block ' +
        'reads as spam and its hashtag discovery is weak, so the cost is real. ' +
        'Trim CONFIG.POST_FOOTER.HASHTAGS.'
      );
    }

    return out;
  },

  // How many tags each page carries before the writer adds its own. Used by the
  // tests and worth reading whenever a suggestion is approved: the sets grow one
  // agreed addition at a time and nobody sees the total until it is published.
  counts: function() {
    var sets = this._config().HASHTAGS || {};
    var out = {};

    for (var page in sets) {
      out[page] = {
        ar: (sets[page].ar || []).length,
        en: (sets[page].en || []).length,
        total: (sets[page].ar || []).length + (sets[page].en || []).length
      };
    }

    return out;
  },

  // ------------------------------------------------------------- contact

  // 201500668657 — international, no plus, no leading zero.
  whatsappNumber: function(phone) {
    var digits = String(phone || '').replace(/\D/g, '');

    if (!digits) {
      return '';
    }

    // Already carries the country code.
    if (digits.indexOf('20') === 0 && digits.length >= 12) {
      return digits;
    }

    return '20' + digits.replace(/^0+/, '');
  },

  whatsappLink: function(phone) {
    var number = this.whatsappNumber(phone);
    return number ? 'https://wa.me/' + number : '';
  },

  // "الخط الساخن: 01100755556 - 01500668657"
  hotlineLine: function(page) {
    var cfg = this._config();
    var entry = this._forPage(cfg.CONTACT_LINES, page);

    if (!entry || !entry.hotline || !entry.hotline.length) {
      return '';
    }

    var numbers = [];

    for (var i = 0; i < entry.hotline.length; i++) {
      var phone = String(entry.hotline[i] || '').trim();

      if (phone) {
        numbers.push(phone);
      }
    }

    if (!numbers.length) {
      return '';
    }

    return (cfg.HOTLINE_LABEL || 'الخط الساخن') + ': ' +
      numbers.join(cfg.HOTLINE_SEPARATOR || ' - ');
  },

  // "للتواصل واتس دوس عاللينك:\nhttps://wa.me/201500668657"
  whatsappLine: function(page) {
    var cfg = this._config();
    var entry = this._forPage(cfg.CONTACT_LINES, page);

    if (!entry || !entry.whatsapp) {
      return '';
    }

    var link = this.whatsappLink(entry.whatsapp);

    if (!link) {
      return '';
    }

    return (cfg.WHATSAPP_LABEL || 'للتواصل واتس دوس عاللينك') + ':\n' + link;
  },

  // ------------------------------------------------------------- the block

  // Everything below the body, in publish order:
  //
  //   <arabic hashtags>
  //   <english hashtags>
  //
  //   الخط الساخن: 01100755556 - 01500668657
  //
  //   للتواصل واتس دوس عاللينك:
  //   https://wa.me/201500668657
  //
  // Returns '' when the page is unknown and the row has no hashtags of its own,
  // so an unrecognised page produces no invented footer.
  build: function(page, primaryHashtags, secondaryHashtags) {
    if (this._config().ENABLED === false) {
      return '';
    }

    var blocks = [];

    var arabic = this.mergeHashtags(page, primaryHashtags, 'ar');
    var english = this.mergeHashtags(page, secondaryHashtags, 'en');
    var tagLines = [];

    if (arabic.length) {
      tagLines.push(arabic.join(' '));
    }

    if (english.length) {
      tagLines.push(english.join(' '));
    }

    if (tagLines.length) {
      blocks.push(tagLines.join('\n'));
    }

    var hotline = this.hotlineLine(page);

    if (hotline) {
      blocks.push(hotline);
    }

    var whatsapp = this.whatsappLine(page);

    if (whatsapp) {
      blocks.push(whatsapp);
    }

    // A blank line between each block. The operator asked specifically for the
    // hotline and the WhatsApp invitation to be separated by one.
    return blocks.join('\n\n');
  },

  // What the Content Creation Worker is shown, so it does not repeat the
  // standing set and can pick tags that add to it rather than restate it.
  briefFor: function(page) {
    var standing = this._forPage(this._config().HASHTAGS, page);

    if (!standing) {
      return '';
    }

    var lines = [
      'Every post on this page already carries these, appended automatically:',
      ''
    ];

    if (standing.ar && standing.ar.length) {
      lines.push('  Arabic:  ' + standing.ar.join(' '));
    }

    if (standing.en && standing.en.length) {
      lines.push('  English: ' + standing.en.join(' '));
    }

    lines.push('');
    lines.push('Do not repeat any of them. Write one or two of your own in each');
    lines.push('field — the ones that belong to THIS post and would not fit any');
    lines.push('other. A tag that could sit on every post of this campaign is');
    lines.push('already above.');

    return lines.join('\n');
  }
};

// ---------------------------------------------------------------------------
// END SOURCE FILE: PostFooter.gs
// ---------------------------------------------------------------------------

