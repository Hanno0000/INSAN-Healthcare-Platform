// ===========================================================================
// Delivery.gs
//
// Publishing and paid ads — the only operations in this system that reach
// the outside world. Kept in their own file so they are easy to find and
// hard to change by accident.
//
// Merged from 2 source files on 2026-08-02. Apps Script has no
// modules: every .gs is evaluated into one shared scope before anything is
// called, so which file a definition sits in has never affected what runs.
// They were split for reading and merged because the operator pastes each
// file into the editor by hand.
//
// The BEGIN/END banners below are load-bearing for the tests, which read a
// section by name — see tests/run.js, fixtures.srcSection.
//
// Contents:
//   PublishingRunner.gs
//   AdsRunner.gs
// ===========================================================================


// ---------------------------------------------------------------------------
// BEGIN SOURCE FILE: PublishingRunner.gs
// ---------------------------------------------------------------------------
// ================================
// W9 — PUBLISHING WORKER
//
// Takes an approved row live on a Facebook page.
//
// There is no model call in this file. Every decision publishing needs was
// already made and owned upstream: the copy by the Creative Director, the
// artwork by Visual QA, the page by the planner. Publishing is the one step in
// the chain with nothing left to judge — and the contract's rule is one
// decision, one owner, so this worker makes none.
//
// What it does instead is refuse. It is the only irreversible action in the
// system: a post cannot be unpublished from a spreadsheet, and a double-post is
// visible to every follower of a real hospital. So the guards come first and
// the API call last.
// ================================

var PublishingRunner = {

  WORKER_NAME: 'PUBLISHING_WORKER',

  _config: function() {
    return CONFIG.PUBLISHING || {};
  },

  // ------------------------------------------------------------------ batch

  run: function(startRow, endRow) {
    // Identifiers from Script Properties where set, CONFIG.gs otherwise.
    // Idempotent; see ConfigResolver (Audit A, F17).
    ConfigResolver.apply();

    var sheetName = CONFIG.VISUAL_PIPELINE.SHEET_NAME;
    var lastRow = SheetSchema.getLastRow(sheetName);

    startRow = Math.max(startRow, CONFIG.DATA_START_ROW);
    endRow = Math.min(endRow, lastRow);

    var batchStart = new Date().getTime();
    var runStart = RunControl.runStart(batchStart);
    var timeoutMs = (CONFIG.BATCH_TIMEOUT_SECONDS || 300) * 1000;

    var results = [];
    var published = 0;
    var skipped = 0;
    var failed = 0;
    var interrupted = false;
    var stopped = false;
    var nextRow = startRow;

    for (var row = startRow; row <= endRow; row++) {
      // Checked before the row, never after. An operator stopping a publishing
      // run is stopping something that cannot be taken back.
      if (RunControl.stopRequested(runStart)) {
        interrupted = true;
        stopped = true;
        RunControl.clear();
        Logger.log('OPERATOR_STOP | PUBLISHING | stopped before row ' + row);
        break;
      }

      var result = this.publishRow(row);
      results.push(result);
      nextRow = row + 1;

      if (result.published) {
        published++;
      } else if (result.skipped) {
        skipped++;
      } else {
        failed++;
      }

      if (row < endRow && (new Date().getTime() - batchStart) >= timeoutMs) {
        interrupted = true;
        break;
      }
    }

    Logger.logExecution({
      worker: this.WORKER_NAME,
      row: startRow + '-' + (nextRow - 1),
      status: interrupted ? (stopped ? 'STOPPED' : 'TIMEOUT')
        : (failed === 0 ? 'SUCCESS' : 'PARTIAL'),
      runtime: new Date().getTime() - batchStart,
      details: (this._config().DRY_RUN ? 'DRY RUN | ' : '') +
        published + ' published, ' + skipped + ' skipped, ' + failed + ' failed' +
        (interrupted ? ' (resume from row ' + nextRow + ')' : '')
    });

    return {
      published: published, skipped: skipped, failed: failed,
      interrupted: interrupted, stopped: stopped,
      nextRow: interrupted ? nextRow : null,
      dryRun: !!this._config().DRY_RUN,
      results: results
    };
  },

  // -------------------------------------------------------------- one row

  publishRow: function(rowNumber) {
    var startTime = new Date().getTime();
    var sheetName = CONFIG.VISUAL_PIPELINE.SHEET_NAME;
    var cfg = this._config();

    try {
      var row = SheetSchema.getRowData(rowNumber, sheetName);
      var gate = this._gate(row, rowNumber);

      if (gate.skip) {
        Logger.log('PUBLISHING | Row ' + rowNumber + ' | skipped: ' + gate.reason);
        return { row: rowNumber, skipped: true, reason: gate.reason };
      }

      var post = this._compose(row, rowNumber);

      if (cfg.DRY_RUN) {
        // Everything above ran for real: the page resolved, the token was
        // found, the copy was read, every asset was fetched from Drive. Only
        // the call is withheld. A dry run that skipped the resolution would
        // prove nothing about the live one.
        var preview = 'DRY RUN — would post to ' + post.page + ' (' +
          post.assets.length + ' asset(s), ' + post.copy.length + ' chars, ' +
          'first ' + (cfg.VISIBLE_CHARS || 250) + ' visible)';

        this._write(rowNumber, {
          'Publishing Status': preview
        });

        Logger.logSuccess(this.WORKER_NAME, rowNumber,
          new Date().getTime() - startTime, 0, 0, preview);

        return { row: rowNumber, published: false, dryRun: true, preview: preview };
      }

      // The window between posting and recording it is the only place a
      // re-run can double-post. Marked before the call, so a row interrupted
      // inside that window refuses to run again until a human has looked at
      // the page.
      this._write(rowNumber, {
        'Publishing Status': cfg.IN_FLIGHT_MARKER + ' since ' + new Date().toISOString()
      });
      SpreadsheetApp.flush();

      var live = this._publish(post);

      this._write(rowNumber, {
        'Publishing Status': 'PUBLISHED',
        'Publishing Timestamp': new Date(),
        'Live Post URL': live.url
      });

      _transitionVisualStage(rowNumber, 'COMPLETED', sheetName);
      SheetWriter.writeAIWorkerTag(rowNumber, this.WORKER_NAME, sheetName);
      SpreadsheetApp.flush();

      // The artwork is live. Move it out of `approved` into `published`, which
      // is what makes the folders readable at a glance: approved means passed
      // QA and never used, published means it actually ran.
      //
      // Only on a real post — the dry-run branch returns above, so nothing is
      // moved for a run that published nothing. Never throws: a post that is
      // already on a real page must not be reported as failed because a file
      // could not be moved afterwards.
      var filed = AssetLibrary.markPublished(rowNumber, sheetName);

      if (filed.error) {
        Logger.log(
          'PUBLISHING | row ' + rowNumber + ' is live at ' + live.url +
          ' but its artwork was not moved to the published folder: ' + filed.error
        );
      }

      Logger.logSuccess(this.WORKER_NAME, rowNumber,
        new Date().getTime() - startTime, 0, 0,
        'Published to ' + post.page + ' | ' + post.assets.length + ' asset(s) | ' +
        post.copy.length + ' chars | ' + live.url);

      return { row: rowNumber, published: true, url: live.url };

    } catch (e) {
      var message = e.message || e.toString();

      // Left in place on purpose when the failure happened mid-flight: the
      // marker is the record that something may be live, and clearing it would
      // hand the next run a clean-looking row.
      if (message.indexOf(cfg.IN_FLIGHT_MARKER) === -1) {
        this._write(rowNumber, {
          'Publishing Status': 'FAILED: ' + message.substring(0, 200)
        });
      }

      Logger.logFailure(this.WORKER_NAME, rowNumber,
        new Date().getTime() - startTime, message);

      return { row: rowNumber, published: false, error: message };
    }
  },

  // ------------------------------------------------------------------ gate

  // Reasons to leave a row alone. Each returns rather than throws: a row that
  // is not this worker's business is not a failure.
  _gate: function(row, rowNumber) {
    var cfg = this._config();
    var stage = String(row['VISUAL_STAGE'] || '').trim();

    if (stage !== 'PUBLISHING') {
      return { skip: true, reason: 'VISUAL_STAGE is "' + stage + '", not PUBLISHING' };
    }

    var decision = String(row['Visual QA Decision'] || '').trim();

    if (decision !== 'Approved') {
      return {
        skip: true,
        reason: 'Visual QA Decision is "' + decision + '", not Approved'
      };
    }

    var live = String(row['Live Post URL'] || '').trim();

    if (live) {
      return { skip: true, reason: 'already published — ' + live };
    }

    var status = String(row['Publishing Status'] || '');

    if (status.indexOf(cfg.IN_FLIGHT_MARKER) !== -1) {
      throw new Error(
        'Row ' + rowNumber + ' was interrupted while publishing (' + status +
        '). It may already be live. Open the page, check, then either paste the ' +
        'post URL into Live Post URL or clear Publishing Status. This worker ' +
        'will not guess, because guessing wrong posts twice.'
      );
    }

    return { skip: false };
  },

  // --------------------------------------------------------------- compose

  // Everything the post is made of, resolved and verified before anything is
  // sent. Throws by name on each missing piece — a publish that fails after
  // the first asset is worse than one that never starts.
  _compose: function(row, rowNumber) {
    var contentId = String(row[CONFIG.COLUMN_NAMES.CONTENT_ID] || '').trim();

    if (!contentId) {
      throw new Error('Row ' + rowNumber + ' has no Content ID, so its editorial row cannot be found.');
    }

    // Page and final copy live in the Content Pipeline: the Visual Pipeline's
    // read-only section carries the creative package, not the schedule. This
    // reads upstream, which is the direction the data already flows — nothing
    // here writes back.
    var editorial = this._editorialRow(contentId);

    var page = String(editorial['Publishing Page'] || '').trim();

    if (!page) {
      throw new Error(
        'No Publishing Page on the Content Pipeline row for ' + contentId +
        '. This worker never falls back to a default page.'
      );
    }

    if (CONFIG.CONTROLLED_VOCABULARY['Publishing Page'].indexOf(page) === -1) {
      throw new Error(
        'Publishing Page is "' + page + '", which is not one of ' +
        CONFIG.CONTROLLED_VOCABULARY['Publishing Page'].join(', ') + '.'
      );
    }

    // Already carries the merged hashtag block — _composeFinalPostCopy appends
    // it when the Creative Director writes. Composing it again here would
    // duplicate the tags.
    var copy = String(editorial['Creative Director Post Copy'] || '').trim();

    if (!copy) {
      throw new Error(
        'Creative Director Post Copy is empty for ' + contentId +
        '. Nothing publishes without the approved copy.'
      );
    }

    var assets = this._assets(row, contentId);
    var credentials = this._credentials(page);

    return {
      contentId: contentId,
      page: page,
      pageId: credentials.pageId,
      token: credentials.token,
      copy: copy,
      assets: assets
    };
  },

  _editorialRow: function(contentId) {
    var sheetName = CONFIG.SHEET_NAME;
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);

    if (!sheet) {
      throw new Error('Sheet "' + sheetName + '" not found.');
    }

    var idCol = SheetSchema._getColumnMap(sheetName)[CONFIG.COLUMN_NAMES.CONTENT_ID];
    var lastRow = sheet.getLastRow();

    if (!idCol || lastRow < CONFIG.DATA_START_ROW) {
      throw new Error('Content Pipeline has no readable Content ID column.');
    }

    var ids = sheet
      .getRange(CONFIG.DATA_START_ROW, idCol, lastRow - CONFIG.DATA_START_ROW + 1, 1)
      .getValues();

    for (var i = 0; i < ids.length; i++) {
      if (String(ids[i][0]).trim() === contentId) {
        return SheetSchema.getRowData(CONFIG.DATA_START_ROW + i, sheetName);
      }
    }

    throw new Error(
      'No Content Pipeline row carries Content ID ' + contentId +
      '. The page and the approved copy both live there.'
    );
  },

  // Approved artwork, as bytes. Final Asset URL is what Visual QA wrote on
  // approval; Generated Assets is not read here, because it is whatever the
  // last generation produced and that may be a set QA rejected.
  _assets: function(row, contentId) {
    var cell = String(row['Final Asset URL'] || '').trim();

    if (!cell) {
      throw new Error(
        'Final Asset URL is empty for ' + contentId +
        '. Visual QA writes it on approval, so an empty one means this row was ' +
        'never approved.'
      );
    }

    var refs = cell.split(',');
    var assets = [];

    for (var i = 0; i < refs.length; i++) {
      var ref = refs[i].trim();

      if (!ref) {
        continue;
      }

      var idMatch = ref.match(/[-\w]{25,}/);
      var fileId = idMatch ? idMatch[0] : ref;

      try {
        assets.push({ blob: DriveApp.getFileById(fileId).getBlob(), ref: ref });
      } catch (e) {
        // Never partial. Publishing three cards of a four-card carousel breaks
        // the sequence the copy refers to, and the post cannot be edited into
        // shape afterwards.
        throw new Error(
          'Asset ' + (i + 1) + ' of ' + refs.length + ' could not be read from ' +
          'Drive (' + ref + '): ' + e.toString()
        );
      }
    }

    if (!assets.length) {
      throw new Error('Final Asset URL for ' + contentId + ' held no readable asset.');
    }

    var declared = parseInt(row['Asset Count'], 10);

    if (!isNaN(declared) && declared > 0 && assets.length !== declared) {
      throw new Error(
        assets.length + ' approved asset(s) against an Asset Count of ' + declared +
        ' for ' + contentId + '. Publishing a short set breaks the sequence.'
      );
    }

    return assets;
  },

  // One page, one token. Both from Script Properties: a page token posts as the
  // brand, and it does not belong in a source file that gets copied between
  // deployments.
  _credentials: function(page) {
    var cfg = this._config();
    var key = String(page).toUpperCase().replace(/[^A-Z0-9]+/g, '_');
    var properties = PropertiesService.getScriptProperties();

    var pageId = properties.getProperty(cfg.PAGE_ID_PREFIX + key);
    var token = properties.getProperty(cfg.PAGE_TOKEN_PREFIX + key);

    if (!pageId || !String(pageId).trim()) {
      throw new Error(
        'No Script Property "' + cfg.PAGE_ID_PREFIX + key + '" for the ' + page +
        ' page. Add the numeric Facebook page ID.'
      );
    }

    if (!token || !String(token).trim()) {
      throw new Error(
        'No Script Property "' + cfg.PAGE_TOKEN_PREFIX + key + '" for the ' + page +
        ' page. Add a long-lived page access token with pages_manage_posts.'
      );
    }

    return { pageId: String(pageId).trim(), token: String(token).trim() };
  },

  // --------------------------------------------------------------- publish

  _publish: function(post) {
    return post.assets.length > 1
      ? this._publishCarousel(post)
      : this._publishSingle(post);
  },

  _publishSingle: function(post) {
    var response = this._call(post.pageId + '/photos', {
      source: post.assets[0].blob,
      caption: post.copy,
      published: 'true',
      access_token: post.token
    });

    var id = response.post_id || response.id;

    if (!id) {
      throw new Error('Facebook accepted the photo but returned no post id.');
    }

    return { url: 'https://www.facebook.com/' + id, id: id };
  },

  // Every card is uploaded unpublished first, then one feed post attaches them
  // all. Uploading with published=true would put each card on the page as its
  // own post — which is how a four-card carousel becomes four posts nobody
  // asked for, and there is no way back from that but deleting four times.
  _publishCarousel: function(post) {
    var mediaIds = [];

    for (var i = 0; i < post.assets.length; i++) {
      var uploaded = this._call(post.pageId + '/photos', {
        source: post.assets[i].blob,
        published: 'false',
        access_token: post.token
      });

      if (!uploaded.id) {
        throw new Error(
          'Card ' + (i + 1) + ' uploaded but Facebook returned no media id. ' +
          (mediaIds.length
            ? mediaIds.length + ' card(s) are already uploaded unpublished and ' +
              'will not appear on the page; delete them from the page\'s photo ' +
              'library if you re-run.'
            : '')
        );
      }

      mediaIds.push(uploaded.id);
    }

    var payload = {
      message: post.copy,
      access_token: post.token
    };

    for (var m = 0; m < mediaIds.length; m++) {
      payload['attached_media[' + m + ']'] =
        JSON.stringify({ media_fbid: mediaIds[m] });
    }

    var feed = this._call(post.pageId + '/feed', payload);

    if (!feed.id) {
      throw new Error('Facebook accepted the carousel but returned no post id.');
    }

    return { url: 'https://www.facebook.com/' + feed.id, id: feed.id };
  },

  _call: function(path, payload) {
    var cfg = this._config();
    var url = cfg.GRAPH_HOST + '/' + cfg.GRAPH_VERSION + '/' + path;

    var response = RetryPolicy.fetch(function() {
      return UrlFetchApp.fetch(url, {
        method: 'post',
        payload: payload,
        muteHttpExceptions: true
      });
    }, 'Graph ' + path);

    var body = response.getContentText();
    var code = response.getResponseCode();
    var parsed;

    try {
      parsed = JSON.parse(body);
    } catch (e) {
      throw new Error('Facebook returned unparseable response (HTTP ' + code +
        '): ' + body.substring(0, 300));
    }

    if (code !== 200 || parsed.error) {
      var error = parsed.error || {};
      throw new Error(
        'Facebook refused (HTTP ' + code + '): ' +
        (error.message || body.substring(0, 300)) +
        (error.code ? ' [code ' + error.code + ']' : '') +
        (error.type ? ' [' + error.type + ']' : '')
      );
    }

    return parsed;
  },

  // ----------------------------------------------------------------- write

  _write: function(rowNumber, values) {
    var sheetName = CONFIG.VISUAL_PIPELINE.SHEET_NAME;

    for (var column in values) {
      if (!SheetWriter.writeCell(rowNumber, column, values[column], sheetName)) {
        Logger.log(
          'PUBLISHING_WRITE_FAILED | Row ' + rowNumber + ' | ' + column +
          ' | ' + String(values[column]).substring(0, 100)
        );
      }
    }
  }
};

// ---------------------------------------------------------------------------
// END SOURCE FILE: PublishingRunner.gs
// ---------------------------------------------------------------------------


// ---------------------------------------------------------------------------
// BEGIN SOURCE FILE: AdsRunner.gs
// ---------------------------------------------------------------------------
// ================================
// W10 — PAID ADS WORKER
//
// Drafts an ad specification for a post that is already live.
//
// It does not spend money. It creates no campaign, touches no ad account and
// holds no ad credentials — it writes a row a human reads, edits and executes.
// That boundary is the design and not a phase: automating spend before the
// chain has a production track record would put a model in charge of the only
// irreversible thing more expensive than publishing.
//
// What it is actually for is the gap Audit B measured. The campaign card
// carries Target Audience and Primary KPI on every campaign, and nothing
// downstream has ever read them — 88% of finished posts sit in one funnel stage
// and none is built to convert. This worker is where the card's audience and
// KPI finally have to become something specific enough to buy against.
// ================================

var AdsRunner = {

  WORKER_NAME: 'PAID_ADS_WORKER',

  _config: function() {
    return CONFIG.PAID_ADS || {};
  },

  // ------------------------------------------------------------------ sheet

  // Created on first use rather than by hand. A missing column is the failure
  // mode this system already has a trap for — SheetWriter skips it, logs one
  // line and reports success — so the tab is built from the same list the
  // writer uses.
  ensureSheet: function() {
    var config = this._config();
    var name = config.SHEET_NAME;
    var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = spreadsheet.getSheetByName(name);

    if (!sheet) {
      sheet = spreadsheet.insertSheet(name);
      sheet.appendRow(config.COLUMNS);

      var header = sheet.getRange(1, 1, 1, config.COLUMNS.length);
      header.setFontWeight('bold');
      header.setBackground('#1a73e8');
      header.setFontColor('#ffffff');
      sheet.setFrozenRows(1);

      Logger.log('ADS | created "' + name + '" with ' + config.COLUMNS.length + ' columns');
      return sheet;
    }

    // An existing tab may predate a column being added here. Append what is
    // missing rather than assuming the shape.
    var width = Math.max(sheet.getLastColumn(), 1);
    var existing = sheet.getRange(1, 1, 1, width).getValues()[0]
      .map(function(h) { return String(h).trim(); });

    for (var i = 0; i < config.COLUMNS.length; i++) {
      if (existing.indexOf(config.COLUMNS[i]) === -1) {
        sheet.getRange(1, sheet.getLastColumn() + 1).setValue(config.COLUMNS[i]);
        Logger.log('ADS | added missing column "' + config.COLUMNS[i] + '"');
      }
    }

    return sheet;
  },

  _columnMap: function(sheet) {
    var width = Math.max(sheet.getLastColumn(), 1);
    var header = sheet.getRange(1, 1, 1, width).getValues()[0];
    var map = {};

    for (var i = 0; i < header.length; i++) {
      var name = String(header[i]).trim();
      if (name) {
        map[name] = i + 1;
      }
    }

    return map;
  },

  // ------------------------------------------------------------------ batch

  // Every published row that has no draft yet. Publishing is the trigger: an ad
  // specification for a post that does not exist has nothing to point at.
  run: function(startRow, endRow) {
    // Identifiers from Script Properties where set, CONFIG.gs otherwise.
    // Idempotent; see ConfigResolver (Audit A, F17).
    ConfigResolver.apply();

    var sheetName = CONFIG.VISUAL_PIPELINE.SHEET_NAME;
    var lastRow = SheetSchema.getLastRow(sheetName);

    startRow = Math.max(startRow, CONFIG.DATA_START_ROW);
    endRow = Math.min(endRow, lastRow);

    var sheet = this.ensureSheet();
    var drafted = {};
    var existing = this._existingContentIds(sheet);

    var batchStart = new Date().getTime();
    var runStart = RunControl.runStart(batchStart);
    var timeoutMs = (CONFIG.BATCH_TIMEOUT_SECONDS || 300) * 1000;

    var written = 0;
    var skipped = 0;
    var failed = 0;
    var interrupted = false;
    var nextRow = startRow;

    for (var row = startRow; row <= endRow; row++) {
      if (RunControl.stopRequested(runStart)) {
        interrupted = true;
        RunControl.clear();
        Logger.log('OPERATOR_STOP | PAID_ADS | stopped before row ' + row);
        break;
      }

      nextRow = row + 1;

      try {
        var visual = SheetSchema.getRowData(row, sheetName);
        var contentId = String(visual[CONFIG.COLUMN_NAMES.CONTENT_ID] || '').trim();
        var liveUrl = String(visual['Live Post URL'] || '').trim();

        if (!contentId || !liveUrl) {
          skipped++;
          continue;
        }

        if (existing[contentId] || drafted[contentId]) {
          skipped++;
          continue;
        }

        this.draft(visual, contentId, liveUrl, sheet);
        drafted[contentId] = true;
        written++;

      } catch (e) {
        failed++;
        Logger.logFailure(this.WORKER_NAME, row, 0, e.message || e.toString());
      }

      if (row < endRow && (new Date().getTime() - batchStart) >= timeoutMs) {
        interrupted = true;
        break;
      }
    }

    Logger.logExecution({
      worker: this.WORKER_NAME,
      row: startRow + '-' + (nextRow - 1),
      status: interrupted ? 'TIMEOUT' : (failed === 0 ? 'SUCCESS' : 'PARTIAL'),
      runtime: new Date().getTime() - batchStart,
      details: written + ' drafted, ' + skipped + ' skipped, ' + failed + ' failed' +
        (interrupted ? ' (resume from row ' + nextRow + ')' : '')
    });

    return {
      drafted: written, skipped: skipped, failed: failed,
      interrupted: interrupted, nextRow: interrupted ? nextRow : null
    };
  },

  // A draft already written is not rewritten. The operator edits these rows —
  // budget, targeting, the launch decision — and a second run that overwrote
  // them would delete a human's work with a model's guess.
  _existingContentIds: function(sheet) {
    var map = this._columnMap(sheet);
    var idCol = map['Content ID'];
    var lastRow = sheet.getLastRow();
    var seen = {};

    if (!idCol || lastRow < 2) {
      return seen;
    }

    var values = sheet.getRange(2, idCol, lastRow - 1, 1).getValues();

    for (var i = 0; i < values.length; i++) {
      var id = String(values[i][0] || '').trim();
      if (id) {
        seen[id] = true;
      }
    }

    return seen;
  },

  // ------------------------------------------------------------------ draft

  draft: function(visual, contentId, liveUrl, sheet) {
    var startTime = new Date().getTime();
    var config = this._config();

    var campaignName = String(visual['Campaign Name'] || '').trim();
    var card = this._campaignCard(campaignName);
    var editorial = this._editorialRow(contentId);

    var built = this._buildPrompt(card, editorial, visual, liveUrl);

    var response = AIProvider.call(built.text, {
      temperature: config.temperature,
      provider: config.provider,
      model: config.model,
      cachePrefix: built.staticPart
    });

    var parsed = this._parse(response.text);

    var values = {
      'Content ID': contentId,
      'Campaign Name': campaignName,
      'Page': String(editorial['Publishing Page'] || '').trim(),
      'Live Post URL': liveUrl,
      'Drafted At': new Date()
    };

    for (var field in config.OUTPUT_FIELDS) {
      values[field] = parsed[field] || '';
    }

    this._append(sheet, values);

    Logger.logSuccess(
      this.WORKER_NAME, contentId, new Date().getTime() - startTime,
      response.inputTokens, response.outputTokens,
      'Drafted an ad specification for ' + campaignName +
      ' | Objective: ' + (parsed['Objective'] || '(none)') +
      ' | Budget and launch left to the operator' +
      ' | ' + AIProvider.cacheSummary(response)
    );

    return values;
  },

  _append: function(sheet, values) {
    var map = this._columnMap(sheet);
    var width = sheet.getLastColumn();
    var row = new Array(width);

    for (var column in values) {
      var index = map[column];
      if (index) {
        row[index - 1] = values[column];
      }
    }

    for (var i = 0; i < row.length; i++) {
      if (row[i] === undefined) {
        row[i] = '';
      }
    }

    sheet.appendRow(row);
  },

  // ---------------------------------------------------------------- inputs

  _campaignCard: function(campaignName) {
    var sheetName = CONFIG.CAMPAIGN_CARDS_SHEET_NAME;
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);

    if (!sheet || !campaignName) {
      throw new Error(
        'No campaign card is reachable for "' + campaignName + '". The card ' +
        'carries the audience and the KPI, which is the whole input to an ad ' +
        'specification.'
      );
    }

    var nameCol = SheetSchema._getColumnMap(sheetName)['Campaign Name'];
    var lastRow = sheet.getLastRow();

    if (!nameCol || lastRow < CONFIG.DATA_START_ROW) {
      throw new Error('Campaign Cards has no readable Campaign Name column.');
    }

    var names = sheet
      .getRange(CONFIG.DATA_START_ROW, nameCol, lastRow - CONFIG.DATA_START_ROW + 1, 1)
      .getValues();

    var wanted = campaignName.trim().toLowerCase();

    for (var i = 0; i < names.length; i++) {
      if (String(names[i][0]).trim().toLowerCase() === wanted) {
        return SheetSchema.getRowData(CONFIG.DATA_START_ROW + i, sheetName);
      }
    }

    // Refusal, not a default. A generic audience spends real money on the wrong
    // people, and it does it silently — the ad runs, the numbers look like
    // numbers, and nothing says the targeting was invented.
    throw new Error(
      'No campaign card named "' + campaignName + '". Build it first: an ad ' +
      'drafted without the card would be targeting invented from a post.'
    );
  },

  _editorialRow: function(contentId) {
    var sheetName = CONFIG.SHEET_NAME;
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
    var idCol = sheet ? SheetSchema._getColumnMap(sheetName)[CONFIG.COLUMN_NAMES.CONTENT_ID] : null;
    var lastRow = sheet ? sheet.getLastRow() : 0;

    if (!idCol || lastRow < CONFIG.DATA_START_ROW) {
      return {};
    }

    var ids = sheet
      .getRange(CONFIG.DATA_START_ROW, idCol, lastRow - CONFIG.DATA_START_ROW + 1, 1)
      .getValues();

    for (var i = 0; i < ids.length; i++) {
      if (String(ids[i][0]).trim() === contentId) {
        return SheetSchema.getRowData(CONFIG.DATA_START_ROW + i, sheetName);
      }
    }

    return {};
  },

  // ---------------------------------------------------------------- prompt

  // Returns { text, staticPart }. The static part is the manual, the brand
  // documents and the vocabulary — identical on every row, and where the cache
  // breakpoint goes.
  _buildPrompt: function(card, editorial, visual, liveUrl) {
    var config = this._config();
    var folderId = PropertiesService.getScriptProperties()
      .getProperty('ADS_PROMPTS_FOLDER_ID') ||
      CONFIG.ADS_PROMPTS_FOLDER_ID || CONFIG.PROMPTS_FOLDER_ID;

    var manual = DriveLoader.loadMarkdown(config.promptFile, folderId);

    if (!manual) {
      throw new Error(
        'Could not load ' + config.promptFile + '. Put it in the prompts ' +
        'folder, or set ADS_PROMPTS_FOLDER_ID in Script Properties.'
      );
    }

    var docs = [];
    for (var d = 0; d < (config.docs || []).length; d++) {
      var content = DriveLoader.loadMarkdown(config.docs[d], CONFIG.DOCS_FOLDER_ID);
      if (content) {
        docs.push('## ' + config.docs[d] + '\n\n' + content);
      }
    }

    var vocabulary = [];
    for (var field in config.OUTPUT_FIELDS) {
      if (config.OUTPUT_FIELDS[field] === 'controlled' &&
          CONFIG.CONTROLLED_VOCABULARY[field]) {
        vocabulary.push(field + ': ' + CONFIG.CONTROLLED_VOCABULARY[field].join(' | '));
      }
    }

    var schemaLines = [];
    for (var out in config.OUTPUT_FIELDS) {
      schemaLines.push('  "' + out + '": "..."');
    }

    var staticPart = [
      'You are executing inside the INSAN Healthcare AI Operating System.',
      'Worker: PAID ADS',
      '',
      'You draft an advertising specification. You do not spend money, you do',
      'not launch anything, and a human reads and edits everything you write.',
      '',
      '=== YOUR TRAINING MANUAL ===',
      '',
      manual,
      '',
      '=== END OF TRAINING MANUAL ===',
      '',
      docs.length ? '=== PROJECT DOCUMENTATION ===\n\n' +
        docs.join('\n\n---\n\n') + '\n\n=== END OF PROJECT DOCUMENTATION ===' : '',
      '',
      vocabulary.length ? '=== CONTROLLED VOCABULARY (EXACT VALUES ONLY) ===\n\n' +
        vocabulary.join('\n') + '\n\n=== END OF CONTROLLED VOCABULARY ===' : ''
    ].filter(function(s) { return s; }).join('\n');

    var cardFields = [
      'Campaign Name', 'Service Level', 'Business Goal', 'Marketing Goal',
      'Core Message', 'Trust Promise', 'CTA Strategy', 'Primary KPI',
      'Target Audience', 'Core Positioning', 'Human Insight',
      'Non-Negotiable Rules'
    ];

    var lines = ['=== THE CAMPAIGN THIS POST BELONGS TO ===', ''];

    for (var c = 0; c < cardFields.length; c++) {
      var value = String(card[cardFields[c]] || '').trim();
      lines.push(cardFields[c] + ': ' + (value || '[EMPTY]'));
    }

    lines.push('', '=== THE POST, AS PUBLISHED ===', '');
    lines.push('Live post: ' + liveUrl);
    lines.push('Page: ' + String(editorial['Publishing Page'] || '').trim());
    lines.push('Content Format: ' + String(visual['Content Format'] || '').trim());
    lines.push('Content Funnel Stage: ' + String(editorial['Content Funnel Stage'] || '').trim());
    lines.push('Content Objective: ' + String(editorial['Content Objective'] || '').trim());
    lines.push('');
    lines.push('Published copy:');
    lines.push(String(editorial['Creative Director Post Copy'] || '').trim());

    lines.push('', '=== WHAT YOU RETURN ===', '');
    lines.push('Valid JSON, nothing before or after it, no markdown fence:');
    lines.push('');
    lines.push('{');
    lines.push(schemaLines.join(',\n'));
    lines.push('}');
    lines.push('');
    lines.push('Budget is not yours to set and is not in the schema. Neither is');
    lines.push('Ad Status, Ad ID or Results — those record what a human did after');
    lines.push('reading this. Filling them would be reporting a spend that never');
    lines.push('happened.');
    lines.push('');
    lines.push('Targeting must be derivable from the campaign card above. If the');
    lines.push('card does not support a choice, say so in that field rather than');
    lines.push('inventing an interest list that will be paid for.');

    var dynamic = lines.join('\n');

    return { text: staticPart + '\n\n' + dynamic, staticPart: staticPart };
  },

  _parse: function(text) {
    var json = ResponseParser._extractJSON(ResponseParser._cleanResponseText(text));

    if (!json) {
      throw new Error(
        'The Paid Ads worker did not return valid JSON. First 300 characters: ' +
        String(text || '').substring(0, 300)
      );
    }

    var config = this._config();
    var values = {};

    for (var field in config.OUTPUT_FIELDS) {
      var value = String(json[field] === undefined ? '' : json[field]).trim();

      // Out-of-vocabulary values are recorded and kept, never silently
      // corrected: a wrong objective a human can see beats a plausible one
      // this worker chose on its behalf.
      if (config.OUTPUT_FIELDS[field] === 'controlled' && value &&
          CONFIG.CONTROLLED_VOCABULARY[field] &&
          CONFIG.CONTROLLED_VOCABULARY[field].indexOf(value) === -1) {
        Logger.logVocabularyDeviation(
          this.WORKER_NAME, 0, field, value, CONFIG.CONTROLLED_VOCABULARY[field]
        );
      }

      values[field] = value;
    }

    return values;
  }
};

// ---------------------------------------------------------------------------
// END SOURCE FILE: AdsRunner.gs
// ---------------------------------------------------------------------------


// ---------------------------------------------------------------------------
// BEGIN SOURCE FILE: EnablementRunner.gs
// ---------------------------------------------------------------------------
// ================================
// OPERATIONS ENABLEMENT — W11
//
// Every other worker in this system faces outward, at a patient. This one faces
// inward, at the people who have to meet what those workers promised.
//
// The failure it exists to stop has no error message. A campaign runs, a patient
// reads "the team already knows about your case before you arrive," and phones
// the next morning — and the person answering has never seen the post. Nothing
// in the pipeline notices. The patient does.
//
// WHAT MAKES IT DIFFERENT FROM EVERY OTHER WORKER: its output is read as an
// instruction by staff inside a hospital. A weak advert is a wasted impression;
// a wrong operational instruction is a policy nobody approved being followed on
// a ward. That asymmetry is why this worker refuses knowledge files with
// unresolved gaps, and why nothing reaches the channel without the operator
// approving it by hand.
//
// See CONFIG.ENABLEMENT for the three filters and why their order matters.
// ================================

var EnablementRunner = {

  WORKER_NAME: 'OPERATIONS_ENABLEMENT_WORKER',

  _config: function() {
    return CONFIG.ENABLEMENT || {};
  },

  // ----------------------------------------------------------------- sheets

  // Both tabs, built from the same column lists the writers use. Same reasoning
  // as AdsRunner.ensureSheet: a missing column is skipped silently by the
  // writer and the run still reports success.
  ensureSheets: function() {
    return {
      briefs: this._ensureSheet(this._config().SHEET_NAME, this._config().COLUMNS),
      ledger: this._ensureSheet(this._config().LEDGER_SHEET_NAME,
        this._config().LEDGER_COLUMNS)
    };
  },

  _ensureSheet: function(name, columns) {
    var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = spreadsheet.getSheetByName(name);

    if (!sheet) {
      sheet = spreadsheet.insertSheet(name);
      sheet.appendRow(columns);

      var header = sheet.getRange(1, 1, 1, columns.length);
      header.setFontWeight('bold');
      header.setBackground('#0d1b2a');
      header.setFontColor('#ffffff');
      sheet.setFrozenRows(1);

      Logger.log('ENABLEMENT | created "' + name + '" with ' + columns.length + ' columns');
      return sheet;
    }

    var width = Math.max(sheet.getLastColumn(), 1);
    var existing = sheet.getRange(1, 1, 1, width).getValues()[0]
      .map(function(h) { return String(h).trim(); });

    for (var i = 0; i < columns.length; i++) {
      if (existing.indexOf(columns[i]) === -1) {
        sheet.getRange(1, sheet.getLastColumn() + 1).setValue(columns[i]);
        Logger.log('ENABLEMENT | added missing column "' + columns[i] + '"');
      }
    }

    return sheet;
  },

  _columnMap: function(sheet) {
    var width = Math.max(sheet.getLastColumn(), 1);
    var header = sheet.getRange(1, 1, 1, width).getValues()[0];
    var map = {};

    for (var i = 0; i < header.length; i++) {
      var name = String(header[i]).trim();
      if (name) {
        map[name] = i + 1;
      }
    }

    return map;
  },

  // ------------------------------------------------------- FILTER 1: pages

  // Approved Content Pipeline rows, grouped so that the same campaign saying the
  // same thing on three pages is one entry.
  //
  // Approval is the trigger, not publication: the team has to be ready BEFORE
  // the post goes out. A patient sees the advert at 8am and phones at 9.
  collectApproved: function(startRow, endRow) {
    var sheetName = CONFIG.SHEET_NAME;
    var lastRow = SheetSchema.getLastRow(sheetName);

    startRow = Math.max(startRow || CONFIG.DATA_START_ROW, CONFIG.DATA_START_ROW);
    endRow = Math.min(endRow || lastRow, lastRow);

    var groups = {};
    var order = [];

    for (var row = startRow; row <= endRow; row++) {
      var data = SheetSchema.getRowData(row, sheetName);

      if (String(data['Creative Director Review Status'] || '').trim() !== 'Approved') {
        continue;
      }

      var copy = String(data['Creative Director Post Copy'] || '').trim();
      var campaign = String(data['Campaign Name'] || '').trim();

      if (!copy || !campaign) {
        continue;
      }

      var key = this.groupKey(data);

      if (!groups[key]) {
        groups[key] = {
          key: key,
          campaign: campaign,
          angle: String(data['Content Angle'] || '').trim(),
          objective: String(data['Cycle Objective'] || '').trim(),
          contentIds: [],
          pages: [],
          copies: [],
          earliestDate: null
        };
        order.push(key);
      }

      var group = groups[key];
      var contentId = String(data[CONFIG.COLUMN_NAMES.CONTENT_ID] || '').trim();
      var page = String(data['Publishing Page'] || '').trim();

      if (contentId) group.contentIds.push(contentId);
      if (page && group.pages.indexOf(page) === -1) group.pages.push(page);

      // One copy per group is enough for the model to read the promise. Keeping
      // all three would triple the tokens to say the same thing in three
      // slightly different ways.
      if (!group.copies.length) group.copies.push(copy);

      var date = data['Publishing Date'];
      if (date && (!group.earliestDate || date < group.earliestDate)) {
        group.earliestDate = date;
      }
    }

    return order.map(function(k) { return groups[k]; });
  },

  // The grouping key, from CONFIG so the decision is stated once and checkable.
  groupKey: function(rowData) {
    var by = this._config().GROUP_BY || ['Campaign Name'];
    var parts = [];

    for (var i = 0; i < by.length; i++) {
      parts.push(String(rowData[by[i]] || '').trim().toLowerCase());
    }

    return parts.join('::');
  },

  // ------------------------------------------------------ FILTER 3: ledger

  // Campaign + behaviour slug. Deliberately NOT the headline: the same
  // operational ask reworded is the same ask, and a fingerprint that changes
  // when the wording changes would let every cycle re-send everything.
  fingerprint: function(campaign, slug) {
    return String(campaign || '').trim().toLowerCase() + '::' +
      String(slug || '').trim().toLowerCase();
  },

  readLedger: function(sheet) {
    var map = this._columnMap(sheet);
    var lastRow = sheet.getLastRow();
    var entries = {};

    if (lastRow < CONFIG.DATA_START_ROW || !map['Fingerprint']) {
      return entries;
    }

    var width = Math.max(sheet.getLastColumn(), 1);
    var values = sheet
      .getRange(CONFIG.DATA_START_ROW, 1, lastRow - CONFIG.DATA_START_ROW + 1, width)
      .getValues();

    for (var i = 0; i < values.length; i++) {
      var fp = String(values[i][map['Fingerprint'] - 1] || '').trim();
      if (!fp) continue;

      entries[fp] = {
        fingerprint: fp,
        campaign: String(values[i][map['Campaign Name'] - 1] || '').trim(),
        slug: String(values[i][map['Behaviour Slug'] - 1] || '').trim(),
        lastSent: values[i][map['Last Sent'] - 1] || null,
        timesSent: parseInt(values[i][map['Times Sent'] - 1], 10) || 0,
        row: CONFIG.DATA_START_ROW + i
      };
    }

    return entries;
  },

  // Three outcomes, and the middle one is the whole point of the ledger.
  //
  //   new      — never sent. Produce it.
  //   covered  — sent recently. Skip, and say which brief already covers it.
  //   restate  — sent long enough ago that staff have turned over since. ASK
  //              the operator; do not decide. Blocking here would mean a nurse
  //              who joined in March never sees what went out in January.
  ledgerVerdict: function(entry, now) {
    if (!entry) {
      return { state: 'new' };
    }

    var months = this._config().RESTATE_AFTER_MONTHS || 4;
    var last = entry.lastSent ? new Date(entry.lastSent) : null;

    if (!last || isNaN(last.getTime())) {
      return { state: 'covered', since: null, times: entry.timesSent };
    }

    var elapsedMs = now.getTime() - last.getTime();
    var monthsMs = months * 30.44 * 24 * 60 * 60 * 1000;

    if (elapsedMs >= monthsMs) {
      return {
        state: 'restate',
        since: last,
        times: entry.timesSent,
        monthsElapsed: Math.floor(elapsedMs / (30.44 * 24 * 60 * 60 * 1000))
      };
    }

    return { state: 'covered', since: last, times: entry.timesSent };
  },

  // --------------------------------------------------------- the rhythm cap

  // How many pieces have already reached the channel in the trailing seven
  // days. Everything over the cap is Queued rather than dropped — the operator
  // set a pace, not a ceiling on what matters.
  sentThisWeek: function(ledger, now) {
    var weekMs = 7 * 24 * 60 * 60 * 1000;
    var count = 0;

    for (var fp in ledger) {
      var last = ledger[fp].lastSent ? new Date(ledger[fp].lastSent) : null;
      if (last && !isNaN(last.getTime()) && (now.getTime() - last.getTime()) < weekMs) {
        count++;
      }
    }

    return count;
  },

  // ------------------------------------------------------------- the gate

  // A knowledge file with an unresolved gap marker produces no operational
  // instruction at all.
  //
  // This is stricter than the campaign side, on purpose. CardBuilder refuses a
  // gapped file because a guessed strategy becomes every post about an entity.
  // Here the consequence is heavier: a guessed instruction is a hospital
  // following a policy nobody approved. Where marketing risks a wasted
  // impression, this risks a patient meeting a promise the ward never agreed to.
  knowledgeGate: function(content, fileName) {
    if (!this._config().REFUSE_ON_KNOWLEDGE_GAPS) {
      return { ok: true, gaps: [] };
    }

    var check = CardBuilder.validate(content, fileName);

    if (check.problems.length) {
      return {
        ok: false,
        reason: 'structurally incomplete: ' + check.problems[0],
        gaps: check.gaps
      };
    }

    if (check.gaps.length) {
      return {
        ok: false,
        reason: check.gaps.length + ' unresolved operator gap(s), first at line ' +
          check.gaps[0].line + ' under "' + check.gaps[0].section + '"',
        gaps: check.gaps
      };
    }

    return { ok: true, gaps: [] };
  },

  // -------------------------------------------------- FILTER 2: the model

  // ONE call per campaign per cycle, not one per post. The model is given every
  // approved promise the campaign makes and asked what the team must do about
  // them — which is where thirty posts collapse into a handful of behaviours.
  //
  // Static first, dynamic last: the manual and the project documents are
  // identical across campaigns, so they sit in the cached prefix.
  _buildPrompt: function(campaign, groups, knowledge, ledgerSlugs) {
    var config = this._config();
    var folderId = PropertiesService.getScriptProperties()
      .getProperty('ENABLEMENT_PROMPTS_FOLDER_ID') ||
      CONFIG.ENABLEMENT_PROMPTS_FOLDER_ID || CONFIG.PROMPTS_FOLDER_ID;

    var manual = DriveLoader.loadMarkdown(config.promptFile, folderId);

    if (!manual) {
      throw new Error(
        'Could not load ' + config.promptFile + '. Put it in the prompts ' +
        'folder, or set ENABLEMENT_PROMPTS_FOLDER_ID in Script Properties.'
      );
    }

    var docs = [];
    for (var d = 0; d < (config.docs || []).length; d++) {
      var name = config.docs[d];
      docs.push(
        '=== PROJECT DOCUMENT: ' + name + ' ===',
        DriveLoader.loadMarkdown(name, CONFIG.DOCS_FOLDER_ID) || '[not loaded]',
        ''
      );
    }

    var staticPart = [
      'You are executing inside the INSAN Healthcare AI Operating System.',
      'Worker: ' + this.WORKER_NAME,
      '',
      'You face inward. Every other worker in this system writes to a patient;',
      'you write to the staff who have to meet what those workers promised.',
      '',
      '=== YOUR TRAINING MANUAL ===',
      '',
      manual,
      '',
      '=== END OF TRAINING MANUAL ===',
      ''
    ].concat(docs).join('\n');

    var promiseLines = [];
    for (var g = 0; g < groups.length; g++) {
      promiseLines.push(
        '--- approved post ' + (g + 1) + ' of ' + groups.length +
        ' | angle: ' + (groups[g].angle || 'unspecified') +
        ' | pages: ' + (groups[g].pages.join(', ') || 'unspecified') + ' ---',
        groups[g].copies[0] || '',
        ''
      );
    }

    var alreadyCovered = ledgerSlugs && ledgerSlugs.length
      ? [
          'The team has ALREADY been briefed on these behaviours for this',
          'campaign. Do not return them again, and do not return a reworded',
          'version of one — the team has seen it:',
          '',
          '  ' + ledgerSlugs.join('\n  '),
          ''
        ].join('\n')
      : 'Nothing has been sent to the team about this campaign yet.\n';

    var dynamicPart = [
      '=== KNOWLEDGE FILE: ' + campaign + ' ===',
      '',
      'The operational source of truth. A behaviour you describe must be',
      'supported by this file — the posts below say what was PROMISED, this',
      'says what is actually true of the service.',
      '',
      knowledge,
      '',
      '=== WHAT THE PATIENT HAS ALREADY BEEN SHOWN ===',
      '',
      'These are the approved posts for this cycle. Every one of them is either',
      'live or about to be. A patient reading them forms an expectation, and',
      'that expectation reaches the front desk within a day.',
      '',
      promiseLines.join('\n'),
      '=== ALREADY BRIEFED ===',
      '',
      alreadyCovered,
      '=== OUTPUT FORMAT ===',
      '',
      'Return a single valid JSON object. No markdown fences, no text around it.',
      '',
      '{',
      '  "behaviours": [',
      '    {',
      '      "slug": "kebab-case-identifier-for-this-behaviour",',
      '      "headline": "...",',
      '      "patient_expects": "...",',
      '      "team_must_do": "...",',
      '      "trust_builder": "...",',
      '      "trust_breaker": "..."',
      '    }',
      '  ]',
      '}',
      '',
      'RULES ON THE NUMBER OF BEHAVIOURS. Return the distinct operational asks,',
      'not one per post. Thirty posts about one service typically ask the team',
      'for three to six different things; if you are returning one per post you',
      'have not understood the task. Two posts that require the same action from',
      'the same person are ONE behaviour.',
      '',
      'RULES ON THE SLUG. It is the identity of the behaviour and it is matched',
      'against future cycles, so it must describe the ACTION and not the',
      'campaign. "update-family-without-being-asked" is right;',
      '"icu-campaign-post-3" is not.',
      '',
      '"team_must_do" must be observable. A patient or a supervisor standing in',
      'the room must be able to see whether it happened. "Respect the family" is',
      'not observable. "Update the family every two hours without waiting to be',
      'asked" is.',
      '',
      'Every field must be in simple Egyptian Arabic, as spoken to hospital',
      'staff — not Classical Arabic, not marketing language. The slug stays in',
      'English, because it is an identifier rather than something anyone reads.',
      '',
      'Never invent a promise the posts did not make, and never invent a',
      'capability the knowledge file does not state. If the posts promise',
      'something the knowledge file does not support, omit it and say so in a',
      '"concerns" array alongside "behaviours".',
      '',
      '=== END OF OUTPUT FORMAT ==='
    ].join('\n');

    return { prompt: staticPart + '\n\n' + dynamicPart, staticPart: staticPart };
  },

  _parse: function(text) {
    var cleaned = String(text || '').trim();

    if (cleaned.indexOf('```') === 0) {
      cleaned = cleaned.replace(/^```(json)?/, '').replace(/```$/, '').trim();
    }

    var first = cleaned.indexOf('{');
    var last = cleaned.lastIndexOf('}');

    if (first === -1 || last <= first) {
      throw new Error(
        'The enablement worker returned no JSON. Response began: ' +
        cleaned.substring(0, 200)
      );
    }

    var parsed = JSON.parse(cleaned.substring(first, last + 1));

    if (!parsed || !parsed.behaviours || !parsed.behaviours.length) {
      throw new Error(
        'The enablement worker returned no behaviours. Response began: ' +
        cleaned.substring(0, 200)
      );
    }

    var out = [];

    for (var i = 0; i < parsed.behaviours.length; i++) {
      var b = parsed.behaviours[i];
      var slug = String(b.slug || '').trim().toLowerCase().replace(/\s+/g, '-');

      // A behaviour with no slug has no identity, so the ledger cannot dedupe
      // it and it would be re-sent every cycle forever. Refused rather than
      // given a generated id, which would look like an identity and not be one.
      if (!slug) {
        Logger.log('ENABLEMENT | dropped a behaviour with no slug: ' +
          String(b.headline || '').substring(0, 60));
        continue;
      }

      out.push({
        slug: slug,
        headline: String(b.headline || '').trim(),
        patientExpects: String(b.patient_expects || '').trim(),
        teamMustDo: String(b.team_must_do || '').trim(),
        trustBuilder: String(b.trust_builder || '').trim(),
        trustBreaker: String(b.trust_breaker || '').trim()
      });
    }

    return { behaviours: out, concerns: parsed.concerns || [] };
  },

  // ------------------------------------------------------------------- run

  // The three filters, in the order that matters: FREE ONES FIRST.
  //
  //   1. group by page      — deterministic, no tokens
  //   2. ledger, per campaign — deterministic, no tokens; a campaign entirely
  //                             covered never reaches the model at all
  //   3. one model call     — only for campaigns with something left to say
  //   4. ledger, per behaviour — the model may still return something covered
  //
  // Nothing is sent here. Rows land as Draft and the operator approves them.
  run: function(startRow, endRow) {
    ConfigResolver.apply();

    var config = this._config();
    var sheets = this.ensureSheets();
    var ledger = this.readLedger(sheets.ledger);
    var now = new Date();
    var runStart = now.getTime();

    var groups = this.collectApproved(startRow, endRow);

    if (!groups.length) {
      return {
        campaigns: 0, written: 0, covered: 0, restate: 0, queued: 0,
        message: 'No approved rows in that range. This worker reads rows the ' +
          'Creative Director has approved — approval is the trigger, because ' +
          'the team has to be ready before the post goes out, not after.'
      };
    }

    // Group the groups, by campaign — the model call is per campaign.
    var byCampaign = {};
    var campaignOrder = [];

    for (var i = 0; i < groups.length; i++) {
      var name = groups[i].campaign;
      if (!byCampaign[name]) {
        byCampaign[name] = [];
        campaignOrder.push(name);
      }
      byCampaign[name].push(groups[i]);
    }

    var written = 0;
    var covered = 0;
    var restate = 0;
    var refused = [];
    var allConcerns = [];

    // The cap counts what has already gone out this week, then everything this
    // run adds on top of it. Queued, never dropped.
    var weekSoFar = this.sentThisWeek(ledger, now);
    var capacity = Math.max(0, (config.MAX_PER_WEEK || 2) - weekSoFar);

    for (var c = 0; c < campaignOrder.length; c++) {
      var campaign = campaignOrder[c];
      var campaignGroups = byCampaign[campaign];

      var knowledge = this._knowledgeFor(campaign);

      if (!knowledge.found) {
        refused.push(campaign + ': ' + knowledge.reason);
        continue;
      }

      var gate = this.knowledgeGate(knowledge.content, knowledge.fileName);

      if (!gate.ok) {
        refused.push(campaign + ': ' + gate.reason);
        Logger.log('ENABLEMENT_REFUSED | ' + campaign + ' | ' + gate.reason);
        continue;
      }

      // What this campaign has already told the team. Passed to the model so it
      // does not spend output re-deriving something that will be discarded.
      var knownSlugs = [];
      for (var fp in ledger) {
        if (ledger[fp].campaign.toLowerCase() === campaign.toLowerCase()) {
          knownSlugs.push(ledger[fp].slug);
        }
      }

      var built = this._buildPrompt(campaign, campaignGroups, knowledge.content, knownSlugs);

      var response = AIProvider.call(built.prompt, {
        temperature: config.temperature,
        provider: config.provider || undefined,
        model: config.model || undefined,
        cachePrefix: built.staticPart
      });

      var parsed = this._parse(response.text);

      for (var b = 0; b < parsed.concerns.length; b++) {
        allConcerns.push(campaign + ': ' + parsed.concerns[b]);
      }

      var contentIds = [];
      var pages = [];
      var earliest = null;

      for (var q = 0; q < campaignGroups.length; q++) {
        contentIds = contentIds.concat(campaignGroups[q].contentIds);
        for (var p = 0; p < campaignGroups[q].pages.length; p++) {
          if (pages.indexOf(campaignGroups[q].pages[p]) === -1) {
            pages.push(campaignGroups[q].pages[p]);
          }
        }
        if (campaignGroups[q].earliestDate &&
            (!earliest || campaignGroups[q].earliestDate < earliest)) {
          earliest = campaignGroups[q].earliestDate;
        }
      }

      for (var n = 0; n < parsed.behaviours.length; n++) {
        var behaviour = parsed.behaviours[n];
        var fingerprint = this.fingerprint(campaign, behaviour.slug);
        var verdict = this.ledgerVerdict(ledger[fingerprint], now);

        var status;
        var previously = '';

        if (verdict.state === 'covered') {
          status = config.STATUS.SKIPPED;
          previously = 'sent ' + (verdict.since ? this._dateOnly(verdict.since) : 'previously') +
            ' (' + verdict.times + 'x)';
          covered++;

        } else if (verdict.state === 'restate') {
          status = config.STATUS.RESTATE;
          previously = 'last sent ' + this._dateOnly(verdict.since) + ', ' +
            verdict.monthsElapsed + ' months ago — staff have turned over since';
          restate++;

        } else if (capacity > 0) {
          status = config.STATUS.DRAFT;
          capacity--;
          written++;

        } else {
          status = config.STATUS.QUEUED;
          previously = 'over the ' + (config.MAX_PER_WEEK || 2) +
            '-per-week pace; nothing is lost, this waits its turn';
          written++;
        }

        this._writeBrief(sheets.briefs, {
          campaign: campaign,
          behaviour: behaviour,
          fingerprint: fingerprint,
          contentIds: contentIds,
          pages: pages,
          cycleStart: earliest,
          status: status,
          previously: previously
        });
      }
    }

    var runtime = new Date().getTime() - runStart;

    Logger.logSuccess(
      this.WORKER_NAME, startRow || CONFIG.DATA_START_ROW, runtime, 0, 0,
      campaignOrder.length + ' campaign(s) | ' + groups.length + ' post group(s) | ' +
      written + ' new | ' + covered + ' already covered | ' + restate + ' to restate' +
      (refused.length ? ' | refused: ' + refused.length : '')
    );

    return {
      campaigns: campaignOrder.length,
      groups: groups.length,
      written: written,
      covered: covered,
      restate: restate,
      refused: refused,
      concerns: allConcerns
    };
  },

  // The campaign's knowledge file, via the card's Knowledge Source column.
  //
  // The join runs backwards here compared with everywhere else — a campaign
  // name to the file it came from, rather than a file to the card it builds —
  // and Knowledge Source is exactly that link, written by CardBuilder when it
  // built the card. Scanning the knowledge base instead would mean reading
  // several hundred KB from Drive to answer a question the sheet already holds.
  //
  // An empty Knowledge Source means the card was hand-written, and a
  // hand-written card has no traceable source of truth behind it. Refused
  // rather than guessed: this worker's output is read as an instruction.
  _knowledgeFor: function(campaignName) {
    var cardSheet = CONFIG.CAMPAIGN_CARDS_SHEET_NAME;
    var lastRow = SheetSchema.getLastRow(cardSheet);
    var wanted = String(campaignName || '').trim().toLowerCase();
    var source = '';

    for (var row = CONFIG.DATA_START_ROW; row <= lastRow; row++) {
      var data = SheetSchema.getRowData(row, cardSheet);

      if (String(data['Campaign Name'] || '').trim().toLowerCase() === wanted) {
        source = String(data['Knowledge Source'] || '').trim();
        break;
      }
    }

    if (!source) {
      return {
        found: false,
        reason: 'no Knowledge Source on the Campaign Cards row for "' +
          campaignName + '". Either the campaign has no card, or the card was ' +
          'written by hand — and a hand-written card has no source of truth ' +
          'behind it to trace an operational instruction to.'
      };
    }

    try {
      var file = CardBuilder.findKnowledgeFile(source);
      return { found: true, content: file.content, fileName: file.name };
    } catch (e) {
      return { found: false, reason: e.message || String(e) };
    }
  },

  _dateOnly: function(date) {
    return Utilities.formatDate(new Date(date),
      Session.getScriptTimeZone(), 'yyyy-MM-dd');
  },

  // ------------------------------------------------------------ the sending

  // Every Approved brief, rendered and sent, then recorded in the ledger.
  //
  // The ledger write is what makes the next cycle cheap: it is the only reason
  // a campaign that runs again in November does not re-send everything it sent
  // in August. Written AFTER the send succeeds — a ledger entry for something
  // that never arrived would silently suppress it forever.
  sendApproved: function() {
    ConfigResolver.apply();

    var config = this._config();
    var sheets = this.ensureSheets();
    var map = this._columnMap(sheets.briefs);
    var lastRow = sheets.briefs.getLastRow();
    var now = new Date();

    var sent = 0;
    var failed = 0;
    var errors = [];

    for (var row = CONFIG.DATA_START_ROW; row <= lastRow; row++) {
      var status = String(sheets.briefs.getRange(row, map['Status']).getValue() || '').trim();
      var gate = EnablementChannel.gate(status);

      if (!gate.send) {
        continue;
      }

      var brief = {
        fingerprint: String(sheets.briefs.getRange(row, map['Brief ID']).getValue() || '').trim(),
        campaign: String(sheets.briefs.getRange(row, map['Campaign Name']).getValue() || '').trim(),
        slug: String(sheets.briefs.getRange(row, map['Behaviour Slug']).getValue() || '').trim(),
        headline: String(sheets.briefs.getRange(row, map['Headline']).getValue() || '').trim(),
        patientExpects: String(sheets.briefs.getRange(row, map['Patient Expects']).getValue() || '').trim(),
        teamMustDo: String(sheets.briefs.getRange(row, map['Team Must Do']).getValue() || '').trim(),
        trustBuilder: String(sheets.briefs.getRange(row, map['Trust Builder']).getValue() || '').trim(),
        trustBreaker: String(sheets.briefs.getRange(row, map['Trust Breaker']).getValue() || '').trim()
      };

      try {
        var blobs = EnablementChannel.render(brief);
        var messageId = EnablementChannel.send(brief, blobs);

        sheets.briefs.getRange(row, map['Status']).setValue(config.STATUS.SENT);
        sheets.briefs.getRange(row, map['Telegram Message ID']).setValue(messageId);
        sheets.briefs.getRange(row, map['Sent At']).setValue(now);

        this._recordSent(sheets.ledger, brief, messageId, now);
        sent++;

      } catch (e) {
        failed++;
        errors.push(brief.slug + ': ' + (e.message || e.toString()));
        Logger.log('ENABLEMENT_SEND_FAILED | ' + brief.slug + ' | ' + e.toString());
      }
    }

    return { sent: sent, failed: failed, errors: errors };
  },

  // One ledger row per behaviour, updated in place when it goes out again after
  // a restate. Times Sent is kept because a behaviour on its third airing is
  // worth a different conversation from one on its first.
  _recordSent: function(sheet, brief, messageId, now) {
    var existing = this.readLedger(sheet);
    var entry = existing[brief.fingerprint];
    var map = this._columnMap(sheet);

    if (entry) {
      sheet.getRange(entry.row, map['Last Sent']).setValue(now);
      sheet.getRange(entry.row, map['Times Sent']).setValue(entry.timesSent + 1);
      sheet.getRange(entry.row, map['Telegram Message ID']).setValue(messageId);
      return entry.row;
    }

    var row = sheet.getLastRow() + 1;
    var values = {
      'Fingerprint': brief.fingerprint,
      'Campaign Name': brief.campaign,
      'Behaviour Slug': brief.slug,
      'Headline': brief.headline,
      'First Sent': now,
      'Last Sent': now,
      'Times Sent': 1,
      'Telegram Message ID': messageId
    };

    for (var field in values) {
      if (map[field]) {
        sheet.getRange(row, map[field]).setValue(values[field]);
      }
    }

    return row;
  },

  _writeBrief: function(sheet, entry) {
    var map = this._columnMap(sheet);
    var row = sheet.getLastRow() + 1;
    var b = entry.behaviour;

    var values = {
      'Brief ID': entry.fingerprint,
      'Campaign Name': entry.campaign,
      'Behaviour Slug': b.slug,
      'Headline': b.headline,
      'Patient Expects': b.patientExpects,
      'Team Must Do': b.teamMustDo,
      'Trust Builder': b.trustBuilder,
      'Trust Breaker': b.trustBreaker,
      'Source Content IDs': entry.contentIds.join(', '),
      'Publishing Pages': entry.pages.join(', '),
      'Cycle Start': entry.cycleStart || '',
      'Status': entry.status,
      'Previously Sent': entry.previously || '',
      'Notes': ''
    };

    for (var field in values) {
      if (map[field]) {
        sheet.getRange(row, map[field]).setValue(values[field]);
      }
    }

    return row;
  }
};

// ---------------------------------------------------------------------------
// END SOURCE FILE: EnablementRunner.gs
// ---------------------------------------------------------------------------


// ---------------------------------------------------------------------------
// BEGIN SOURCE FILE: EnablementChannel.gs
// ---------------------------------------------------------------------------
// ================================
// ENABLEMENT CHANNEL — slides, and the Telegram send
//
// ⚠️ ARABIC IS SET AS REAL TYPE. NEVER GENERATED.
//
// The operator tested these briefs by hand on a video model and got exactly
// what TextOverlay.gs already documents: text running left to right,
// disconnected letterforms, misspellings. That is not a prompt failure and no
// instruction fixes it — Arabic needs contextual letter shaping and RTL
// ordering, which a generative model reproduces by luck.
//
// So the slides are built the same way the campaign artwork is: Google Slides
// sets the type in a real font at a known size, and the page is exported as an
// image. Slides has a text shaping engine. A diffusion model does not.
//
// This is why stage one is slides rather than video, and why stage two can be
// video without re-opening the question: whatever produces the moving picture,
// the words stay real type composited over it.
// ================================

var EnablementChannel = {

  _config: function() {
    return CONFIG.ENABLEMENT || {};
  },

  // ---------------------------------------------------------------- slides

  // One brief becomes a short deck: what the patient expects, what the team
  // does, what builds trust, what breaks it. One idea per card, because the
  // audience reads this on a phone between two other things.
  cardsFor: function(brief) {
    var cards = [];

    if (brief.headline) {
      cards.push({ kind: 'headline', title: '', body: brief.headline });
    }
    if (brief.patientExpects) {
      cards.push({ kind: 'expect', title: 'المريض جايلك مستني', body: brief.patientExpects });
    }
    if (brief.teamMustDo) {
      cards.push({ kind: 'do', title: 'المطلوب منّا', body: brief.teamMustDo });
    }
    if (brief.trustBuilder) {
      cards.push({ kind: 'build', title: 'ده اللي بيكسب ثقته', body: brief.trustBuilder });
    }
    if (brief.trustBreaker) {
      cards.push({ kind: 'break', title: 'وده اللي بيضيّعها', body: brief.trustBreaker });
    }

    var max = this._config().MAX_SLIDES_PER_BRIEF || 6;
    return cards.slice(0, max);
  },

  // Builds the deck. One Slides page per card, exported as PNG.
  //
  // The type is set by Slides, which has a real text shaping engine — that is
  // the whole reason this path exists rather than a prompt asking a model for
  // "a card with Arabic text on it".
  render: function(brief) {
    var cfg = this._config();
    var cards = this.cardsFor(brief);
    var scratchId = null;
    var blobs = [];

    if (!cards.length) {
      throw new Error('Brief "' + brief.slug + '" has no content to put on a slide.');
    }

    try {
      scratchId = this._openScratch();

      var presentation = SlidesApp.openById(scratchId);
      var pageW = presentation.getPageWidth();
      var pageH = presentation.getPageHeight();

      // The template carries one slide. Append the rest, then fill all of them.
      var slides = presentation.getSlides();
      while (slides.length < cards.length) {
        presentation.appendSlide(SlidesApp.PredefinedLayout.BLANK);
        slides = presentation.getSlides();
      }

      for (var i = 0; i < cards.length; i++) {
        this._drawCard(slides[i], cards[i], pageW, pageH, brief);
      }

      var pageIds = [];
      for (var p = 0; p < cards.length; p++) {
        pageIds.push(slides[p].getObjectId());
      }

      presentation.saveAndClose();

      for (var e = 0; e < pageIds.length; e++) {
        blobs.push(this._exportPage(scratchId, pageIds[e],
          brief.slug + '-' + (e + 1) + '.png'));
      }

      return blobs;

    } finally {
      // Same reasoning as TextOverlay: the copy is scaffolding, and leaving it
      // behind would put one presentation in the operator's Drive per brief.
      if (scratchId) {
        try {
          DriveApp.getFileById(scratchId).setTrashed(true);
        } catch (cleanupErr) {
          Logger.log('ENABLEMENT | could not trash scratch deck: ' + cleanupErr.toString());
        }
      }
    }
  },

  // 9:16, from the same template the Story/Reel overlay copies. A presentation's
  // page size cannot be set through any API — copying is the only operation
  // that carries it — which is why this borrows rather than creating one.
  _openScratch: function() {
    var templateId = (CONFIG.TEXT_OVERLAY.TEMPLATES || {})['9:16'];

    if (!templateId || !String(templateId).trim()) {
      throw new Error(
        'No 9:16 overlay template configured. Run setUpOverlayTemplates() from ' +
        'the Apps Script editor — the enablement slides use the same vertical ' +
        'template the Story and Reel artwork does.'
      );
    }

    return DriveApp.getFileById(templateId)
      .makeCopy('insan-enablement-scratch')
      .getId();
  },

  // One idea per card, large type, generous margins. The audience reads this on
  // a phone between two other things, and the design brief the operator wrote
  // is explicit that clarity outranks decoration.
  _drawCard: function(slide, card, pageW, pageH, brief) {
    var cfg = CONFIG.TEXT_OVERLAY || {};
    var margin = pageW * 0.10;
    var boxW = pageW - (margin * 2);

    var background = card.kind === 'break' ? '#7f1d1d'
      : card.kind === 'build' ? '#14532d'
      : '#0d1b2a';

    slide.getBackground().setSolidFill(background);

    var top = pageH * 0.30;

    if (card.title) {
      var titleBox = slide.insertTextBox(card.title, margin, top, boxW, pageH * 0.10);
      var titleStyle = titleBox.getText().getTextStyle();
      titleStyle.setFontFamily(cfg.FONT_FAMILY || 'Cairo');
      titleStyle.setFontSize(34);
      titleStyle.setForegroundColor('#9ca3af');
      titleStyle.setBold(false);
      titleBox.getText().getParagraphs().forEach(function(p) {
        p.getRange().getParagraphStyle()
          .setParagraphAlignment(SlidesApp.ParagraphAlignment.END);
      });
      top += pageH * 0.11;
    }

    var bodyBox = slide.insertTextBox(card.body, margin, top, boxW, pageH * 0.34);
    var bodyStyle = bodyBox.getText().getTextStyle();
    bodyStyle.setFontFamily(cfg.FONT_FAMILY || 'Cairo');
    bodyStyle.setFontSize(card.kind === 'headline' ? 56 : 44);
    bodyStyle.setForegroundColor(cfg.TEXT_COLOR || '#ffffff');
    bodyStyle.setBold(true);

    // Right-aligned, because the text is Arabic. Slides handles the shaping and
    // the bidirectional ordering; the alignment is the one part that is ours.
    bodyBox.getText().getParagraphs().forEach(function(p) {
      p.getRange().getParagraphStyle()
        .setParagraphAlignment(SlidesApp.ParagraphAlignment.END);
    });
  },

  _exportPage: function(presentationId, pageObjectId, name) {
    var url = 'https://docs.google.com/presentation/d/' + presentationId +
      '/export/png?id=' + presentationId + '&pageid=' + pageObjectId;

    var response = UrlFetchApp.fetch(url, {
      headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
      muteHttpExceptions: true
    });

    if (response.getResponseCode() !== 200) {
      throw new Error('Could not export enablement slide (' +
        response.getResponseCode() + ').');
    }

    return response.getBlob().setName(name);
  },

  // --------------------------------------------------------------- sending

  // Bot token and channel id, from Script Properties only. A bot token is a
  // live credential and this repository is public, so CONFIG carries the shape
  // and never the value.
  credentials: function() {
    var telegram = this._config().TELEGRAM || {};
    var token = String(telegram.BOT_TOKEN || '').trim();
    var channel = String(telegram.CHANNEL_ID || '').trim();

    if (!token) {
      throw new Error(
        'No Telegram bot token. Set TELEGRAM_BOT_TOKEN in Script Properties — ' +
        'File > Project Settings > Script Properties. It is never stored in ' +
        'CONFIG.gs because this repository is public.'
      );
    }

    if (!channel) {
      throw new Error(
        'No Telegram channel. Set TELEGRAM_CHANNEL_ID in Script Properties — ' +
        'the channel id (like -1001234567890) or @channelname, with the bot ' +
        'added to the channel as an administrator.'
      );
    }

    return { token: token, channel: channel, base: telegram.API_BASE };
  },

  // Only a brief the operator has marked Approved is sent. This is the same
  // discipline as the Publishing worker and for a stronger reason: this reaches
  // staff as an instruction, so nothing may leave the system on a model's say-so.
  gate: function(status) {
    var approved = this._config().STATUS.APPROVED;

    if (String(status || '').trim() !== approved) {
      return {
        send: false,
        reason: 'Status is "' + status + '", not "' + approved + '". Nothing ' +
          'reaches the channel until you approve it — the team reads this as ' +
          'an instruction, not as a suggestion.'
      };
    }

    return { send: true };
  },

  _call: function(method, payload) {
    var creds = this.credentials();
    var url = creds.base + creds.token + '/' + method;

    var response = UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });

    var code = response.getResponseCode();
    var body = response.getContentText();

    if (code !== 200) {
      throw new Error('Telegram ' + method + ' failed (' + code + '): ' + body);
    }

    var parsed = JSON.parse(body);

    if (!parsed.ok) {
      throw new Error('Telegram ' + method + ' refused: ' +
        (parsed.description || body));
    }

    return parsed.result;
  },

  // A brief goes out as one album, so it arrives as a single item in the
  // channel rather than five notifications the team scrolls past separately.
  //
  // sendMediaGroup needs multipart rather than JSON: the images are attached
  // and referenced from the media array by name.
  send: function(brief, blobs) {
    var creds = this.credentials();
    var media = [];
    var payload = { chat_id: creds.channel };

    for (var i = 0; i < blobs.length; i++) {
      var key = 'photo' + i;
      payload[key] = blobs[i];
      media.push({
        type: 'photo',
        media: 'attach://' + key,
        // The caption rides on the first image only; Telegram shows one caption
        // per album and repeating it would show nothing extra.
        caption: i === 0 ? this.caption(brief) : undefined
      });
    }

    payload.media = JSON.stringify(media);

    var response = UrlFetchApp.fetch(
      creds.base + creds.token + '/sendMediaGroup',
      { method: 'post', payload: payload, muteHttpExceptions: true }
    );

    var body = response.getContentText();

    if (response.getResponseCode() !== 200) {
      throw new Error('Telegram sendMediaGroup failed (' +
        response.getResponseCode() + '): ' + body);
    }

    var parsed = JSON.parse(body);

    if (!parsed.ok) {
      throw new Error('Telegram refused the album: ' + (parsed.description || body));
    }

    return parsed.result && parsed.result.length
      ? String(parsed.result[0].message_id)
      : '';
  },

  // Named so a brief can be found again months later. The team scrolls a
  // channel, not a spreadsheet — an untitled album is unfindable the next day.
  caption: function(brief) {
    return [
      '📌 ' + (brief.campaign || ''),
      brief.headline || '',
      '',
      'ده اللي المريض شافه، وده اللي محتاجينه منّا.'
    ].join('\n');
  }
};

// ---------------------------------------------------------------------------
// END SOURCE FILE: EnablementChannel.gs
// ---------------------------------------------------------------------------

