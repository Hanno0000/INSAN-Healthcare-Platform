// ================================
// ASSET INTEGRITY
//
// Deterministic checks on generated assets, run before Visual QA sees them.
//
// Visual QA is a vision model, and it grades what it was taught to grade. On
// one carousel it wrote "Package Deviations: None. Style and narrative align
// perfectly with the brief" and scored it A — while every one of the four cards
// was 1600x900 instead of square, showing only the top half of its composition
// with the subjects cut off at the chest. The description was accurate. Nobody
// had told it that a picture has dimensions.
//
// That is the shape of the problem: a model asked to judge composition judges
// composition. Properties that are true or false by arithmetic should be
// decided by arithmetic, before a token is spent — not left to whether the
// grader happens to think of them.
//
// Everything here is checked from the image bytes and the row, never inferred.
// ================================

var AssetIntegrity = {

  // Returns { passed: bool, failures: [string], notes: [string] }.
  //
  // `images` are the decoded assets as loaded for QA: { base64, mimeType }.
  check: function(images, rowData) {
    var cfg = CONFIG.ASSET_INTEGRITY || {};
    var failures = [];
    var notes = [];

    if (!images || !images.length) {
      return {
        passed: false,
        failures: ['No readable assets were supplied.'],
        notes: notes
      };
    }

    var measured = [];

    for (var i = 0; i < images.length; i++) {
      var size = this._measure(images[i]);

      if (!size) {
        // An unreadable header is not a judgement call — the file is not an
        // image this pipeline produced.
        failures.push('Asset ' + (i + 1) + ': dimensions could not be read.');
        continue;
      }

      measured.push(size);
    }

    if (!measured.length) {
      return { passed: false, failures: failures, notes: notes };
    }

    this._checkAssetCount(images, rowData, failures, notes);
    this._checkAspect(measured, rowData, failures, cfg);
    this._checkResolution(measured, failures, cfg);
    this._checkUniform(measured, failures);
    this._checkNotBlank(images, failures, cfg);
    this._checkNotDuplicated(images, failures);

    return { passed: failures.length === 0, failures: failures, notes: notes };
  },

  // The set that reaches QA must be the set that was asked for. A four-card
  // carousel that generated three is written as PARTIAL (3/4) and then graded,
  // approved and published as though it were whole, because nothing downstream
  // reads that status.
  _checkAssetCount: function(images, rowData, failures, notes) {
    var declared = parseInt(rowData['Asset Count'], 10);

    if (isNaN(declared) || declared < 1) {
      return;
    }

    if (images.length < declared) {
      failures.push(
        'Incomplete set: ' + images.length + ' readable asset(s) for a declared ' +
        'Asset Count of ' + declared + '. Publishing a short carousel breaks the ' +
        'sequence the copy refers to.'
      );
    } else if (images.length > declared) {
      notes.push(
        images.length + ' assets found but Asset Count says ' + declared + '.'
      );
    }
  },

  // Aspect, not exact dimensions. Assets legitimately arrive at more than one
  // size — the image model returns its own, and the text overlay re-exports at
  // the rasteriser's size — but the shape must always match the placement the
  // format was planned for.
  _checkAspect: function(measured, rowData, failures, cfg) {
    var spec = this._specFor(rowData['Content Format']);

    if (!spec || !spec.width || !spec.height) {
      return;
    }

    var wanted = spec.width / spec.height;
    var tolerance = cfg.ASPECT_TOLERANCE || 0.03;

    for (var i = 0; i < measured.length; i++) {
      var actual = measured[i].width / measured[i].height;
      var drift = Math.abs(actual - wanted) / wanted;

      if (drift > tolerance) {
        failures.push(
          'Asset ' + (i + 1) + ' is ' + measured[i].width + 'x' + measured[i].height +
          ' (' + actual.toFixed(3) + ':1) but ' + rowData['Content Format'] +
          ' requires ' + spec.width + 'x' + spec.height + ' (' + wanted.toFixed(3) +
          ':1). The artwork is cropped or stretched, not merely resized.'
        );
      }
    }
  },

  // Feed placements upscale whatever they are given. An asset well under the
  // planned size arrives soft on a phone screen, which no amount of art
  // direction recovers.
  _checkResolution: function(measured, failures, cfg) {
    var minEdge = cfg.MIN_LONG_EDGE || 1000;

    for (var i = 0; i < measured.length; i++) {
      var longest = Math.max(measured[i].width, measured[i].height);

      if (longest < minEdge) {
        failures.push(
          'Asset ' + (i + 1) + ' is ' + measured[i].width + 'x' + measured[i].height +
          '. The long edge must be at least ' + minEdge + 'px for a paid placement.'
        );
      }
    }
  },

  // A carousel is swiped. Cards of different sizes jump under the reader's
  // thumb, and it reads as a production error before the content is read at all.
  _checkUniform: function(measured, failures) {
    if (measured.length < 2) {
      return;
    }

    var first = measured[0];

    for (var i = 1; i < measured.length; i++) {
      if (measured[i].width !== first.width || measured[i].height !== first.height) {
        failures.push(
          'Cards are not the same size: asset 1 is ' + first.width + 'x' +
          first.height + ', asset ' + (i + 1) + ' is ' + measured[i].width + 'x' +
          measured[i].height + '.'
        );
        return;
      }
    }
  },

  // A blank or near-blank render compresses to almost nothing. This is a floor,
  // not a quality measure: it catches the failed generation and the composite
  // that lost its artwork, both of which describe well enough to be approved.
  _checkNotBlank: function(images, failures, cfg) {
    var floor = cfg.MIN_BYTES || 15000;

    for (var i = 0; i < images.length; i++) {
      var bytes = Math.floor(String(images[i].base64 || '').length * 0.75);

      if (bytes < floor) {
        failures.push(
          'Asset ' + (i + 1) + ' is only ' + Math.round(bytes / 1024) + 'KB. An ' +
          'image this small is blank or a failed render, whatever it appears to show.'
        );
      }
    }
  },

  // Identical cards were the visible symptom of the carousel receiving one
  // prompt N times. That cause is fixed, but the check is a byte comparison
  // costing nothing, and it fails the one defect a grader is least likely to
  // report — each card looks fine on its own.
  _checkNotDuplicated: function(images, failures) {
    for (var i = 0; i < images.length; i++) {
      for (var j = i + 1; j < images.length; j++) {
        if (images[i].base64 === images[j].base64) {
          failures.push(
            'Assets ' + (i + 1) + ' and ' + (j + 1) + ' are the same image.'
          );
          return;
        }
      }
    }
  },

  _specFor: function(contentFormat) {
    var format = String(contentFormat || '').trim().toLowerCase();
    var specs = CONFIG.MEDIA_SPECS || {};

    if (format === 'story') return specs.STORY;
    if (format === 'reel') return specs.REEL;
    if (format === 'carousel') return specs.CAROUSEL;
    if (format === 'video' || format === 'motion graphic') return specs.SHORT_VIDEO;

    return specs.STATIC_IMAGE;
  },

  // Dimensions from the file header. PNG carries them at a fixed offset; JPEG
  // requires walking the segment chain to a start-of-frame marker.
  _measure: function(image) {
    try {
      var bytes = Utilities.base64Decode(image.base64);

      if (this._isPng(bytes)) {
        return {
          width: this._readUInt32(bytes, 16),
          height: this._readUInt32(bytes, 20)
        };
      }

      if ((bytes[0] & 255) === 0xFF && (bytes[1] & 255) === 0xD8) {
        return this._measureJpeg(bytes);
      }

      return null;

    } catch (e) {
      Logger.log('ASSET_INTEGRITY | could not measure an asset: ' + e.toString());
      return null;
    }
  },

  _isPng: function(bytes) {
    return (bytes[0] & 255) === 0x89 && (bytes[1] & 255) === 0x50 &&
           (bytes[2] & 255) === 0x4E && (bytes[3] & 255) === 0x47;
  },

  _measureJpeg: function(bytes) {
    var i = 2;

    while (i < bytes.length - 9) {
      if ((bytes[i] & 255) !== 0xFF) {
        i++;
        continue;
      }

      var marker = bytes[i + 1] & 255;

      // Start-of-frame markers carry the dimensions. C4, C8 and CC are tables
      // and definitions that happen to sit in the same range.
      var isSof = marker >= 0xC0 && marker <= 0xCF &&
        marker !== 0xC4 && marker !== 0xC8 && marker !== 0xCC;

      if (isSof) {
        return {
          height: this._readUInt16(bytes, i + 5),
          width: this._readUInt16(bytes, i + 7)
        };
      }

      i += 2 + this._readUInt16(bytes, i + 2);
    }

    return null;
  },

  _readUInt16: function(bytes, offset) {
    return ((bytes[offset] & 255) << 8) | (bytes[offset + 1] & 255);
  },

  _readUInt32: function(bytes, offset) {
    return ((bytes[offset] & 255) * 16777216) +
           ((bytes[offset + 1] & 255) << 16) +
           ((bytes[offset + 2] & 255) << 8) +
           (bytes[offset + 3] & 255);
  }
};
