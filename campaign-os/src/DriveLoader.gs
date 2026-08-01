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

      // Caching is an optimisation, and it must not be able to lose a file that
      // was read successfully. CacheService refuses a value over 100KB by
      // throwing; CREATIVE_DIRECTOR_WORKER.md is already 77KB and these files
      // only grow. Inside the outer catch, that throw returned null — and the
      // caller reports null as "prompt file not found, check the folder ID",
      // sending the operator to look for a file that is sitting right there.
      try {
        CacheService.getScriptCache().put(cacheKey, content, CONFIG.CACHE_DURATION);
      } catch (cacheErr) {
        Logger.log(
          'DriveLoader | ' + fileName + ' (' + content.length + ' chars) was ' +
          'read but not cached: ' + cacheErr.toString() +
          ' It will be re-read from Drive on every call.'
        );
      }

      return content;

    } catch (e) {
      Logger.log('DriveLoader error for ' + fileName + ': ' + e.toString());
      return null;
    }
  },

  loadMarkdown: function(fileName, folderId) {
    return this._loadFile(fileName, folderId || CONFIG.DOCS_FOLDER_ID);
  },

  // Services are resolved as well as workers. Media Generation lives under
  // CONFIG.SERVICES, and because this function only ever looked at
  // CONFIG.WORKERS its 1,990-line training manual was never loaded by anything
  // — the file sat in Drive being edited while the image prompt was built by
  // string concatenation in code.
  loadPrompt: function(workerName) {
    var config = CONFIG.WORKERS[workerName] ||
      (CONFIG.SERVICES && CONFIG.SERVICES[workerName]);

    if (!config) {
      Logger.log('Unknown worker or service: ' + workerName);
      return null;
    }

    if (!config.promptFile) {
      Logger.log('No promptFile configured for: ' + workerName);
      return null;
    }

    var isVisual = config.sheetName === CONFIG.VISUAL_PIPELINE.SHEET_NAME;
    var folderId = isVisual
      ? CONFIG.VISUAL_PROMPTS_FOLDER_ID
      : CONFIG.PROMPTS_FOLDER_ID;

    return this._loadFile(config.promptFile, folderId);
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

  // Resolves a "/"-separated path beneath the project assets root.
  //
  // Domains are grouped in Drive — clinical departments live under Services/,
  // brand material sits at the top — so a domain's folder is a path, not a
  // direct child. Walking the segments keeps the Drive layout free to be
  // organised for humans rather than flattened for the code.
  _assetSubfolder: function(folderPath) {
    var rootId = CONFIG.PROJECT_ASSETS && CONFIG.PROJECT_ASSETS.FOLDER_ID;

    if (!rootId || !String(rootId).trim() || !folderPath) {
      return null;
    }

    var segments = String(folderPath).split('/');
    var current;

    try {
      current = DriveApp.getFolderById(rootId);
    } catch (e) {
      Logger.log('PROJECT_ASSETS | cannot open root folder: ' + e.toString());
      return null;
    }

    for (var i = 0; i < segments.length; i++) {
      var name = segments[i].trim();

      if (!name) {
        continue;
      }

      try {
        var matches = current.getFoldersByName(name);

        if (!matches.hasNext()) {
          // Expected whenever a domain folder has not been created yet.
          // Callers treat an absent folder as "no reference images".
          return null;
        }

        current = matches.next();

      } catch (e) {
        Logger.log(
          'PROJECT_ASSETS | cannot descend into "' + name + '" of "' +
          folderPath + '": ' + e.toString()
        );
        return null;
      }
    }

    return current;
  },

  // Names only — cheap enough to call while building worker context.
  // One named file from a project-assets subfolder, as a blob.
  //
  // Separate from loadProjectAssets, which takes a whole folder as visual
  // reference for the image model. A logo is not reference material: exactly
  // one file is wanted, by name, and the wrong one is not a degraded result but
  // a different company's mark on a real hospital's post.
  //
  // Cached for the same six hours as everything else read from Drive, because
  // a carousel composites the same three logos onto every card.
  loadProjectAsset: function(folderPath, fileName) {
    var wanted = String(fileName || '').trim();

    if (!folderPath || !wanted) {
      return null;
    }

    var cacheKey = 'asset:' + folderPath + '/' + wanted;
    var folder = this._assetSubfolder(folderPath);

    if (!folder) {
      Logger.log('PROJECT_ASSETS | folder "' + folderPath + '" did not resolve');
      return null;
    }

    try {
      var files = folder.getFilesByName(wanted);

      if (!files.hasNext()) {
        Logger.log(
          'PROJECT_ASSETS | "' + wanted + '" not found in "' + folderPath + '"'
        );
        return null;
      }

      var blob = files.next().getBlob();

      // A second file with the same name means Drive cannot say which one was
      // meant, and picking the first silently is how the wrong logo ships.
      if (files.hasNext()) {
        Logger.log(
          'PROJECT_ASSETS | more than one file named "' + wanted + '" in "' +
          folderPath + '" — used the first. Remove the duplicate.'
        );
      }

      return blob;

    } catch (e) {
      Logger.log(
        'PROJECT_ASSETS | could not read "' + wanted + '" from "' + folderPath +
        '": ' + e.toString()
      );
      return null;
    }
  },

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

    // Services as well as workers. Media Generation lives under CONFIG.SERVICES,
    // so Refresh Cache walked straight past MEDIA_GENERATION_SERVICE.md — the
    // second largest prompt in the system. Editing it in Drive and refreshing
    // did nothing for six hours, and looked exactly like an edit that had
    // taken effect.
    // The planning workers are not in either registry — they read their manual
    // from PLANNING_PROMPTS_FOLDER_ID, which is a Script Property — so their
    // prompts were unreachable from here too.
    var planningFolder =
      PropertiesService.getScriptProperties().getProperty('PLANNING_PROMPTS_FOLDER_ID') ||
      CONFIG.PROMPTS_FOLDER_ID;

    var planning = [CONFIG.CARD_BUILDER, CONFIG.CAMPAIGN_PLANNER, CONFIG.PORTFOLIO_CRITIC];

    for (var q = 0; q < planning.length; q++) {
      var promptFile = planning[q] && planning[q].promptFile;
      if (promptFile) {
        cache.remove('drive_' + planningFolder + '_' + promptFile);
      }
    }

    // Brand documents the planning workers name inline rather than through a
    // docs array — CardBuilder loads the first two, PlannerRunner the last two.
    // If a call site there starts reading a different document, add it here.
    var planningDocs = [
      'MASTER_BRAND_ARCHITECTURE.md', 'AI_CREATIVE_CONSTITUTION.md',
      'PROJECT_DECISIONS.md', 'PROJECT_STRUCTURE.md'
    ];

    for (var b = 0; b < planningDocs.length; b++) {
      cache.remove('drive_' + CONFIG.DOCS_FOLDER_ID + '_' + planningDocs[b]);
    }

    var registries = [CONFIG.WORKERS || {}, CONFIG.SERVICES || {}];

    for (var r = 0; r < registries.length; r++) {
      var registry = registries[r];

      for (var name in registry) {
        var entry = registry[name] || {};
        var docNames = entry.docs || [];

        for (var i = 0; i < docNames.length; i++) {
          cache.remove('drive_' + CONFIG.DOCS_FOLDER_ID + '_' + docNames[i]);
        }

        // A service keeps its own docs under its worker block — the Media
        // Designer's live in .designer.docs — and those are loaded from the
        // same folder, so they go stale the same way.
        var nested = (entry.designer && entry.designer.docs) || [];
        for (var n = 0; n < nested.length; n++) {
          cache.remove('drive_' + CONFIG.DOCS_FOLDER_ID + '_' + nested[n]);
        }

        if (!entry.promptFile) {
          continue;
        }

        var isVisual = entry.sheetName === CONFIG.VISUAL_PIPELINE.SHEET_NAME;
        var promptFolder = isVisual
          ? CONFIG.VISUAL_PROMPTS_FOLDER_ID
          : CONFIG.PROMPTS_FOLDER_ID;

        cache.remove('drive_' + promptFolder + '_' + entry.promptFile);
      }
    }
  }
};
