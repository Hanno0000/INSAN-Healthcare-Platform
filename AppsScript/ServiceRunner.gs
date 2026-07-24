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

      var generationPrompt = this._buildGenerationPrompt(rowData);
      var specs = this._getMediaSpecs(contentFormat);
      var assetCount = this._getAssetCount(rowData);

      var allUrls = [];

      for (var i = 0; i < assetCount; i++) {
        var slidePrompt = assetCount > 1
          ? generationPrompt + '. Slide ' + (i + 1) + ' of ' + assetCount
          : generationPrompt;

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

  _buildGenerationPrompt: function(rowData) {
    var parts = [];

    var designPrompt = rowData['Creative Director Design Prompt'];
    if (designPrompt) {
      parts.push('Design Prompt: ' + String(designPrompt).trim());
    }

    var visualConcept = rowData['Visual Concept'];
    if (visualConcept) {
      parts.push('Visual Concept: ' + String(visualConcept).trim());
    }

    var visualFocus = rowData['Visual Focus'];
    if (visualFocus) {
      parts.push('Visual Focus: ' + String(visualFocus).trim());
    }

    var composition = rowData['Composition'];
    if (composition) {
      parts.push('Composition: ' + String(composition).trim());
    }

    var visualElements = rowData['Visual Elements'];
    if (visualElements) {
      parts.push('Visual Elements: ' + String(visualElements).trim());
    }

    var doNotShow = rowData['Do NOT Show'];
    if (doNotShow) {
      parts.push('Do NOT show: ' + String(doNotShow).trim());
    }

    var textOnDesign = rowData['Text On Design'];
    if (textOnDesign) {
      parts.push('Text on design: ' + String(textOnDesign).trim());
    }

    return parts.join('. ') + '.';
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

      var range = sheet.getRange(rowNumber, colIndex);

      try {
        range.setValue(value);
        SpreadsheetApp.flush();
      } catch (e) {
        Logger.log(
          'MEDIA_GENERATION_WRITE_ERROR | Row: ' + rowNumber +
          ' | Column: ' + colName + ' | Error: ' + e.toString()
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
