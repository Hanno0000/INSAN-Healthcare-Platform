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

  // Accepts a Drive file URL or a bare file ID and returns the image as
  // inline data for multimodal AI requests. Returns null on any failure so a
  // single unreadable asset never aborts the whole worker run.
  loadImageAsInlineData: function(fileRef) {
    var ref = String(fileRef || '').trim();

    if (!ref) {
      return null;
    }

    var idMatch = ref.match(/[-\w]{25,}/);
    var fileId = idMatch ? idMatch[0] : ref;

    try {
      var blob = DriveApp.getFileById(fileId).getBlob();
      var mimeType = blob.getContentType() || '';

      if (mimeType.indexOf('image/') !== 0) {
        Logger.log('Skipping non-image Drive file: ' + fileId + ' (' + mimeType + ')');
        return null;
      }

      return {
        base64: Utilities.base64Encode(blob.getBytes()),
        mimeType: mimeType
      };

    } catch (e) {
      Logger.log('loadImageAsInlineData failed for ' + fileId + ': ' + e.toString());
      return null;
    }
  },

  // ================================
  // PROJECT ASSETS
  // Real photographs of the actual facilities. Everything below degrades to an
  // empty result rather than throwing: a missing folder, an unshared folder or
  // an empty subfolder simply means this row is generated without reference.
  // ================================

  // Arabic text in the sheet carries definite articles and inconsistent letter
  // forms, so a literal search for "عناية مركزة" never matches the way people
  // actually write it — "العناية المركزة". Normalising both sides first is what
  // makes keyword matching usable on real content.
  _normalizeArabic: function(text) {
    return String(text || '')
      .toLowerCase()
      .replace(/[أإآٱ]/g, 'ا')  // أ إ آ -> ا
      .replace(/ة/g, 'ه')                       // ة -> ه
      .replace(/[ى]/g, 'ي')                     // ى -> ي
      .replace(/[ً-ْـ]/g, '')    // diacritics and tatweel
      // Definite article. \b is ASCII-only in JS, so an explicit boundary is
      // required — without it "العناية" never matches the keyword "عناية".
      .replace(/(^|\s)ال/g, '$1')
      .replace(/\s+/g, ' ')
      .trim();
  },

  // Picks the domain whose keywords appear in the row's creative fields. No
  // model call — the same row always resolves to the same domain.
  resolveAssetDomain: function(rowData) {
    var domains = (CONFIG.PROJECT_ASSETS && CONFIG.PROJECT_ASSETS.DOMAINS) || [];

    if (!domains.length) {
      return null;
    }

    var haystack = this._normalizeArabic([
      rowData['Campaign Name'],
      rowData['Visual Concept'],
      rowData['Visual Focus'],
      rowData['Visual Elements'],
      rowData['Content Type']
    ].join(' '));

    if (!haystack) {
      return null;
    }

    for (var i = 0; i < domains.length; i++) {
      var domain = domains[i];
      for (var k = 0; k < domain.keywords.length; k++) {
        if (haystack.indexOf(this._normalizeArabic(domain.keywords[k])) !== -1) {
          return domain;
        }
      }
    }

    return null;
  },

  _assetSubfolder: function(folderName) {
    var rootId = CONFIG.PROJECT_ASSETS && CONFIG.PROJECT_ASSETS.FOLDER_ID;

    if (!rootId || !String(rootId).trim()) {
      return null;
    }

    try {
      var folders = DriveApp.getFolderById(rootId).getFoldersByName(folderName);
      return folders.hasNext() ? folders.next() : null;
    } catch (e) {
      Logger.log('PROJECT_ASSETS | cannot open root folder: ' + e.toString());
      return null;
    }
  },

  // Names only — cheap enough to call while building worker context.
  listProjectAssets: function(domain) {
    if (!domain) {
      return [];
    }

    var folder = this._assetSubfolder(domain.folder);

    if (!folder) {
      return [];
    }

    var types = CONFIG.PROJECT_ASSETS.SUPPORTED_IMAGE_TYPES;
    var names = [];

    try {
      var files = folder.getFiles();
      while (files.hasNext()) {
        var file = files.next();
        if (types.indexOf(file.getMimeType()) !== -1) {
          names.push(file.getName());
        }
      }
    } catch (e) {
      Logger.log('PROJECT_ASSETS | cannot list "' + domain.folder + '": ' + e.toString());
      return [];
    }

    return names;
  },

  // Actual bytes, for handing to the image model as visual reference.
  loadProjectAssets: function(domain, maxImages) {
    if (!domain) {
      return [];
    }

    var folder = this._assetSubfolder(domain.folder);

    if (!folder) {
      return [];
    }

    var limit = maxImages || CONFIG.PROJECT_ASSETS.MAX_REFERENCE_IMAGES || 3;
    var types = CONFIG.PROJECT_ASSETS.SUPPORTED_IMAGE_TYPES;
    var images = [];

    try {
      var files = folder.getFiles();
      while (files.hasNext() && images.length < limit) {
        var file = files.next();

        if (types.indexOf(file.getMimeType()) === -1) {
          continue;
        }

        images.push({
          base64: Utilities.base64Encode(file.getBlob().getBytes()),
          mimeType: file.getMimeType(),
          name: file.getName()
        });
      }
    } catch (e) {
      Logger.log('PROJECT_ASSETS | cannot read "' + domain.folder + '": ' + e.toString());
      return [];
    }

    if (images.length) {
      Logger.log(
        'PROJECT_ASSETS | domain "' + domain.key + '" supplied ' +
        images.length + ' reference image(s)'
      );
    }

    return images;
  },

  // Splits a comma-separated Generated Assets cell into inline image payloads.
  loadImagesFromCell: function(cellValue, maxImages) {
    var value = String(cellValue || '').trim();

    if (!value) {
      return [];
    }

    var refs = value.split(',');
    var limit = maxImages || 4;
    var images = [];

    for (var i = 0; i < refs.length && images.length < limit; i++) {
      var ref = refs[i].trim();
      if (!ref) {
        continue;
      }

      var image = this.loadImageAsInlineData(ref);
      if (image) {
        images.push(image);
      }
    }

    return images;
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
