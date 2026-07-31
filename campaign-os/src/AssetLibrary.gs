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

  // ---------------------------------------------------------------- promote

  // Called when QA approves. Never throws: a library that cannot file an asset
  // must not fail a row that has just been approved.
  promote: function(rowNumber, sheetName) {
    try {
      var approvedFolderId = this._folderId('approved');

      if (!approvedFolderId || !String(approvedFolderId).trim()) {
        return { moved: 0, reason: 'no approved folder configured' };
      }

      var row = SheetSchema.getRowData(rowNumber, sheetName);
      var urls = String(row['Final Asset URL'] || '').trim();

      if (!urls) {
        return { moved: 0, reason: 'no Final Asset URL' };
      }

      var domain = this._domainKey(row);
      var aspect = this._aspectKey(row['Content Format']);
      var contentId = String(row[CONFIG.COLUMN_NAMES.CONTENT_ID] || 'unknown').trim();

      var folder = DriveApp.getFolderById(approvedFolderId);
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
          var extension = (file.getName().match(/\.(png|jpg|jpeg)$/i) || ['', 'png'])[1];

          file.setName([
            this.PREFIX, domain, aspect, contentId, (i + 1)
          ].join(this.SEPARATOR) + '.' + extension.toLowerCase());

          // Moving keeps the file id, so every URL already written to the sheet
          // still resolves. moveTo replaces all parents.
          file.moveTo(folder);
          moved++;

        } catch (fileErr) {
          Logger.log(
            'ASSET_LIBRARY | could not file asset ' + (i + 1) + ' of row ' +
            rowNumber + ': ' + fileErr.toString()
          );
        }
      }

      if (moved) {
        Logger.log(
          'ASSET_LIBRARY | filed ' + moved + ' approved asset(s) from row ' +
          rowNumber + ' | domain "' + domain + '" | ' + aspect
        );
      }

      return { moved: moved, domain: domain, aspect: aspect };

    } catch (e) {
      Logger.log('ASSET_LIBRARY | promote failed for row ' + rowNumber + ': ' + e.toString());
      return { moved: 0, error: e.toString() };
    }
  },

  // ------------------------------------------------------------------ reuse

  // What the library holds that would fit this row. Matching is deterministic
  // and narrow: the same visual domain and the same shape. Anything looser
  // would offer a corridor photograph for a cardiac post.
  //
  // Returns [{ name, url, id, contentId, index }], newest first.
  candidatesFor: function(rowData) {
    var approvedFolderId = this._folderId('approved');

    if (!approvedFolderId || !String(approvedFolderId).trim()) {
      return [];
    }

    var domain = this._domainKey(rowData);
    var aspect = this._aspectKey(rowData['Content Format']);
    var ownContentId = String(rowData[CONFIG.COLUMN_NAMES.CONTENT_ID] || '').trim();

    if (domain === 'none') {
      // Without a resolvable domain there is nothing to match on, and matching
      // on shape alone would offer any square image ever approved.
      return [];
    }

    var out = [];

    try {
      var files = DriveApp.getFolderById(approvedFolderId).getFiles();

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
          updated: file.getLastUpdated()
        });
      }

    } catch (e) {
      Logger.log('ASSET_LIBRARY | could not read the approved folder: ' + e.toString());
      return [];
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
        sets[id] = { contentId: id, assets: [], newest: candidates[i].updated };
        order.push(sets[id]);
      }

      sets[id].assets.push(candidates[i]);
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
        sets[i].contentId
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
