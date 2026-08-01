// ================================
// BRANDING OVERLAY
//
// Logos and contact numbers, composited onto finished artwork.
//
// This runs inside TextOverlay's Slides pass rather than as a worker of its
// own. That pass is a copy-export-trash per asset and it is the most expensive
// step in the visual path; a second pass would double it to add two small
// pictures and a line of type.
//
// ------------------------------------------------------------------------
// WHICH MARKS APPEAR
//
// From the row's `Hospital Brand`, following the brand architecture: a
// hospital carries the platform that governs it, the company that manages it,
// and its own mark.
//
//   INSAN   →  INSAN
//   Future  →  INSAN · Wedge Group · Future Specialized Hospital
//   Delta   →  INSAN · L'Venir Medical Service · Delta International Hospital
//
// INSAN is always first. The hierarchy reads the same way every time or it is
// not a hierarchy.
//
// ------------------------------------------------------------------------
// THE TEXT BUDGET
//
// Every post here is intended for paid promotion. Meta retired the automatic
// rejection at 20% text in 2020, but it remains guidance that affects delivery,
// so the headline band and the contact strip together are held under
// BRANDING.MAX_TEXT_BAND_PCT. Band height is a deliberately conservative proxy:
// the bands include their scrim, so the glyphs are always well inside it.
//
// Logos are artwork, not text, and are not counted against the budget — but
// they are kept small for the same reason, because three marks stacked in a
// corner is an endorsement line rather than a second headline.
// ================================

var Branding = {

  _config: function() {
    return CONFIG.BRANDING || {};
  },

  // ------------------------------------------------------------- the budget

  // Checked before anything is drawn. A band that is too tall is a
  // configuration mistake, and the place to find out is here rather than from
  // a campaign that under-delivered.
  assertTextBudget: function() {
    var cfg = this._config();
    var headline = (CONFIG.TEXT_OVERLAY || {}).BAND_HEIGHT_PCT || 0;
    var contact = (cfg.CONTACT_BAND || {}).HEIGHT_PCT || 0;
    var limit = cfg.MAX_TEXT_BAND_PCT || 0.20;
    var total = headline + contact;

    if (total > limit + 1e-9) {
      throw new Error(
        'The text bands cover ' + Math.round(total * 100) + '% of the image ' +
        '(headline ' + Math.round(headline * 100) + '%, contact ' +
        Math.round(contact * 100) + '%), over the ' + Math.round(limit * 100) +
        '% budget. Lower CONFIG.TEXT_OVERLAY.BAND_HEIGHT_PCT or ' +
        'CONFIG.BRANDING.CONTACT_BAND.HEIGHT_PCT.'
      );
    }

    return { headline: headline, contact: contact, total: total, limit: limit };
  },

  // -------------------------------------------------------------- the marks

  // The logo keys for a row, or [] when the brand is unknown.
  //
  // An unknown brand produces no marks rather than a default set: putting the
  // wrong hospital's logo on a post is worse than putting none, and it is not
  // recoverable once published.
  marksFor: function(hospitalBrand) {
    var sets = this._config().BRAND_SETS || {};
    var wanted = String(hospitalBrand || '').trim();

    if (!wanted) {
      return [];
    }

    if (sets[wanted]) {
      return sets[wanted];
    }

    // Case-insensitive second pass. The column is operator-typed.
    for (var key in sets) {
      if (key.toLowerCase() === wanted.toLowerCase()) {
        return sets[key];
      }
    }

    return [];
  },

  // Loads each mark as a blob. A mark that cannot be loaded is reported and
  // skipped — one missing file must not cost the whole asset.
  loadMarks: function(keys) {
    var cfg = this._config();
    var files = cfg.LOGOS || {};
    var out = [];
    var missing = [];

    for (var i = 0; i < keys.length; i++) {
      var name = files[keys[i]];

      if (!name) {
        missing.push(keys[i] + ' (no filename configured)');
        continue;
      }

      try {
        var blob = DriveLoader.loadProjectAsset(cfg.LOGO_FOLDER, name);

        if (!blob) {
          missing.push(keys[i] + ' (' + name + ' not found)');
          continue;
        }

        out.push({ key: keys[i], blob: blob });

      } catch (e) {
        missing.push(keys[i] + ' (' + e.toString() + ')');
      }
    }

    if (missing.length) {
      Logger.log('BRANDING | could not load: ' + missing.join(', '));
    }

    return { marks: out, missing: missing };
  },

  // ------------------------------------------------------------- placement

  // Where the marks sit. `auto` uses the corner the Media Designer reserved
  // when it wrote the image prompt — the only thing that knew what was going to
  // be in each corner before the image existed.
  cornerFor: function(rowData) {
    var placement = this._config().PLACEMENT || {};
    var configured = String(placement.CORNER || 'auto').toLowerCase();

    if (configured !== 'auto') {
      return configured;
    }

    var reserved = String((rowData || {})['Reserved Logo Corner'] || '')
      .trim().toLowerCase();

    var known = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];

    if (known.indexOf(reserved) !== -1) {
      return reserved;
    }

    return String(placement.FALLBACK_CORNER || 'top-left').toLowerCase();
  },

  // Lays the marks out inside the chosen corner. Returns one rectangle per
  // mark, in points, already inside the margin.
  //
  // The headline band owns the bottom of the frame, so a bottom corner is
  // lifted clear of it rather than overlapping — two things in one place is
  // how a logo ends up sitting on a word.
  layout: function(markCount, pageW, pageH, corner) {
    var placement = this._config().PLACEMENT || {};
    var margin = Math.min(pageW, pageH) * (placement.MARGIN_PCT || 0.05);
    var gap = Math.min(pageW, pageH) * (placement.GAP_PCT || 0.02);
    var size = Math.max(pageW, pageH) * (placement.LOGO_SCALE || 0.11);

    var horizontal = String(placement.DIRECTION || 'auto').toLowerCase() === 'row' ||
      (String(placement.DIRECTION || 'auto').toLowerCase() === 'auto' && pageW >= pageH);

    var span = markCount * size + (markCount - 1) * gap;

    // Keep the row or column inside the frame even at a large LOGO_SCALE.
    var available = (horizontal ? pageW : pageH) - (margin * 2);

    if (span > available && markCount > 0) {
      var shrink = available / span;
      size = size * shrink;
      gap = gap * shrink;
      span = markCount * size + (markCount - 1) * gap;
    }

    var atTop = corner.indexOf('top') === 0;
    var atLeft = corner.indexOf('left') !== -1;

    // The bottom band plus its scrim padding. Anything in a bottom corner
    // clears it.
    var bandH = pageH * ((CONFIG.TEXT_OVERLAY || {}).BAND_HEIGHT_PCT || 0) +
      pageH * ((this._config().CONTACT_BAND || {}).HEIGHT_PCT || 0);
    var bandTop = pageH - bandH - margin;

    var startX = atLeft ? margin : pageW - margin - (horizontal ? span : size);
    var startY = atTop ? margin : bandTop - (horizontal ? size : span) - gap;

    if (startY < margin) {
      startY = margin;
    }

    var boxes = [];

    for (var i = 0; i < markCount; i++) {
      boxes.push({
        left: horizontal ? startX + i * (size + gap) : startX,
        top: horizontal ? startY : startY + i * (size + gap),
        size: size
      });
    }

    return { boxes: boxes, size: size, horizontal: horizontal, corner: corner };
  },

  // ------------------------------------------------------------ the strip

  // "للتواصل  •  01500668657  •  01100755556"
  //
  // Returns '' when the page has no numbers configured, and the caller draws
  // nothing. A placeholder on a published post is worse than an absent line.
  contactLine: function(page) {
    var cfg = this._config();
    var contacts = cfg.CONTACT || {};
    var wanted = String(page || '').trim();
    var entry = contacts[wanted];

    if (!entry) {
      for (var key in contacts) {
        if (key.toLowerCase() === wanted.toLowerCase()) {
          entry = contacts[key];
          break;
        }
      }
    }

    if (!entry || !entry.phones || !entry.phones.length) {
      return '';
    }

    var parts = [];

    if (entry.label) {
      parts.push(entry.label);
    }

    for (var i = 0; i < entry.phones.length; i++) {
      var phone = String(entry.phones[i] || '').trim();

      if (phone) {
        parts.push(phone);
      }
    }

    if (parts.length < 2) {
      return '';
    }

    return parts.join((cfg.CONTACT_BAND || {}).SEPARATOR || '  •  ');
  },

  // -------------------------------------------------------------- drawing

  // Called from inside TextOverlay's Slides pass, after the headline is set.
  // Never throws: artwork with no logo is a fixable problem, and a row failed
  // at this point has already paid for its generation.
  apply: function(slide, rowData, pageW, pageH) {
    var cfg = this._config();

    if (cfg.ENABLED === false) {
      return { marks: 0, contact: false };
    }

    var drawn = 0;
    var contactDrawn = false;

    try {
      var keys = this.marksFor(rowData['Hospital Brand']);

      if (!keys.length) {
        Logger.log(
          'BRANDING | no logo set for Hospital Brand "' +
          String(rowData['Hospital Brand'] || '') + '" — nothing placed. An ' +
          'unrecognised brand gets no marks rather than the wrong ones.'
        );
      } else {
        var loaded = this.loadMarks(keys);
        var corner = this.cornerFor(rowData);
        var plan = this.layout(loaded.marks.length, pageW, pageH, corner);

        for (var i = 0; i < loaded.marks.length; i++) {
          var box = plan.boxes[i];
          var image = slide.insertImage(loaded.marks[i].blob);

          image.setLeft(box.left).setTop(box.top)
            .setWidth(box.size).setHeight(box.size);

          drawn++;
        }
      }

    } catch (e) {
      Logger.log('BRANDING | logo placement failed: ' + e.toString());
    }

    try {
      contactDrawn = this._drawContact(slide, rowData, pageW, pageH);
    } catch (e) {
      Logger.log('BRANDING | contact strip failed: ' + e.toString());
    }

    return { marks: drawn, contact: contactDrawn };
  },

  _drawContact: function(slide, rowData, pageW, pageH) {
    var cfg = this._config();
    var band = cfg.CONTACT_BAND || {};
    var page = rowData['Publishing Page'] || rowData['Page'] ||
      rowData['Hospital Brand'];
    var line = this.contactLine(page);

    if (!line) {
      Logger.log(
        'BRANDING | no contact numbers configured for page "' +
        String(page || '') + '" — the strip is left off rather than printed ' +
        'with a placeholder.'
      );
      return false;
    }

    var overlay = CONFIG.TEXT_OVERLAY || {};
    var margin = pageW * (overlay.MARGIN_PCT || 0.07);
    var bandH = pageH * (band.HEIGHT_PCT || 0.03);

    // Directly under the headline, inside the same scrim, so the two read as
    // one reserved zone rather than two separate intrusions.
    var top = pageH - bandH - (margin * 0.35);

    var box = slide.insertTextBox(line, margin, top, pageW - (margin * 2), bandH);
    var range = box.getText();

    range.getTextStyle()
      .setFontFamily(band.FONT_FAMILY || 'Cairo')
      .setFontSize(band.FONT_PT || 18)
      .setForegroundColor(band.TEXT_COLOR || '#ffffff')
      .setBold(false);

    var paragraphs = range.getParagraphs();

    for (var i = 0; i < paragraphs.length; i++) {
      var style = paragraphs[i].getRange().getParagraphStyle();
      style.setTextDirection(SlidesApp.TextDirection.RIGHT_TO_LEFT);
      style.setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
    }

    box.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);

    return true;
  }
};
