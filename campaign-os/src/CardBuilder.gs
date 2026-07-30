// W1 — CAMPAIGN CARD BUILDER
//
// Turns one knowledge file into one Campaign Cards row.
//
// This is the worker the system was missing. The Content Calendar schedules 41
// distinct campaigns; Campaign Cards covers 16. The VLOOKUP fails for the other
// 25, and 89 of 132 pipeline rows (67%) reach the Content Strategy Worker with
// all twelve strategy fields blank. The workers were not failing on those rows —
// they were inventing, because nothing had been said.
// (Audit A, findings F1 and F7; SYSTEM_ARCHITECTURE §9.2.)
//
// Knowledge flows one way:
//
//   knowledge file  →  W1  →  one row in Campaign Cards  →  VLOOKUP  →  pipeline
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
    var rootId = this._property('KNOWLEDGE_FOLDER_ID');

    if (!rootId) {
      throw new Error(
        'KNOWLEDGE_FOLDER_ID is not set in Script Properties. Point it at the ' +
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
      CONFIG.PROMPTS_FOLDER_ID;

    var manual = DriveLoader.loadMarkdown(config.promptFile, folderId);

    if (!manual) {
      throw new Error(
        'Could not load ' + config.promptFile + '. Put it in the prompts ' +
        'folder, or set PLANNING_PROMPTS_FOLDER_ID in Script Properties.'
      );
    }

    var brand = DriveLoader.loadMarkdown('MASTER_BRAND_ARCHITECTURE.md',
      CONFIG.DOCS_FOLDER_ID) || '[not loaded]';
    var constitution = DriveLoader.loadMarkdown('AI_CREATIVE_CONSTITUTION.md',
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
    parsed['Campaign Name'] = check.frontMatter.entity_name_en;
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
