// DETERMINISTIC VISUAL PLAN — I3
//
// The Visual Planner writes exactly three columns, at 6,584 input tokens a row:
//
//   Asset Count              derivable from Content Format
//   Production Mode          already computed by DriveLoader.resolveAssetDomain
//   Reference Asset Package  largely restates the Creative Director's Design Prompt
//
// Two of three outputs are deterministic and the third duplicates upstream work.
// (VERDICT_AND_IMPROVEMENTS.md, improvement I3.)
//
// On Asset Count this is not merely cheaper, it is more accurate. A carousel's
// real asset count is the number of scenes the Creative Director actually wrote,
// and ServiceRunner throws when the two disagree — a row planned for five cards
// against a prompt describing three fails at generation, after strategy, copy
// and creative direction have all been paid for. Counting the scenes cannot
// disagree with them.
//
// Off by default. The visual pipeline has never completed a production run
// (Audit A, finding F19), and changing it before verifying it means verifying
// something other than what has been running. Verify first, then set
// CONFIG.VISUAL_PLAN.ENABLED to true.

var VisualPlan = {

  _config: function() {
    return CONFIG.VISUAL_PLAN || {};
  },

  isEnabled: function() {
    return !!this._config().ENABLED;
  },

  // ------------------------------------------------------------ asset count

  // For a carousel, the Creative Director's scene count is the answer. It is not
  // an estimate of what the row needs — it is what the row has direction for.
  assetCount: function(rowData) {
    var format = String(rowData['Content Format'] || '').trim().toLowerCase();
    var specs = this._specsFor(format);

    if (format !== 'carousel') {
      return specs.assetCount;
    }

    var scenes = this._sceneCount(rowData['Creative Director Design Prompt']) ||
      this._sceneCount(rowData['Design Prompt (AI)']);

    if (!scenes) {
      // No per-scene direction was written. Returning the default here would
      // hand the generator N copies of one paragraph; ServiceRunner refuses
      // that and sends the row back, which is the correct place for it to fail.
      return specs.assetCount;
    }

    return Math.max(
      specs.minAssetCount || 2,
      Math.min(scenes, specs.maxAssetCount || 10)
    );
  },

  // Mirrors ServiceRunner._segmentByAsset without importing its stripping: this
  // only needs to know how many scenes there are, not what they say.
  _sceneCount: function(designPrompt) {
    var raw = String(designPrompt || '');

    if (!raw.trim()) {
      return 0;
    }

    if (raw.indexOf('|') !== -1) {
      var pieces = raw.split('|').filter(function(p) { return p.trim(); });
      return pieces.length > 1 ? pieces.length : 0;
    }

    var markerRe = /(?:^|[\s.;,\-–—(])(?:slide|card|panel|frame|شريحة|كارت|لوحة)\s*#?\s*(\d+)\s*[:\-–—.)]/gi;
    var count = 0;

    while (markerRe.exec(raw) !== null) {
      count++;
    }

    return count > 1 ? count : 0;
  },

  _specsFor: function(format) {
    var specs = CONFIG.MEDIA_SPECS || {};

    switch (format) {
      case 'carousel':   return specs.CAROUSEL   || { assetCount: 3 };
      case 'story':      return specs.STORY      || { assetCount: 1 };
      case 'reel':       return specs.REEL       || { assetCount: 1 };
      case 'video':      return specs.SHORT_VIDEO || { assetCount: 1 };
      default:           return specs.STATIC_IMAGE || { assetCount: 1 };
    }
  },

  // --------------------------------------------------------- production mode

  // The decision was always deterministic: either photographs of this facility
  // exist for the row's domain or they do not. The Visual Planner was asked to
  // decide it from a folder listing the code had already read for it.
  productionMode: function(rowData) {
    try {
      var domain = DriveLoader.resolveAssetDomain(rowData);
      var assets = DriveLoader.listProjectAssets(domain);

      return {
        mode: assets.length ? 'PROJECT_ASSET' : 'AI_GENERATED',
        domain: domain ? domain.folder : null,
        assets: assets
      };

    } catch (e) {
      // A folder that cannot be read is not a reason to fail a row. Generating
      // is always possible; referencing is not.
      Logger.log('VISUAL_PLAN | asset lookup failed, defaulting to AI_GENERATED: ' +
        e.toString());
      return { mode: 'AI_GENERATED', domain: null, assets: [] };
    }
  },

  // ------------------------------------------------------------- the package

  // The Reference Asset Package tells the Media Designer what it is working
  // with. The creative direction it needs was already written by the Creative
  // Director; what it does not have is the production context — how many assets,
  // at what shape, against which photographs.
  //
  // So this composes the context and points at the direction, rather than
  // paraphrasing direction that already exists. A paraphrase is a second, worse
  // copy of the brief that can drift from the first.
  referencePackage: function(rowData, count, production) {
    var format = String(rowData['Content Format'] || 'Static').trim();
    var specs = this._specsFor(format.toLowerCase());
    var lines = [];

    lines.push(format + ' — ' + count + ' asset' + (count === 1 ? '' : 's') +
      ' at ' + (specs.aspectRatio || '1:1') +
      ' (' + (specs.width || 1080) + '×' + (specs.height || 1080) + ')');

    if (production.mode === 'PROJECT_ASSET') {
      lines.push('');
      lines.push('Production mode: PROJECT_ASSET.');
      lines.push('Real photographs of this facility are supplied as visual ' +
        'reference from the "' + production.domain + '" domain:');

      for (var i = 0; i < Math.min(production.assets.length, 12); i++) {
        lines.push('  - ' + production.assets[i]);
      }

      if (production.assets.length > 12) {
        lines.push('  … and ' + (production.assets.length - 12) + ' more');
      }

      lines.push('');
      lines.push('Architecture, finishes and equipment come from the ' +
        'photographs. Complement them rather than describing an environment ' +
        'from scratch.');
    } else {
      lines.push('');
      lines.push('Production mode: AI_GENERATED.');
      lines.push('No project photographs are available' +
        (production.domain ? ' for the "' + production.domain + '" domain' : '') +
        '. Describe the environment fully — nothing visual is supplied.');
    }

    if (count > 1) {
      var scenes = this._sceneCount(rowData['Creative Director Design Prompt']);
      lines.push('');
      lines.push(scenes
        ? 'The Creative Director Design Prompt carries ' + scenes +
          ' distinct scenes. One asset per scene, in order.'
        : 'The Creative Director Design Prompt is not segmented per scene. ' +
          'This row needs per-card direction before it can be produced.');
    }

    lines.push('');
    lines.push('Creative direction: use the Creative Director Design Prompt as ' +
      'written. It is the approved brief and is not restated here.');

    return lines.join('\n');
  },

  // --------------------------------------------------------------- the entry

  // Returns the three values the Visual Planner would have written, computed.
  plan: function(rowData) {
    var production = this.productionMode(rowData);
    var count = this.assetCount(rowData);

    return {
      'Asset Count': count,
      'Production Mode': production.mode,
      'Reference Asset Package': this.referencePackage(rowData, count, production)
    };
  }
};
