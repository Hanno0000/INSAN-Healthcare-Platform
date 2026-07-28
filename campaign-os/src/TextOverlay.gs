// ================================
// TEXT OVERLAY
//
// Arabic headlines are composited onto the artwork after generation instead of
// being asked of the image model.
//
// The model cannot render Arabic. Across one five-asset run it produced: a
// tablet headline in disconnected, reversed glyphs; a headline drawn twice on
// one card, the second copy corrupted ("مش مش مجرد افردي"); the prompt's own
// quotation marks drawn as artwork; and "PATICHT" on a patient file. These are
// not prompt failures — Arabic needs contextual letter shaping and RTL ordering,
// which a diffusion model reproduces by luck.
//
// Asking for text also poisons the rest of the frame. "The only text anywhere
// is X" sits in the same prompt as "a document covered in Arabic text", and the
// model resolves the contradiction by inventing scribble.
//
// So generation is told to produce no text at all, and the approved wording is
// set here as real type: correct shaping, exact wording, once, legible at mobile
// size, in a known font at a known position.
// ================================

// One-time setup. Creates the two blank presentations the overlay copies, and
// prints exactly what to do with them.
//
// The page size still has to be set by hand: there is no API for it anywhere —
// not at creation, not in batchUpdate, not in SlidesApp. Copying is the only
// operation that carries a page size, so these two files exist to be copied.
function setUpOverlayTemplates() {
  var wanted = [
    { key: '1:1', label: 'Square 1080 x 1080 (Static, Carousel)', w: 1080, h: 1080 },
    { key: '9:16', label: 'Vertical 1080 x 1920 (Story, Reel)', w: 1080, h: 1920 }
  ];

  var lines = [
    '',
    '=====================================================',
    ' OVERLAY TEMPLATE SETUP',
    '=====================================================',
    '',
    'Two blank presentations have been created. For each one:',
    '',
    '  1. Open the link below.',
    '  2. File > Page setup > Custom.',
    '  3. Choose Pixels, enter the size, click Apply.',
    '  4. Delete anything on the slide. Leave it completely blank.',
    '  5. Close it. Do not rename it.',
    '',
    'Then paste the IDs into CONFIG.TEXT_OVERLAY.TEMPLATES and run',
    'testTextOverlay().',
    ''
  ];

  var ids = {};

  for (var i = 0; i < wanted.length; i++) {
    var spec = wanted[i];
    var presentation = SlidesApp.create('INSAN Overlay Template ' + spec.key);
    var id = presentation.getId();
    ids[spec.key] = id;

    lines.push('--- ' + spec.label + ' ---');
    lines.push('  Set page size to: ' + spec.w + ' x ' + spec.h + ' pixels');
    lines.push('  Open:  https://docs.google.com/presentation/d/' + id + '/edit');
    lines.push('  ID:    ' + id);
    lines.push('');
  }

  lines.push('CONFIG.TEXT_OVERLAY.TEMPLATES should read:');
  lines.push('');
  lines.push('    TEMPLATES: {');
  lines.push("      '1:1': '" + ids['1:1'] + "',");
  lines.push("      '9:16': '" + ids['9:16'] + "'");
  lines.push('    },');
  lines.push('');
  lines.push('=====================================================');

  var message = lines.join('\n');
  Logger.log(message);

  try {
    var ui = SpreadsheetApp.getUi();
    ui.alert('Overlay Template Setup', message, ui.ButtonSet.OK);
  } catch (noUi) {
    // Running from the editor. The log above is the result.
  }

  return ids;
}


// Run this once from the Apps Script editor after adding the presentations
// scope. It composes a caption over a plain test image and drops the result in
// the generated-assets folder, so the Slides round trip is proven in seconds
// rather than discovered part-way through a paid batch.
function testTextOverlay() {
  var swatch = Utilities.newBlob(
    Utilities.base64Decode(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAABzenr0AAAADUlEQVR42mNk' +
      'YPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
    ),
    'image/png',
    'overlay-test'
  );

  var composed = TextOverlay.apply(
    swatch, 'القرار الطبي مش مجرد اجتهاد فردي.', 1080, 1080
  );

  var file = DriveApp.getFolderById(CONFIG.VISUAL_ASSETS.generated)
    .createFile(composed.setName('TEXT_OVERLAY_TEST.png'));

  // The first run of this test reported success while writing a blank 16:9
  // image, because nothing checked the shape of what came back. A square asset
  // that exports 16:9 means the template's page size was never set.
  var bytes = composed.getBytes();
  var width = ((bytes[16] & 255) << 24) | ((bytes[17] & 255) << 16) |
              ((bytes[18] & 255) << 8) | (bytes[19] & 255);
  var height = ((bytes[20] & 255) << 24) | ((bytes[21] & 255) << 16) |
               ((bytes[22] & 255) << 8) | (bytes[23] & 255);

  if (width !== height) {
    throw new Error(
      'The overlay produced a ' + width + ' x ' + height + ' image for a ' +
      'square asset. The 1:1 template still has the default widescreen page ' +
      'size — open it, File > Page setup > Custom, 1080 x 1080 pixels. ' +
      'The test file was still written so you can see it: ' + file.getUrl()
    );
  }

  var message = 'Overlay test written to: ' + file.getUrl() + '\n' +
    'Output: ' + width + ' x ' + height + '\n' +
    'Check TEXT_OVERLAY_TEST.png:\n' +
    '- the Arabic reads right to left and the letters are joined\n' +
    '- the wording is exactly: القرار الطبي مش مجرد اجتهاد فردي.\n' +
    '- it sits in the lower band, legible against the scrim\n' +
    'Delete the file afterwards.';

  Logger.log(message);

  // This is meant to be run from the editor, where there is no container UI.
  // Reporting through the dialog when one exists is a convenience; failing on
  // its absence would report a passing test as an error, which is exactly what
  // it did on the first real run.
  try {
    var ui = SpreadsheetApp.getUi();
    ui.alert('Text Overlay Test', 'It worked.\n\n' + message, ui.ButtonSet.OK);
  } catch (noUi) {
    // Running from the editor. The log above is the result.
  }
}


var TextOverlay = {

  // Slides is the only rasteriser available to Apps Script. The sequence is:
  // copy a template at the asset's page size, lay the artwork in full-bleed,
  // set the type over it, then export the page as an image.
  SLIDES_API: 'https://slides.googleapis.com/v1/presentations',

  // Returns a new blob with the wording set over the artwork, or null when
  // there is nothing to add. Throws only on a genuine failure, so the caller
  // can decide whether an untyped asset is still worth keeping.
  apply: function(imageBlob, text, widthPx, heightPx) {
    var wording = String(text || '').trim();

    if (!wording) {
      return null;
    }

    var cfg = CONFIG.TEXT_OVERLAY || {};
    var scratchId = null;

    try {
      scratchId = this._openScratch(widthPx, heightPx);

      var presentation = SlidesApp.openById(scratchId);

      // Read the page back rather than assuming it. The first version computed
      // its layout from the size it had asked for, and when that request was
      // ignored every coordinate was wrong: the type was positioned past the
      // bottom edge of a page 270pt shorter than expected, and exported blank.
      var pageW = presentation.getPageWidth();
      var pageH = presentation.getPageHeight();

      var slide = presentation.getSlides()[0];

      // Full-bleed. insertImage takes the blob directly, which avoids handing
      // Slides a Drive URL it may not be able to fetch.
      var image = slide.insertImage(imageBlob);
      image.setLeft(0).setTop(0).setWidth(pageW).setHeight(pageH);

      this._setType(slide, wording, pageW, pageH, cfg);

      var pageObjectId = slide.getObjectId();
      presentation.saveAndClose();

      return this._exportPage(scratchId, pageObjectId, imageBlob.getName());

    } finally {
      // The copy is scaffolding. Leaving it behind would put one presentation
      // in the operator's Drive per generated asset.
      if (scratchId) {
        try {
          DriveApp.getFileById(scratchId).setTrashed(true);
        } catch (cleanupErr) {
          Logger.log('TEXT_OVERLAY | could not trash scratch presentation: ' +
            cleanupErr.toString());
        }
      }
    }
  },

  // A presentation's page size cannot be set through the API at all: it is
  // ignored by presentations.create ("other fields in the request are
  // ignored"), there is no batchUpdate request for it, and SlidesApp has no
  // setter. A new presentation is always 10 x 5.63in widescreen, which would
  // export a 1:1 asset as 16:9 with the artwork stretched.
  //
  // Copying a presentation does carry its page size, so the size is set once by
  // hand in the Slides UI and every asset is a copy of that. Run
  // setUpOverlayTemplates() for the instructions.
  _openScratch: function(widthPx, heightPx) {
    var key = this._aspectKey(widthPx, heightPx);
    var templates = (CONFIG.TEXT_OVERLAY || {}).TEMPLATES || {};
    var templateId = templates[key];

    if (!templateId || !String(templateId).trim()) {
      throw new Error(
        'No overlay template configured for ' + key + ' assets. Run ' +
        'setUpOverlayTemplates() from the Apps Script editor — it prints the ' +
        'one-time setup, which takes about a minute — then put the ' +
        'presentation ID in CONFIG.TEXT_OVERLAY.TEMPLATES["' + key + '"].'
      );
    }

    try {
      return DriveApp.getFileById(templateId)
        .makeCopy('insan-overlay-scratch')
        .getId();
    } catch (e) {
      throw new Error(
        'Could not copy the ' + key + ' overlay template (' + templateId + '): ' +
        e.toString() + ' Check the ID in CONFIG.TEXT_OVERLAY.TEMPLATES.'
      );
    }
  },

  _aspectKey: function(widthPx, heightPx) {
    if (widthPx === heightPx) {
      return '1:1';
    }
    return heightPx > widthPx ? '9:16' : '16:9';
  },

  _setType: function(slide, wording, pageW, pageH, cfg) {
    var marginPct = cfg.MARGIN_PCT || 0.07;
    var bandPct = cfg.BAND_HEIGHT_PCT || 0.3;
    var atTop = String(cfg.POSITION || 'bottom').toLowerCase() !== 'bottom';

    var margin = pageW * marginPct;
    var boxW = pageW - (margin * 2);
    var boxH = pageH * bandPct;
    var boxTop = atTop ? margin : pageH - boxH - margin;

    // A scrim, not a decoration. Generated artwork has no reserved space for
    // type, so contrast against whatever the model happened to put there
    // cannot be assumed. Without this the headline is legible on some assets
    // and invisible on others, which is worse than consistently plain.
    //
    // It hugs the type. Padding the band by a full margin on both sides put it
    // across 44% of the frame, which swallows the photography the generation
    // was paid for.
    if (cfg.SCRIM_ALPHA > 0) {
      var pad = margin * 0.5;
      var scrimH = boxH + pad;
      var scrimTop = atTop ? 0 : pageH - scrimH;

      var scrim = slide.insertShape(
        SlidesApp.ShapeType.RECTANGLE, 0, scrimTop, pageW, scrimH
      );
      scrim.getFill().setSolidFill(cfg.SCRIM_COLOR || '#0d1b2a', cfg.SCRIM_ALPHA);
      scrim.getBorder().setTransparent();
    }

    var box = slide.insertTextBox(wording, margin, boxTop, boxW, boxH);
    var range = box.getText();

    range.getTextStyle()
      .setFontFamily(cfg.FONT_FAMILY || 'Cairo')
      .setFontSize(this._fontSizeFor(wording, boxW, cfg))
      .setForegroundColor(cfg.TEXT_COLOR || '#ffffff')
      .setBold(cfg.BOLD !== false);

    // Arabic set left-to-right reorders the words, so the direction has to be
    // stated. The alignment is START, not END: both are relative to the text
    // direction, so in right-to-left text END means the left edge. Setting END
    // left-aligned the headline — invisible on a first line that happens to
    // fill the width, obvious the moment it wrapped and "فردي." sat alone on
    // the left.
    var paragraphs = range.getParagraphs();
    for (var i = 0; i < paragraphs.length; i++) {
      var style = paragraphs[i].getRange().getParagraphStyle();
      style.setTextDirection(SlidesApp.TextDirection.RIGHT_TO_LEFT);
      style.setParagraphAlignment(SlidesApp.ParagraphAlignment.START);
    }

    box.setContentAlignment(atTop
      ? SlidesApp.ContentAlignment.TOP
      : SlidesApp.ContentAlignment.BOTTOM);
  },

  // Long headlines were the other half of the legibility problem: one asset
  // carried two dense lines across the top fifth of the frame, which is a
  // caption rather than a headline and unreadable on a phone. Scaling down
  // keeps long wording inside the band; it does not make it good copy, so the
  // caller is warned separately.
  _fontSizeFor: function(wording, boxW, cfg) {
    var max = cfg.MAX_FONT_PT || 44;
    var min = cfg.MIN_FONT_PT || 20;

    // Roughly how wide the wording wants to be, in points, at the maximum size.
    var perChar = max * 0.52;
    var wanted = wording.length * perChar;
    var lines = Math.max(1, Math.ceil(wanted / boxW));

    if (lines <= 2) {
      return max;
    }

    return Math.max(min, Math.round(max * (2 / lines)));
  },

  _exportPage: function(presentationId, pageObjectId, sourceName) {
    var url = this.SLIDES_API + '/' + presentationId + '/pages/' +
      pageObjectId + '/thumbnail' +
      '?thumbnailProperties.mimeType=PNG' +
      '&thumbnailProperties.thumbnailSize=LARGE';

    var response = UrlFetchApp.fetch(url, {
      headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
      muteHttpExceptions: true
    });

    if (response.getResponseCode() !== 200) {
      throw new Error(
        'Could not export the composed asset (HTTP ' +
        response.getResponseCode() + '): ' +
        response.getContentText().substring(0, 300)
      );
    }

    var contentUrl = JSON.parse(response.getContentText()).contentUrl;
    var composed = UrlFetchApp.fetch(contentUrl, { muteHttpExceptions: true });

    if (composed.getResponseCode() !== 200) {
      throw new Error('Composed asset URL returned HTTP ' + composed.getResponseCode());
    }

    var name = String(sourceName || 'asset').replace(/\.(png|jpg|jpeg)$/i, '');

    return composed.getBlob().setName(name + '.png');
  }
};
