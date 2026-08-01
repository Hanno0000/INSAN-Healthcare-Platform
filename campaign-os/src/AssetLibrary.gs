// ================================
// APPROVED ASSET LIBRARY  (improvement I4)
//
// Every post generates its images from scratch. `CONFIG.VISUAL_ASSETS.approved`
// has existed since the beginning and no code has ever read from it or written
// to it — so an image that passed QA is indistinguishable from one that failed,
// and the most expensive line in the system is paid again for a picture the
// ecosystem already owns.
//
// Two halves:
//
//   PROMOTE — when Visual QA approves a row, its assets move into the approved
//   folder under a name that says what they are. Drive file IDs survive a move,
//   so every URL already written to the sheet keeps resolving.
//
//   REUSE   — before generating, the operator can ask what the library already
//   holds for this kind of row, and use it instead.
//
// Reuse is deliberately operator-driven. An automatic substitution would put a
// previously-approved image behind copy nobody checked it against, and a wrong
// image on a real hospital's page costs more than a generation. The candidate
// list is the automation; the choice is not.
// ================================

var AssetLibrary = {

  // LIB__<domain>__<aspect>__<contentId>__<n>.<ext>
  //
  // The filename carries the metadata rather than an index sheet. A separate
  // index is a second source of truth that drifts the first time somebody moves
  // a file by hand — and in a Drive-backed system somebody always does.
  PREFIX: 'LIB',
  SEPARATOR: '__',

  _folderId: function(which) {
    return (CONFIG.VISUAL_ASSETS || {})[which];
  },

  // ------------------------------------------------------------ filing

  // Every asset a row produces ends up in exactly one folder, and which folder
  // it is in *is* its status:
  //
  //   generated  it exists and nobody has judged it
  //   approved   QA passed it — and it is a reuse candidate
  //   rejected   QA failed it
  //   published  it went live on a page
  //
  // Before this, only `generated` and `approved` were ever written to. A
  // rejected image stayed in `generated` alongside artwork nobody had looked at
  // yet, so the folder that should mean "not yet judged" quietly meant "some
  // mixture of not yet judged and already refused".
  //
  // Never throws. A library that cannot file an asset must not fail a row that
  // QA has just decided on, or a post that is already live on a real page.
  _fileInto: function(rowNumber, sheetName, spec) {
    try {
      var folderId = this._folderId(spec.folder);

      if (!folderId || !String(folderId).trim()) {
        return { moved: 0, reason: 'no ' + spec.folder + ' folder configured' };
      }

      var row = SheetSchema.getRowData(rowNumber, sheetName);
      var urls = String(row[spec.column] || '').trim();

      if (!urls) {
        return { moved: 0, reason: 'no ' + spec.column };
      }

      var domain = this._domainKey(row);
      var aspect = this._aspectKey(row['Content Format']);
      var contentId = String(row[CONFIG.COLUMN_NAMES.CONTENT_ID] || 'unknown').trim();

      var folder;
      try {
        folder = DriveApp.getFolderById(folderId);
      } catch (folderErr) {
        // The id is set but does not open. Silence here is what leaves approved
        // artwork sitting in `generated` with nothing to say why.
        Logger.log(
          'ASSET_LIBRARY | the "' + spec.folder + '" folder id is set but does ' +
          'not resolve — row ' + rowNumber + ' was not filed and its assets are ' +
          'still where they were. Run Maintenance → Check Visual Asset Folders. ' +
          folderErr.toString()
        );
        return { moved: 0, error: 'folder does not resolve', folder: spec.folder };
      }

      var refs = urls.split(',');
      var moved = 0;

      for (var i = 0; i < refs.length; i++) {
        var ref = refs[i].trim();

        if (!ref) {
          continue;
        }

        var idMatch = ref.match(/[-\w]{25,}/);
        var fileId = idMatch ? idMatch[0] : ref;

        try {
          var file = DriveApp.getFileById(fileId);

          // Renaming is for the folders whose contents are looked up by name.
          // A published asset already carries its library name and keeps it —
          // renaming it would strip the metadata reuse matches on.
          if (spec.prefix) {
            var extension = (file.getName().match(/\.(png|jpg|jpeg)$/i) || ['', 'png'])[1];

            file.setName([
              spec.prefix, domain, aspect, contentId, (i + 1)
            ].join(this.SEPARATOR) + '.' + extension.toLowerCase());
          }

          // Moving keeps the file id, so every URL already written to the sheet
          // still resolves. moveTo replaces all parents.
          file.moveTo(folder);
          moved++;

        } catch (fileErr) {
          Logger.log(
            'ASSET_LIBRARY | could not file asset ' + (i + 1) + ' of row ' +
            rowNumber + ' into ' + spec.folder + ': ' + fileErr.toString()
          );
        }
      }

      if (moved) {
        Logger.log(
          'ASSET_LIBRARY | filed ' + moved + ' asset(s) from row ' + rowNumber +
          ' into ' + spec.folder + ' | domain "' + domain + '" | ' + aspect
        );
      }

      return { moved: moved, domain: domain, aspect: aspect, folder: spec.folder };

    } catch (e) {
      Logger.log(
        'ASSET_LIBRARY | filing into ' + spec.folder + ' failed for row ' +
        rowNumber + ': ' + e.toString()
      );
      return { moved: 0, error: e.toString(), folder: spec.folder };
    }
  },

  // QA approved. The artwork becomes library material, so it is renamed to
  // carry what it is — the filename is the index.
  promote: function(rowNumber, sheetName) {
    return this._fileInto(rowNumber, sheetName, {
      folder: 'approved',
      column: 'Final Asset URL',
      prefix: this.PREFIX
    });
  },

  // QA rejected. Read from `Generated Assets`, because `Final Asset URL` is
  // only written on approval — on a rejection it is empty, and reading it would
  // file nothing while reporting success.
  //
  // Named `REJ`, which `_parseName` does not accept: a rejected image must not
  // become a reuse candidate even if somebody later drags it into `approved`.
  reject: function(rowNumber, sheetName) {
    return this._fileInto(rowNumber, sheetName, {
      folder: 'rejected',
      column: 'Generated Assets',
      prefix: 'REJ'
    });
  },

  // W9 put it on a page. No rename: it keeps its library name, and `published`
  // is searched for reuse alongside `approved` — artwork that actually ran is
  // the most proven thing the library holds, not the least.
  markPublished: function(rowNumber, sheetName) {
    return this._fileInto(rowNumber, sheetName, {
      folder: 'published',
      column: 'Final Asset URL',
      prefix: null
    });
  },

  // ------------------------------------------------------------ verifying

  // Opens every configured folder and reports what is actually there. Nothing
  // else in the system checks these ids, so a folder that was renamed, moved to
  // another Drive, or never created at all is invisible until artwork silently
  // fails to file — and the failure is a log line nobody reads.
  verifyFolders: function() {
    ConfigResolver.apply();

    var configured = CONFIG.VISUAL_ASSETS || {};
    var out = [];

    for (var key in configured) {
      var id = String(configured[key] || '').trim();

      if (!id) {
        out.push({ key: key, id: '', ok: false, reason: 'not set' });
        continue;
      }

      try {
        var folder = DriveApp.getFolderById(id);
        var files = folder.getFiles();
        var count = 0;

        while (files.hasNext()) {
          files.next();
          count++;
        }

        out.push({
          key: key, id: id, ok: true, name: folder.getName(), files: count
        });

      } catch (e) {
        out.push({
          key: key, id: id, ok: false,
          reason: 'does not open — wrong id, deleted, or not shared with this script'
        });
      }
    }

    return out;
  },

  // ------------------------------------------------------------------ reuse

  // What the library holds that would fit this row. Matching is deterministic
  // and narrow: the same visual domain and the same shape. Anything looser
  // would offer a corridor photograph for a cardiac post.
  //
  // Searches `approved` AND `published`. Artwork moves out of `approved` when
  // it goes live, and artwork that actually ran on a page is the most proven
  // thing here — searching only `approved` would leave the library holding the
  // sets that passed QA and were never used, which is exactly backwards.
  //
  // Returns [{ name, url, id, contentId, index }], newest first.
  candidatesFor: function(rowData) {
    var domain = this._domainKey(rowData);
    var aspect = this._aspectKey(rowData['Content Format']);
    var ownContentId = String(rowData[CONFIG.COLUMN_NAMES.CONTENT_ID] || '').trim();

    if (domain === 'none') {
      // Without a resolvable domain there is nothing to match on, and matching
      // on shape alone would offer any square image ever approved.
      return [];
    }

    var out = [];
    var searched = ['approved', 'published'];

    for (var f = 0; f < searched.length; f++) {
      var folderId = this._folderId(searched[f]);

      if (!folderId || !String(folderId).trim()) {
        continue;
      }

      try {
        var files = DriveApp.getFolderById(folderId).getFiles();

        while (files.hasNext()) {
          var file = files.next();
          var parsed = this._parseName(file.getName());

          if (!parsed || parsed.domain !== domain || parsed.aspect !== aspect) {
            continue;
          }

          // A row's own previously-approved assets are not a reuse candidate for
          // itself; that is a regeneration, not reuse.
          if (ownContentId && parsed.contentId === ownContentId) {
            continue;
          }

          out.push({
            name: file.getName(),
            url: file.getUrl(),
            id: file.getId(),
            contentId: parsed.contentId,
            index: parsed.index,
            updated: file.getLastUpdated(),
            wentLive: searched[f] === 'published'
          });
        }

      } catch (e) {
        Logger.log(
          'ASSET_LIBRARY | could not read the ' + searched[f] + ' folder: ' + e.toString()
        );
      }
    }

    out.sort(function(a, b) { return b.updated.getTime() - a.updated.getTime(); });

    return out;
  },

  // Groups candidates by the row they came from, because a carousel is reused
  // as a set or not at all — three cards from three different posts is not a
  // sequence, it is three pictures.
  candidateSets: function(rowData) {
    var candidates = this.candidatesFor(rowData);
    var sets = {};
    var order = [];

    for (var i = 0; i < candidates.length; i++) {
      var id = candidates[i].contentId;

      if (!sets[id]) {
        sets[id] = {
          contentId: id, assets: [], newest: candidates[i].updated, wentLive: false
        };
        order.push(sets[id]);
      }

      sets[id].assets.push(candidates[i]);

      // Worth surfacing when the operator picks: a set that already ran on a
      // page has been judged by more than QA.
      if (candidates[i].wentLive) {
        sets[id].wentLive = true;
      }
    }

    for (var s = 0; s < order.length; s++) {
      order[s].assets.sort(function(a, b) { return a.index - b.index; });
    }

    return order;
  },

  // Puts a chosen set onto a row and sends it to QA. Generation is skipped
  // entirely — but QA is not, because the question reuse raises is exactly the
  // one QA answers: does this artwork suit this post?
  applySet: function(rowNumber, set, sheetName) {
    var urls = [];

    for (var i = 0; i < set.assets.length; i++) {
      urls.push(set.assets[i].url);
    }

    SheetWriter.writeCell(rowNumber, 'Generated Assets', urls.join(', '), sheetName);
    SheetWriter.writeCell(rowNumber, 'Generation Status',
      'REUSED from ' + set.contentId, sheetName);
    SheetWriter.writeCell(rowNumber, 'Generation Timestamp', new Date(), sheetName);

    // Clears any stale QA verdict, then hands it to QA as a fresh set.
    SheetWriter.clearDownstreamOutput(rowNumber, 'MEDIA_GENERATION');
    _transitionVisualStage(rowNumber, 'QA', sheetName);
    SpreadsheetApp.flush();

    Logger.logSuccess(
      'ASSET_LIBRARY', rowNumber, 0, 0, 0,
      'Reused ' + set.assets.length + ' approved asset(s) from ' + set.contentId +
      ' — generation skipped, QA still required'
    );

    return { assets: set.assets.length, from: set.contentId };
  },

  // ------------------------------------------------------------------ keys

  _domainKey: function(rowData) {
    try {
      var domain = DriveLoader.resolveAssetDomain(rowData);
      return domain && domain.key ? domain.key : 'none';
    } catch (e) {
      return 'none';
    }
  },

  // Shape, not size. The library is matched on what a placement needs.
  _aspectKey: function(contentFormat) {
    var format = String(contentFormat || '').trim().toLowerCase();
    return (format === 'story' || format === 'reel') ? '9x16' : '1x1';
  },

  _parseName: function(name) {
    var base = String(name || '').replace(/\.(png|jpg|jpeg)$/i, '');
    var parts = base.split(this.SEPARATOR);

    if (parts.length !== 5 || parts[0] !== this.PREFIX) {
      return null;
    }

    return {
      domain: parts[1],
      aspect: parts[2],
      contentId: parts[3],
      index: parseInt(parts[4], 10) || 1
    };
  }
};


// ================================
// MENU — AI Workers → Maintenance → Check Visual Asset Folders
//
// Five folder ids have been configured since 2026-07-25 and nothing has ever
// verified that they open. Three of them had no code reading or writing them at
// all, so a wrong id would have stayed invisible until artwork silently failed
// to file — and that failure is a log line.
// ================================

function checkVisualAssetFolders() {
  var ui = SpreadsheetApp.getUi();

  try {
    var results = AssetLibrary.verifyFolders();
    var purpose = {
      generated: 'where every generated image lands, before anyone judges it',
      approved:  'QA passed it — and it is offered for reuse',
      rejected:  'QA failed it',
      published: 'it went live on a page — also offered for reuse',
      archive:   'no code reads or writes this folder'
    };

    var lines = ['One folder per status. Which folder a file sits in is its status.', ''];
    var broken = 0;

    for (var i = 0; i < results.length; i++) {
      var r = results[i];

      if (r.ok) {
        lines.push('OK      ' + r.key);
        lines.push('        "' + r.name + '" — ' + r.files + ' file(s)');
      } else {
        broken++;
        lines.push('BROKEN  ' + r.key);
        lines.push('        ' + r.reason);
        lines.push('        id: ' + (r.id || '(empty)'));
      }

      lines.push('        ' + purpose[r.key]);
      lines.push('');
    }

    if (broken) {
      lines.push('─────────────────────────────');
      lines.push(broken + ' folder(s) do not open.');
      lines.push('');
      lines.push('Nothing breaks immediately: filing never fails a row, so a post');
      lines.push('still gets approved and still gets published. What is lost is the');
      lines.push('sorting — the artwork stays where it was, and the folders stop');
      lines.push('telling you anything.');
      lines.push('');
      lines.push('Either create the folder in Drive and put its id in CONFIG.gs, or');
      lines.push('set the matching Script Property — VISUAL_ASSETS_APPROVED,');
      lines.push('VISUAL_ASSETS_REJECTED, VISUAL_ASSETS_PUBLISHED.');
    } else {
      lines.push('─────────────────────────────');
      lines.push('All five open.');
    }

    ui.alert('Visual Asset Folders', lines.join('\n'), ui.ButtonSet.OK);

  } catch (e) {
    ui.alert('Visual Asset Folders', e.message || e.toString(), ui.ButtonSet.OK);
  }
}


// ================================
// MENU — AI Workers → Visual Team → Reuse An Approved Asset
// ================================

function reuseApprovedAsset() {
  var ui = SpreadsheetApp.getUi();
  var sheetName = CONFIG.VISUAL_PIPELINE.SHEET_NAME;

  ConfigResolver.apply();

  var response = ui.prompt(
    'Reuse An Approved Asset',
    'Which Visual Pipeline row?',
    ui.ButtonSet.OK_CANCEL
  );

  if (response.getSelectedButton() !== ui.Button.OK) {
    return;
  }

  var rowNumber = parseInt(response.getResponseText(), 10);

  if (isNaN(rowNumber) || rowNumber < CONFIG.DATA_START_ROW) {
    ui.alert('Reuse An Approved Asset', 'That is not a data row.', ui.ButtonSet.OK);
    return;
  }

  try {
    var rowData = SheetSchema.getRowData(rowNumber, sheetName);
    var sets = AssetLibrary.candidateSets(rowData);

    if (!sets.length) {
      ui.alert(
        'Reuse An Approved Asset',
        'Nothing in the library matches this row.\n\n' +
        'Matching is on visual domain and shape, and both have to agree — a ' +
        'square ICU image is not offered for a vertical dental post. An empty ' +
        'result usually means either the library has not accumulated anything ' +
        'for this domain yet, or the row has no resolvable domain.',
        ui.ButtonSet.OK
      );
      return;
    }

    var lines = [
      'Approved sets that match this row:',
      ''
    ];

    for (var i = 0; i < Math.min(sets.length, 8); i++) {
      lines.push(
        (i + 1) + ')  ' + sets[i].assets.length + ' asset(s) from ' +
        sets[i].contentId + (sets[i].wentLive ? '   [went live]' : '')
      );
      lines.push('     ' + sets[i].assets[0].url);
    }

    lines.push('');
    lines.push('Enter a number to use that set, or Cancel.');
    lines.push('');
    lines.push('The row will skip generation and go straight to Visual QA —');
    lines.push('reuse changes what the artwork costs, not whether it is checked.');

    var choice = ui.prompt('Reuse An Approved Asset', lines.join('\n'), ui.ButtonSet.OK_CANCEL);

    if (choice.getSelectedButton() !== ui.Button.OK) {
      return;
    }

    var index = parseInt(choice.getResponseText(), 10);

    if (isNaN(index) || index < 1 || index > Math.min(sets.length, 8)) {
      ui.alert('Reuse An Approved Asset', 'No set with that number.', ui.ButtonSet.OK);
      return;
    }

    var applied = AssetLibrary.applySet(rowNumber, sets[index - 1], sheetName);

    ui.alert(
      'Reuse An Approved Asset',
      applied.assets + ' asset(s) reused from ' + applied.from + '.\n\n' +
      'Row ' + rowNumber + ' is now at QA. Generation was skipped.',
      ui.ButtonSet.OK
    );

  } catch (e) {
    ui.alert('Reuse An Approved Asset', e.message || e.toString(), ui.ButtonSet.OK);
  }
}
