var DriveLoader = {

  _loadFile: function(fileName, folderId) {
    var cacheKey = 'drive_' + folderId + '_' + fileName;
    var cached = CacheService.getScriptCache().get(cacheKey);

    if (cached) {
      return cached;
    }

    try {
      var folder = DriveApp.getFolderById(folderId);
      var files = folder.getFilesByName(fileName);

      if (!files.hasNext()) {
        Logger.log('File not found in Drive: ' + fileName);
        return null;
      }

      var file = files.next();
      var content = file.getBlob().getDataAsString('UTF-8');

      CacheService.getScriptCache().put(cacheKey, content, CONFIG.CACHE_DURATION);
      return content;

    } catch (e) {
      Logger.log('DriveLoader error for ' + fileName + ': ' + e.toString());
      return null;
    }
  },

  loadMarkdown: function(fileName, folderId) {
    return this._loadFile(fileName, folderId || CONFIG.DOCS_FOLDER_ID);
  },

  loadPrompt: function(workerName) {
    var workerConfig = CONFIG.WORKERS[workerName];

    if (!workerConfig) {
      Logger.log('Unknown worker: ' + workerName);
      return null;
    }

    var isVisualWorker = workerConfig.sheetName === CONFIG.VISUAL_PIPELINE.SHEET_NAME;
    var folderId = isVisualWorker
      ? CONFIG.VISUAL_PROMPTS_FOLDER_ID
      : CONFIG.PROMPTS_FOLDER_ID;

    return this._loadFile(workerConfig.promptFile, folderId);
  },

  loadProjectDocs: function(workerName) {
    var workerConfig = CONFIG.WORKERS[workerName];

    if (!workerConfig) {
      Logger.log('Unknown worker for doc loading: ' + workerName);
      return null;
    }

    var docNames = workerConfig.docs;
    var sections = [];

    for (var i = 0; i < docNames.length; i++) {
      var content = this.loadMarkdown(docNames[i], CONFIG.DOCS_FOLDER_ID);

      if (content) {
        sections.push(
          '=== PROJECT DOCUMENT: ' + docNames[i] + ' ===\n' +
          content
        );
      } else {
        sections.push(
          '=== PROJECT DOCUMENT: ' + docNames[i] + ' ===\n' +
          '[FILE NOT FOUND - SKIP]'
        );
      }
    }

    return sections.join('\n\n');
  },

  loadAllDocs: function() {
    var cacheKey = 'allDocs';
    var cached = CacheService.getScriptCache().get(cacheKey);

    if (cached) {
      return cached;
    }

    try {
      var folder = DriveApp.getFolderById(CONFIG.DOCS_FOLDER_ID);
      var files = folder.getFilesByType(MimeType.PLAIN_TEXT);
      var contents = {};

      while (files.hasNext()) {
        var file = files.next();
        var name = file.getName();

        if (name.endsWith('.md')) {
          contents[name] = file.getBlob().getDataAsString('UTF-8');
        }
      }

      var result = JSON.stringify(contents);
      CacheService.getScriptCache().put(cacheKey, result, CONFIG.CACHE_DURATION);
      return contents;

    } catch (e) {
      Logger.log('loadAllDocs error: ' + e.toString());
      return {};
    }
  },

  invalidateCache: function(fileName, folderId) {
    var targetFolder = folderId || CONFIG.DOCS_FOLDER_ID;
    var cacheKey = 'drive_' + targetFolder + '_' + fileName;
    CacheService.getScriptCache().remove(cacheKey);
  },

  invalidateAllCache: function() {
    var cache = CacheService.getScriptCache();

    cache.removeAll([
      'allDocs',
      'drive_' + CONFIG.DOCS_FOLDER_ID,
      'drive_' + CONFIG.PROMPTS_FOLDER_ID,
      'drive_' + CONFIG.VISUAL_PROMPTS_FOLDER_ID
    ]);

    var docNames;
    for (var workerName in CONFIG.WORKERS) {
      docNames = CONFIG.WORKERS[workerName].docs;

      for (var i = 0; i < docNames.length; i++) {
        cache.remove('drive_' + CONFIG.DOCS_FOLDER_ID + '_' + docNames[i]);
      }

      var isVisualWorker = CONFIG.WORKERS[workerName].sheetName === CONFIG.VISUAL_PIPELINE.SHEET_NAME;
      var promptFolder = isVisualWorker
        ? CONFIG.VISUAL_PROMPTS_FOLDER_ID
        : CONFIG.PROMPTS_FOLDER_ID;

      cache.remove(
        'drive_' + promptFolder + '_' +
        CONFIG.WORKERS[workerName].promptFile
      );
    }
  }
};
