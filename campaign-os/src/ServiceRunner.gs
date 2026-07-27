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

      // A previous run's QA verdict describes images that are about to be
      // replaced. Clear it before generating, not after.
      SheetWriter.clearDownstreamOutput(rowNumber, 'MEDIA_GENERATION');

      // Resolved once per row so every asset in a carousel carries the same
      // version — they are one attempt, not several.
      var assetVersion = this._resolveAssetVersion(rowData['Content ID']);

      var allUrls = [];
      var assetFailures = [];

      // Mode A: if real photographs of this facility exist, they become the
      // visual reference. Previously the Production Mode column was written by
      // the Visual Planner and then read by nothing at all, so every asset was
      // invented from a text description with no photographic ground truth.
      var assetDomain = DriveLoader.resolveAssetDomain(rowData);
      var referenceImages = DriveLoader.loadProjectAssets(assetDomain);
      var usingReference = referenceImages.length > 0;

      if (usingReference) {
        Logger.log(
          'MEDIA_GENERATION | Row ' + rowNumber + ' | PROJECT_ASSET mode | domain "' +
          assetDomain.key + '" | ' + referenceImages.length + ' reference image(s)'
        );
      } else if (assetDomain) {
        Logger.log(
          'MEDIA_GENERATION | Row ' + rowNumber + ' | domain "' + assetDomain.key +
          '" matched but no usable images found — generating without reference'
        );
      }

      for (var i = 0; i < assetCount; i++) {
        var slidePrompt = this._buildGenerationPrompt(
          rowData, i, assetCount, usingReference
        );

        // One failed asset must not discard the assets already generated for
        // this row. Keep going, and report the shortfall rather than claiming
        // a clean SUCCESS on an incomplete set.
        try {
          var imageResult = ImageProvider.generate(slidePrompt, {
            aspectRatio: specs.aspectRatio,
            referenceImages: referenceImages
          });

          var fileUrl = this._storeGeneratedImages(
            imageResult.images,
            rowData['Content ID'] + (assetCount > 1 ? '_S' + (i + 1) : ''),
            assetVersion
          );

          allUrls.push(fileUrl);

        } catch (assetErr) {
          assetFailures.push('asset ' + (i + 1) + ': ' + assetErr.toString());
          Logger.log(
            'ASSET_GENERATION_FAILED | Row: ' + rowNumber +
            ' | asset ' + (i + 1) + '/' + assetCount + ' | ' + assetErr.toString()
          );
        }
      }

      if (!allUrls.length) {
        throw new Error(
          'No assets were generated for this row. ' + assetFailures.join(' | ')
        );
      }

      var finalUrls = allUrls.join(', ');
      var isPartial = allUrls.length < assetCount;

      var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
      var columnMap = SheetSchema._getColumnMap(sheetName);

      this._writeResult(sheet, columnMap, rowNumber, {
        'Generated Assets': finalUrls,
        'Generation Status': isPartial
          ? 'PARTIAL (' + allUrls.length + '/' + assetCount + ')'
          : 'SUCCESS',
        'Generation Timestamp': new Date()
      });

      if (isPartial) {
        Logger.logPartial('MEDIA_GENERATION_SERVICE', rowNumber, 0,
          assetVersion + ': generated ' + allUrls.length + ' of ' + assetCount +
          ' assets. ' + assetFailures.join(' | '));
      }

      Logger.log(
        'ASSET_VERSION | Row: ' + rowNumber + ' | ' + rowData['Content ID'] +
        ' | ' + assetVersion + ' | ' + allUrls.length + ' asset(s)'
      );

      SheetWriter.writeAIWorkerTag(rowNumber, 'MEDIA_GENERATION_SERVICE', sheetName);

      _applyMediaGenerationStageMapping(rowNumber, true, sheetName);

      var endTime = new Date().getTime();
      var runtime = endTime - startTime;

      Logger.logSuccess(
        'MEDIA_GENERATION_SERVICE', rowNumber, runtime, 0, 0,
        assetVersion + ': generated ' + allUrls.length +
        ' image(s) [' + contentFormat + ']'
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

  _buildGenerationPrompt: function(rowData, index, assetCount, usingReference) {
    index = index || 0;
    assetCount = assetCount || 1;

    var parts = [];

    // Stated first so the attached photographs are read as the environment to
    // reproduce, not as loose inspiration.
    if (usingReference) {
      parts.push(
        'Use the attached photographs as the visual reference for the real ' +
        'environment: match the architecture, interior finishes, equipment, ' +
        'uniforms and lighting character shown in them. Reproduce this specific ' +
        'facility rather than a generic hospital. Do not copy any person from ' +
        'the references, and do not reproduce any text, signage or logo visible ' +
        'in them'
      );
    }

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

    // Style and light are stated positively before the exclusions. Output drifted
    // to cold photographic realism because the only style guidance was negative,
    // and a model given nothing to aim at defaults to a photograph.
    parts.push(
      'Rendering style: designed editorial illustration with soft realistic ' +
      'modelling — clearly crafted artwork rather than a photograph. Warm, ' +
      'light-filled interior with soft directional daylight, gentle shadows and ' +
      'a warm neutral palette. Natural unposed human expression'
    );

    var visibleText = this._resolveVisibleText(rowData, index, assetCount);
    if (visibleText) {
      parts.push(
        'The only text rendered anywhere in the image is exactly this wording, ' +
        'appearing once and once only, set as clean well-spaced typography with ' +
        'strong contrast, comfortably legible at mobile size, integrated into the ' +
        'composition and not overlapping any subject: "' + visibleText + '"'
      );
    } else {
      parts.push('The image contains no text, lettering, numerals or captions of any kind');
    }

    parts.push(this._buildExclusions(rowData['Do NOT Show']));

    return this._stripProductionValueLanguage(
      parts.join('. ').replace(/\.\s*\./g, '.')
    ) + '.';
  },

  // Production-value adjectives describe budget, not imagery. A model cannot
  // draw "high-end", and their presence displaces words that carry an actual
  // picture. Four of five concepts in production opened with one of these.
  _stripProductionValueLanguage: function(text) {
    return String(text || '')
      .replace(
        /\b(?:high[-\s]?production|high[-\s]?end|cinematic|premium|state[-\s]?of[-\s]?the[-\s]?art|world[-\s]?class|stunning|breathtaking|luxurious|top[-\s]?tier|cutting[-\s]?edge)\b/gi,
        ' '
      )
      .replace(/\s{2,}/g, ' ')
      .replace(/\s+([,.;])/g, '$1')
      .trim();
  },

  // Image models follow trailing exclusion clauses far more reliably than
  // negation woven through the descriptive body.
  _buildExclusions: function(doNotShow) {
    // Each line here corresponds to a defect observed in generated output, not
    // to a general preference. Wording is deliberately concrete: the model
    // ignored "no mockups" while producing contact sheets, so the specific
    // shapes it actually produced are named.
    var banned = [
      // Layout defects — B3
      'one single full-frame image only',
      'no grids, collages, contact sheets, split panels, thumbnails or inset sub-images',
      'no mockups, device frames, presentation boards, mood boards or concept sheets',
      'no borders, frames, crop marks, registration marks, blueprint overlays or margin guides',

      // Text defects — B4, B5
      'no duplicated or repeated text; each approved line appears exactly once',
      'no text anywhere except the approved wording',
      'screens, monitors, tablets and phones must be switched off, blank, ' +
        'showing plain colour, or thrown far out of focus — never legible text, ' +
        'interfaces, charts or dashboards',
      'no signage, wall text, badges, labels or documents bearing readable writing',
      'no logos, brand marks, hospital names, platform names or watermarks',
      'no slide numbers, card numbers, page numbers or production labels',
      'no placeholder or lorem ipsum text, no UI chrome, no file names',

      // Human presence — B8
      'no rows of people posed facing the camera, no line-ups, no team portraits, ' +
        'no group photographs; subjects are engaged in the moment, not presenting to camera',

      // Style — B6, B7
      'no photorealistic photography; this is designed editorial artwork',
      'no cartoon, anime, Pixar or comic-book styling',
      'no uncanny faces, plastic skin or visible AI artifacts',
      'no cold, dim, desaturated or clinical-blue grading; keep it warm and light-filled',

      // Concept — the clichés that arrived from three unrelated campaigns
      'no generic stock-photography situations',
      'nobody merely standing, posing or looking professional without an action',
      'no groups gathered around a screen, dashboard, tablet or monitor',
      'no empty gleaming rooms where nothing is happening'
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

  // Which attempt this is for the row. Every regeneration was previously named
  // V1, so a folder holding three attempts at the same card gave no way to tell
  // them apart except by cross-referencing timestamps against the execution log.
  //
  // The revision counter already exists — WorkerRunner keeps it per Content ID
  // to enforce MAX_REVISION_CYCLES. Reading it here costs nothing.
  //
  // Note: the counter is cleared when QA approves or rejects, so a manual
  // re-generation of an already-settled row starts again at V1. That is correct
  // — it is a new attempt, not a continuation of a closed revision cycle — and
  // the timestamp still keeps the filenames distinct.
  _resolveAssetVersion: function(contentId) {
    if (typeof _getRevisionCount !== 'function' || !contentId) {
      return 'V1';
    }

    try {
      return 'V' + (_getRevisionCount(contentId) + 1);
    } catch (e) {
      Logger.log('ASSET_VERSION | falling back to V1: ' + e.toString());
      return 'V1';
    }
  },

  _storeGeneratedImages: function(images, nameStem, version) {
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
    var contentId = nameStem;

    version = version || 'V1';

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
