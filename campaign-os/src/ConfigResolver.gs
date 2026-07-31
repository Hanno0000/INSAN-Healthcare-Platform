// ================================
// CONFIG RESOLVER  (Audit A, finding F17)
//
// Eleven Google identifiers were hardcoded in CONFIG.gs — folder IDs, asset
// folders, overlay templates — plus the publishing page list. The architecture
// is portable; the configuration was not. A second brand meant editing a source
// file, which makes it a code fork rather than a deployment.
//
// This reads each one from Script Properties and falls back to the value in
// CONFIG.gs when the property is absent. So nothing changes until a property is
// set, and the current deployment keeps working untouched — which is the only
// safe way to migrate identifiers in a system that has never had a clean
// production run.
//
// It is called at the start of every entry point rather than at global scope:
// Apps Script evaluates files in the order they were pasted, and this file
// resolving before CONFIG.gs would throw on every execution.
// ================================

var ConfigResolver = {

  _applied: false,

  // Property name → where it lands in CONFIG. Dots descend into nested objects.
  MAP: {
    'DOCS_FOLDER_ID':            'DOCS_FOLDER_ID',
    'PROMPTS_FOLDER_ID':         'PROMPTS_FOLDER_ID',
    'VISUAL_PROMPTS_FOLDER_ID':  'VISUAL_PROMPTS_FOLDER_ID',
    'PROJECT_ASSETS_FOLDER_ID':  'PROJECT_ASSETS.FOLDER_ID',
    'VISUAL_ASSETS_GENERATED':   'VISUAL_ASSETS.generated',
    'VISUAL_ASSETS_APPROVED':    'VISUAL_ASSETS.approved',
    'VISUAL_ASSETS_REJECTED':    'VISUAL_ASSETS.rejected',
    'VISUAL_ASSETS_PUBLISHED':   'VISUAL_ASSETS.published',
    'VISUAL_ASSETS_ARCHIVE':     'VISUAL_ASSETS.archive',
    'OVERLAY_TEMPLATE_1_1':      'TEXT_OVERLAY.TEMPLATES.1:1',
    'OVERLAY_TEMPLATE_9_16':     'TEXT_OVERLAY.TEMPLATES.9:16'
  },

  // The page list is not an identifier but it is brand-specific in the same
  // way, and it gates publishing. Comma-separated in the property.
  PAGES_PROPERTY: 'PUBLISHING_PAGES',

  // Idempotent, and cheap: one getProperties() call for everything rather than
  // eleven getProperty() calls. Safe to invoke at the top of any entry point.
  apply: function(force) {
    if (this._applied && !force) {
      return { applied: 0, skipped: 0, cached: true };
    }

    var properties;

    try {
      properties = PropertiesService.getScriptProperties().getProperties() || {};
    } catch (e) {
      // Never let configuration resolution break a run. The hardcoded values
      // are a working configuration; failing here would take the system down
      // to fix something that is not currently broken.
      Logger.log('CONFIG_RESOLVER | could not read Script Properties: ' + e.toString());
      this._applied = true;
      return { applied: 0, skipped: 0, error: e.toString() };
    }

    var applied = [];
    var skipped = 0;

    for (var property in this.MAP) {
      var value = properties[property];

      if (!value || !String(value).trim()) {
        skipped++;
        continue;
      }

      if (this._set(this.MAP[property], String(value).trim())) {
        applied.push(property);
      }
    }

    var pages = properties[this.PAGES_PROPERTY];

    if (pages && String(pages).trim()) {
      var list = String(pages).split(',')
        .map(function(p) { return p.trim(); })
        .filter(function(p) { return p; });

      if (list.length) {
        CONFIG.CONTROLLED_VOCABULARY['Publishing Page'] = list;
        applied.push(this.PAGES_PROPERTY);
      }
    } else {
      skipped++;
    }

    this._applied = true;

    if (applied.length) {
      Logger.log(
        'CONFIG_RESOLVER | ' + applied.length + ' identifier(s) from Script ' +
        'Properties: ' + applied.join(', ') + ' | ' + skipped + ' using the ' +
        'value in CONFIG.gs'
      );
    }

    return { applied: applied.length, skipped: skipped, names: applied };
  },

  // Walks a dotted path and writes the leaf. Returns false rather than
  // creating structure: a property naming a path that does not exist is a
  // typo, and silently inventing the branch would hide it.
  _set: function(path, value) {
    var parts = path.split('.');
    var node = CONFIG;

    for (var i = 0; i < parts.length - 1; i++) {
      if (!node[parts[i]] || typeof node[parts[i]] !== 'object') {
        Logger.log('CONFIG_RESOLVER | no such path in CONFIG: ' + path);
        return false;
      }
      node = node[parts[i]];
    }

    node[parts[parts.length - 1]] = value;
    return true;
  },

  // What a second deployment would need to set. Used by the menu so the list
  // is generated from the map rather than maintained twice.
  report: function() {
    var properties = {};

    try {
      properties = PropertiesService.getScriptProperties().getProperties() || {};
    } catch (e) {
      properties = {};
    }

    var rows = [];

    for (var property in this.MAP) {
      rows.push({
        property: property,
        target: this.MAP[property],
        set: !!(properties[property] && String(properties[property]).trim())
      });
    }

    rows.push({
      property: this.PAGES_PROPERTY,
      target: "CONTROLLED_VOCABULARY['Publishing Page']",
      set: !!(properties[this.PAGES_PROPERTY] && String(properties[this.PAGES_PROPERTY]).trim())
    });

    return rows;
  }
};


// ================================
// MENU — AI Workers → Maintenance → Deployment Identifiers
// ================================

function showDeploymentIdentifiers() {
  var ui = SpreadsheetApp.getUi();
  var rows = ConfigResolver.report();
  var set = 0;

  var lines = [
    'Every Google identifier this deployment uses.',
    '',
    'Set means the value comes from Script Properties. Unset means it comes',
    'from CONFIG.gs, which works — it just makes a second deployment a code',
    'edit rather than a configuration step. (Audit A, finding F17.)',
    ''
  ];

  for (var i = 0; i < rows.length; i++) {
    lines.push((rows[i].set ? '[set]   ' : '[  ]    ') + rows[i].property);
    if (rows[i].set) {
      set++;
    }
  }

  lines.push(
    '',
    set + ' of ' + rows.length + ' set.',
    '',
    'Values are never shown here — a page token or a folder ID does not belong',
    'in a dialog anyone can screenshot.'
  );

  ui.alert('Deployment Identifiers', lines.join('\n'), ui.ButtonSet.OK);
}
