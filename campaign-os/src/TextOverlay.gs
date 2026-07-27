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

  Logger.log('Overlay test written to: ' + file.getUrl());

  SpreadsheetApp.getUi().alert(
    'Text Overlay Test',
    'It worked. Open the Generated assets folder and check ' +
    'TEXT_OVERLAY_TEST.png:\n\n' +
    '- the Arabic reads right to left and the letters are joined\n' +
    '- the wording is exactly: القرار الطبي مش مجرد اجتهاد فردي.\n' +
    '- it sits in the lower band, legible against the scrim\n\n' +
    'Delete the file afterwards.',
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}


var TextOverlay = {

  // Slides is the only rasteriser available to Apps Script. The sequence is:
  // create a presentation at the asset's exact page size, lay the artwork in
  // full-bleed, set the type over it, then export the page as an image.
  SLIDES_API: 'https://slides.googleapis.com/v1/presentations',

  // Points, not pixels. Slides measures in points at 96dpi, so 1080px = 810pt.
  PX_TO_PT: 0.75,

  // Returns a new blob with the wording set over the artwork, or null when
  // there is nothing to add. Throws only on a genuine failure, so the caller
  // can decide whether an untyped asset is still worth keeping.
  apply: function(imageBlob, text, widthPx, heightPx) {
    var wording = String(text || '').trim();

    if (!wording) {
      return null;
    }

    var cfg = CONFIG.TEXT_OVERLAY || {};
    var pageW = Math.round(widthPx * this.PX_TO_PT);
    var pageH = Math.round(heightPx * this.PX_TO_PT);

    var presentationId = null;

    try {
      var created = this._createPresentation(pageW, pageH);
      presentationId = created.presentationId;

      var presentation = SlidesApp.openById(presentationId);
      var slide = presentation.getSlides()[0];

      // Full-bleed. insertImage takes the blob directly, which avoids handing
      // Slides a Drive URL it may not be able to fetch.
      var image = slide.insertImage(imageBlob);
      image.setLeft(0).setTop(0).setWidth(pageW).setHeight(pageH);

      this._setType(slide, wording, pageW, pageH, cfg);

      presentation.saveAndClose();

      return this._exportPage(presentationId, created.pageObjectId, imageBlob.getName());

    } finally {
      // The presentation is scaffolding. Leaving it behind would fill the
      // operator's Drive with one file per generated asset.
      if (presentationId) {
        try {
          DriveApp.getFileById(presentationId).setTrashed(true);
        } catch (cleanupErr) {
          Logger.log('TEXT_OVERLAY | could not trash scratch presentation: ' +
            cleanupErr.toString());
        }
      }
    }
  },

  // Page size can only be set when the presentation is created — there is no
  // batchUpdate request for it — so this goes through the REST API rather than
  // SlidesApp.create(), which would give a 10x5.63in widescreen page and
  // letterbox a square asset.
  _createPresentation: function(pageW, pageH) {
    var response = UrlFetchApp.fetch(this.SLIDES_API, {
      method: 'post',
      contentType: 'application/json',
      headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
      payload: JSON.stringify({
        title: 'insan-overlay-scratch',
        pageSize: {
          width: { magnitude: pageW, unit: 'PT' },
          height: { magnitude: pageH, unit: 'PT' }
        }
      }),
      muteHttpExceptions: true
    });

    if (response.getResponseCode() !== 200) {
      throw new Error(
        'Could not create the overlay presentation (HTTP ' +
        response.getResponseCode() + '). If this says the Slides API is not ' +
        'enabled or the scope is missing, add ' +
        '"https://www.googleapis.com/auth/presentations" to appsscript.json ' +
        'and re-authorise. Response: ' +
        response.getContentText().substring(0, 300)
      );
    }

    var body = JSON.parse(response.getContentText());

    return {
      presentationId: body.presentationId,
      pageObjectId: body.slides[0].objectId
    };
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
    if (cfg.SCRIM_ALPHA > 0) {
      var scrimTop = atTop ? 0 : pageH - (boxH + margin * 2);
      var scrim = slide.insertShape(
        SlidesApp.ShapeType.RECTANGLE,
        0, scrimTop, pageW, boxH + margin * 2
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

    // Arabic set left-to-right reorders the words. Both the paragraph direction
    // and the alignment have to say so.
    var paragraphs = range.getParagraphs();
    for (var i = 0; i < paragraphs.length; i++) {
      var style = paragraphs[i].getRange().getParagraphStyle();
      style.setTextDirection(SlidesApp.TextDirection.RIGHT_TO_LEFT);
      style.setParagraphAlignment(SlidesApp.ParagraphAlignment.END);
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
