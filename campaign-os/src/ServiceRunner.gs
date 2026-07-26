var ServiceRunner = {

  runMediaGeneration: function(startRow, endRow) {
    var config = CONFIG.SERVICES.MEDIA_GENERATION;
    var sheetName = config.sheetName;
    var lastRow = SheetSchema.getLastRow(sheetName);

    startRow = Math.max(startRow, CONFIG.DATA_START_ROW);
    endRow = Math.min(endRow, lastRow);

    var timeoutMs = (CONFIG.BATCH_TIMEOUT_SECONDS || 300) * 1000;
    var batchStart = new Date().getTime();
    var results = [];
    var successCount = 0;
    var failCount = 0;
    var interrupted = false;

    for (var row = startRow; row <= endRow; row++) {
      var result = this._processMediaGenerationRow(row);

      results.push(result);

      if (result.success) {
        successCount++;
      } else {
        failCount++;
      }

      if (row < endRow) {
        var elapsed = new Date().getTime() - batchStart;
        if (elapsed >= timeoutMs) {
          interrupted = true;
          break;
        }
        Utilities.sleep(2000);
      }
    }

    var status = interrupted ? 'TIMEOUT' : (failCount === 0 ? 'SUCCESS' : 'PARTIAL');

    Logger.logExecution({
      worker: 'MEDIA_GENERATION_SERVICE',
      row: startRow + '-' + (interrupted ? results[results.length - 1].row : endRow),
      status: status,
      runtime: new Date().getTime() - batchStart,
      details: 'Batch: ' + successCount + ' success, ' + failCount + ' failed' +
        (interrupted ? ' (timeout)' : '')
    });

    return {
      totalRows: results.length,
      success: successCount,
      failed: failCount,
      interrupted: interrupted,
      nextRow: interrupted ? results[results.length - 1].row + 1 : null,
      results: results
    };
  },

  _processMediaGenerationRow: function(rowNumber) {
    var startTime = new Date().getTime();
    var config = CONFIG.SERVICES.MEDIA_GENERATION;
    var sheetName = config.sheetName;

    try {
      var rowData = SheetSchema.getRowData(rowNumber, sheetName);

      var currentStage = rowData['VISUAL_STAGE'];
      if (currentStage !== 'GENERATING') {
        var runtime = new Date().getTime() - startTime;
        Logger.logFailure('MEDIA_GENERATION_SERVICE', rowNumber, runtime,
          'Skipping row ' + rowNumber + ': VISUAL_STAGE is "' +
          currentStage + '", expected "GENERATING"');
        return {
          success: false,
          row: rowNumber,
          error: 'Skipping row ' + rowNumber + ': VISUAL_STAGE is "' +
            currentStage + '", expected "GENERATING"',
          runtime: runtime
        };
      }

      var contentFormat = rowData['Content Format'];

      if (this._isVideoFormat(contentFormat)) {
        var runtime = new Date().getTime() - startTime;
        Logger.logFailure('MEDIA_GENERATION_SERVICE', rowNumber, runtime,
          'Video generation not yet implemented. Format: ' + contentFormat);
        return {
          success: false,
          row: rowNumber,
          error: 'Video generation not yet implemented. Format: ' + contentFormat,
          runtime: runtime
        };
      }

      var specs = this._getMediaSpecs(contentFormat);
      var assetCount = this._getAssetCount(rowData);

      var allUrls = [];

      for (var i = 0; i < assetCount; i++) {
        var slidePrompt = this._buildGenerationPrompt(rowData, i, assetCount);

        var imageResult = ImageProvider.generate(slidePrompt, {
          aspectRatio: specs.aspectRatio
        });

        var fileUrl = this._storeGeneratedImages(
          imageResult.images,
          rowData['Content ID'] + (assetCount > 1 ? '_S' + (i + 1) : '')
        );

        allUrls.push(fileUrl);
      }

      var finalUrls = allUrls.join(', ');

      var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
      var columnMap = SheetSchema._getColumnMap(sheetName);

      this._writeResult(sheet, columnMap, rowNumber, {
        'Generated Assets': finalUrls,
        'Generation Status': 'SUCCESS',
        'Generation Timestamp': new Date()
      });

      SheetWriter.writeAIWorkerTag(rowNumber, 'MEDIA_GENERATION_SERVICE', sheetName);

      _applyMediaGenerationStageMapping(rowNumber, true, sheetName);

      var endTime = new Date().getTime();
      var runtime = endTime - startTime;

      Logger.logSuccess(
        'MEDIA_GENERATION_SERVICE', rowNumber, runtime, 0, 0,
        'Generated ' + allUrls.length + ' image(s) [' + contentFormat + ']'
      );

      return {
        success: true,
        row: rowNumber,
        imagesGenerated: allUrls.length,
        fileUrl: finalUrls,
        runtime: runtime
      };

    } catch (e) {
      var endTime = new Date().getTime();
      var runtime = endTime - startTime;

      this._writeGenerationFailure(rowNumber, e.toString());

      _applyMediaGenerationStageMapping(rowNumber, false, sheetName);

      Logger.logFailure(
        'MEDIA_GENERATION_SERVICE', rowNumber, runtime, e.toString()
      );

      return {
        success: false,
        row: rowNumber,
        error: e.toString(),
        runtime: runtime
      };
    }
  },

  // Production terminology that must never reach the image model as renderable
  // text. Column data still carries it (Creative Director writes "Slide 1:" /
  // "شريحة 1:" inside Design Prompt and Text On Design), so it is stripped here.
  _INTERNAL_LABEL_RE: /(?:^|[\s.;,\-–—(])\s*(?:slide|card|panel|frame|شريحة|كارت|لوحة)\s*#?\s*\d+\s*(?:of\s*\d+\s*)?[:\-–—.)]?\s*/gi,

  _stripInternalLabels: function(text) {
    if (!text) {
      return '';
    }
    return String(text)
      .replace(this._INTERNAL_LABEL_RE, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim();
  },

  // Per-asset segmentation. The Creative Director now separates multi-asset
  // direction with "|". Legacy rows still carry "Slide 1:" / "شريحة 1:" style
  // numbering, so both shapes are supported and both are stripped of labels.
  // Returns { preamble, segments } or null when the text is not segmented.
  _segmentByAsset: function(text) {
    var raw = String(text || '');

    if (!raw.trim()) {
      return null;
    }

    if (raw.indexOf('|') !== -1) {
      var piped = [];
      var pieces = raw.split('|');

      for (var p = 0; p < pieces.length; p++) {
        var piece = this._stripInternalLabels(pieces[p]);
        if (piece) {
          piped.push(piece);
        }
      }

      return piped.length > 1 ? { preamble: '', segments: piped } : null;
    }

    var markerRe = /(?:^|[\s.;,\-–—(])(?:slide|card|panel|frame|شريحة|كارت|لوحة)\s*#?\s*(\d+)\s*[:\-–—.)]/gi;
    var marks = [];
    var m;

    while ((m = markerRe.exec(raw)) !== null) {
      marks.push({ start: m.index, end: markerRe.lastIndex });
    }

    if (marks.length < 2) {
      return null;
    }

    var segments = [];
    for (var i = 0; i < marks.length; i++) {
      var sliceEnd = (i + 1 < marks.length) ? marks[i + 1].start : raw.length;
      var body = this._stripInternalLabels(raw.substring(marks[i].end, sliceEnd));
      if (body) {
        segments.push(body);
      }
    }

    if (!segments.length) {
      return null;
    }

    return {
      preamble: this._stripInternalLabels(raw.substring(0, marks[0].start)),
      segments: segments
    };
  },

  // Each carousel asset gets its own scene instead of N copies of one prompt.
  _extractSlideSegment: function(designPrompt, index, assetCount) {
    var text = String(designPrompt || '');

    if (assetCount <= 1) {
      return this._stripInternalLabels(text);
    }

    var split = this._segmentByAsset(text);

    if (!split) {
      return this._stripInternalLabels(text);
    }

    var segment = split.segments[Math.min(index, split.segments.length - 1)];
    return split.preamble ? (split.preamble + ' ' + segment) : segment;
  },

  // Approved visible text for this asset. Carousel Text On Design is often
  // enumerated per slide; each asset renders only its own line.
  _resolveVisibleText: function(rowData, index, assetCount) {
    var raw = rowData['Text On Design'];

    if (!raw) {
      return '';
    }

    var text = String(raw).trim();

    if (!text || /^none$/i.test(text) || text === 'لا يوجد') {
      return '';
    }

    if (assetCount <= 1) {
      return this._stripInternalLabels(text);
    }

    var split = this._segmentByAsset(text);

    if (!split) {
      return this._stripInternalLabels(text);
    }

    return split.segments[Math.min(index, split.segments.length - 1)];
  },

  // The Reference Asset Package is written for the production system, not for an
  // image model: it carries ALL-CAPS section headers and status lines that would
  // otherwise be candidates for rendering as artwork text.
  _sanitizeBrief: function(text) {
    var brief = String(text || '').trim();

    if (!brief) {
      return '';
    }

    return brief
      // Status/meta sections carry no visual direction.
      .replace(/PRODUCTION\s+READINESS\s*:[\s\S]*$/i, ' ')
      .replace(/PRODUCTION\s+MODE\s*:\s*(?:AI_GENERATED|PROJECT_ASSET)?/gi, ' ')
      // Keep the body of remaining sections, drop the shouted header.
      .replace(/\b[A-Z][A-Z_ ]{3,}\s*:/g, ' ')
      // Numbered constraint lists read as slide numbering to an image model.
      .replace(/(?:^|\s)\d+\s*[.)]\s+/g, ' ')
      .replace(/\bAI_GENERATED\b|\bPROJECT_ASSET\b/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .replace(/\s+([.,;])/g, '$1')
      .trim();
  },

  _buildGenerationPrompt: function(rowData, index, assetCount) {
    index = index || 0;
    assetCount = assetCount || 1;

    var parts = [];

    var scene = this._extractSlideSegment(
      rowData['Creative Director Design Prompt'], index, assetCount
    );
    if (scene) {
      parts.push(scene);
    }

    var concept = this._stripInternalLabels(rowData['Visual Concept']);
    if (concept) {
      parts.push(concept);
    }

    var elements = this._stripInternalLabels(rowData['Visual Elements']);
    if (elements) {
      parts.push(elements);
    }

    var focus = rowData['Visual Focus'];
    var composition = rowData['Composition'];
    if (focus || composition) {
      var framing = [];
      if (focus) {
        framing.push('the ' + String(focus).trim().toLowerCase() +
          ' is the primary subject and focal point');
      }
      if (composition) {
        framing.push(String(composition).trim().toLowerCase() + ' framing');
      }
      parts.push(framing.join(', '));
    }

    // Visual Planner's Reference Asset Package is the approved production brief.
    // Previously written to the sheet and never read.
    var brief = this._sanitizeBrief(rowData['Reference Asset Package']);
    if (brief) {
      parts.push(brief);
    }

    if (assetCount > 1) {
      parts.push(
        'This is one image in a set of ' + assetCount +
        ' that must read as a single visual family: identical art direction, ' +
        'colour grading, lighting and rendering style across the set, with a ' +
        'distinct scene and camera framing in each'
      );
    }

    var visibleText = this._resolveVisibleText(rowData, index, assetCount);
    if (visibleText) {
      parts.push(
        'The only text rendered anywhere in the image is exactly this wording, ' +
        'set as clean well-spaced typography with strong contrast, comfortably ' +
        'legible at mobile size, integrated into the composition and not ' +
        'overlapping any subject: "' + visibleText + '"'
      );
    } else {
      parts.push('The image contains no text, lettering, numerals or captions of any kind');
    }

    parts.push(this._buildExclusions(rowData['Do NOT Show']));

    return parts.join('. ').replace(/\.\s*\./g, '.') + '.';
  },

  // Image models follow trailing exclusion clauses far more reliably than
  // negation woven through the descriptive body.
  _buildExclusions: function(doNotShow) {
    var banned = [
      'no logos, brand marks, hospital names, platform names or watermarks',
      'no slide numbers, card numbers, page numbers or production labels',
      'no placeholder or lorem ipsum text, no UI chrome, no file names',
      'no mockups, device frames, presentation boards, mood boards or concept sheets',
      'no duplicated or repeated text blocks',
      'no cartoon, anime, Pixar or comic-book styling',
      'no photorealistic photography, uncanny faces, plastic skin or visible AI artifacts'
    ];

    var campaign = String(doNotShow || '').trim();
    if (campaign) {
      banned.push(campaign);
    }

    return 'Deliver final publish-ready artwork. Strictly exclude: ' + banned.join('; ');
  },

  _getAspectRatio: function(contentFormat) {
    var format = String(contentFormat).trim().toLowerCase();

    if (format === 'story' || format === 'reel') {
      return '9:16';
    }

    if (format === 'carousel') {
      return '1:1';
    }

    return '1:1';
  },

  _getMediaSpecs: function(contentFormat) {
    var format = String(contentFormat).trim().toLowerCase();

    if (format === 'story') {
      return CONFIG.MEDIA_SPECS.STORY;
    }

    if (format === 'reel') {
      return CONFIG.MEDIA_SPECS.REEL;
    }

    if (format === 'carousel') {
      return CONFIG.MEDIA_SPECS.CAROUSEL;
    }

    if (format === 'video' || format === 'motion graphic') {
      return CONFIG.MEDIA_SPECS.SHORT_VIDEO;
    }

    return CONFIG.MEDIA_SPECS.STATIC_IMAGE;
  },

  _isVideoFormat: function(contentFormat) {
    var format = String(contentFormat).trim().toLowerCase();
    return format === 'video' || format === 'motion graphic';
  },

  _getAssetCount: function(rowData) {
    var contentFormat = String(rowData['Content Format']).trim().toLowerCase();
    var specs = this._getMediaSpecs(contentFormat);

    var assetCount = parseInt(rowData['Asset Count'], 10);

    if (isNaN(assetCount)) {
      return specs.assetCount;
    }

    if (contentFormat === 'carousel') {
      if (assetCount < specs.minAssetCount) {
        return specs.minAssetCount;
      }
      if (assetCount > specs.maxAssetCount) {
        return specs.maxAssetCount;
      }
    }

    return assetCount;
  },

  _storeGeneratedImages: function(images, contentId) {
    var folderId = CONFIG.VISUAL_ASSETS.generated;

    if (!folderId) {
      throw new Error(
        'Generated assets folder not configured. ' +
        'Set CONFIG.VISUAL_ASSETS.generated'
      );
    }

    var folder = DriveApp.getFolderById(folderId);
    var urls = [];
    var timestamp = this._formatTimestamp(new Date());
    var version = 'V1';

    for (var i = 0; i < images.length; i++) {
      var image = images[i];
      var extension = image.mimeType === 'image/jpeg' ? 'jpg' : 'png';
      var fileName = contentId + '_' + version +
        '_' + timestamp + '_' + (i + 1) + '.' + extension;

      var blob = Utilities.newBlob(
        Utilities.base64Decode(image.base64),
        image.mimeType,
        fileName
      );

      var file = folder.createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

      urls.push(file.getUrl());
    }

    return urls.join(', ');
  },

  _formatTimestamp: function(date) {
    var y = date.getFullYear();
    var m = ('0' + (date.getMonth() + 1)).slice(-2);
    var d = ('0' + date.getDate()).slice(-2);
    var h = ('0' + date.getHours()).slice(-2);
    var min = ('0' + date.getMinutes()).slice(-2);
    var s = ('0' + date.getSeconds()).slice(-2);
    return y + m + d + '_' + h + min + s;
  },

  _writeResult: function(sheet, columnMap, rowNumber, values) {
    for (var colName in values) {
      var colIndex = columnMap[colName];
      if (colIndex === undefined || colIndex === null) continue;

      var value = values[colName];
      if (value === undefined || value === null) {
        value = '';
      }

      // Routed through the safe writer so a dropdown on Generation Status
      // cannot silently drop the result of a completed generation.
      var ok = SheetWriter._writeCellSafe(
        sheet.getRange(rowNumber, colIndex), value, rowNumber, colName, colIndex
      );

      if (!ok) {
        Logger.log(
          'MEDIA_GENERATION_WRITE_FAILED | Row: ' + rowNumber +
          ' | Column: ' + colName + ' | Value: ' + String(value).substring(0, 100)
        );
      }
    }
  },

  _writeGenerationFailure: function(rowNumber, error) {
    try {
      var config = CONFIG.SERVICES.MEDIA_GENERATION;
      var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(config.sheetName);
      var columnMap = SheetSchema._getColumnMap(config.sheetName);

      this._writeResult(sheet, columnMap, rowNumber, {
        'Generation Status': 'FAILED: ' + error.substring(0, 100)
      });
    } catch (e) {
      Logger.log('Failed to write generation failure: ' + e.toString());
    }
  }
};
