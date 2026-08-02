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
      .getProperty('ADS_PROMPTS_FOLDER_ID') || CONFIG.PROMPTS_FOLDER_ID;

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

