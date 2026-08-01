// ================================
// POST FOOTER
//
// What sits under the body of every published post: the page's standing
// hashtags merged with the one or two this post earned, then the hotline, then
// the WhatsApp link.
//
// ------------------------------------------------------------------------
// WHY THE MERGE IS IN CODE
//
// The Content Creation Worker is told what the standing set is, so it does not
// repeat it and can choose tags that complement it. But it does not assemble
// the final list. A model asked to reproduce six fixed hashtags will get it
// right nineteen times and drop one on the twentieth, and nobody reads twenty
// published posts looking for a missing brand tag.
//
// So the worker contributes only what is genuinely its judgement — what this
// particular post is about — and everything standing is merged here, the same
// way, every time.
//
// ------------------------------------------------------------------------
// THE wa.me TRAP
//
// A WhatsApp link is not the phone number with a country code glued to the
// front. wa.me wants an international number with the leading zero REMOVED:
//
//   01500668657   →   201500668657      correct
//   01500668657   →   2001500668657     dead link
//
// Two of the three links first supplied by hand carried the extra zero. They
// are derived from the phone number here so that mistake cannot be made again
// by typing.
// ================================

var PostFooter = {

  _config: function() {
    return CONFIG.POST_FOOTER || {};
  },

  _forPage: function(table, page) {
    var wanted = String(page || '').trim();

    if (!wanted || !table) {
      return null;
    }

    if (table[wanted]) {
      return table[wanted];
    }

    for (var key in table) {
      if (key.toLowerCase() === wanted.toLowerCase()) {
        return table[key];
      }
    }

    return null;
  },

  // ------------------------------------------------------------ hashtags

  // Standing tags first, then whatever the writer added that is not already
  // there. Order is deliberate: the brand set is what every post of this page
  // carries, and a reader scanning the block should meet it in the same place
  // each time.
  //
  // `written` is the raw column value — one line of space-separated tags.
  mergeHashtags: function(page, written, language) {
    var standing = this._forPage(this._config().HASHTAGS, page);
    var fixed = (standing && standing[language]) ? standing[language] : [];

    var seen = {};
    var out = [];

    var add = function(tag) {
      var clean = String(tag || '').trim();

      if (!clean) {
        return;
      }

      if (clean.charAt(0) !== '#') {
        clean = '#' + clean;
      }

      // Case-insensitive on the Latin side; Arabic has no case, so this is
      // simply a normalised key.
      var key = clean.toLowerCase();

      if (seen[key]) {
        return;
      }

      seen[key] = true;
      out.push(clean);
    };

    for (var i = 0; i < fixed.length; i++) {
      add(fixed[i]);
    }

    var extra = String(written || '').split(/[\s,]+/);

    for (var j = 0; j < extra.length; j++) {
      add(extra[j]);
    }

    // Reported, never truncated. Which tag to drop is a brand decision, and a
    // tag silently missing from a published post is worse than a long block —
    // it looks like an oversight nobody can trace.
    var limit = this._config().MAX_TAGS_PER_LANGUAGE || 0;

    if (limit && out.length > limit) {
      Logger.log(
        'POST_FOOTER | ' + String(page || '') + ' carries ' + out.length + ' ' +
        language.toUpperCase() + ' hashtags, over the ' + limit + ' the block ' +
        'is meant to hold. Nothing was dropped. On Facebook a long tag block ' +
        'reads as spam and its hashtag discovery is weak, so the cost is real. ' +
        'Trim CONFIG.POST_FOOTER.HASHTAGS.'
      );
    }

    return out;
  },

  // How many tags each page carries before the writer adds its own. Used by the
  // tests and worth reading whenever a suggestion is approved: the sets grow one
  // agreed addition at a time and nobody sees the total until it is published.
  counts: function() {
    var sets = this._config().HASHTAGS || {};
    var out = {};

    for (var page in sets) {
      out[page] = {
        ar: (sets[page].ar || []).length,
        en: (sets[page].en || []).length,
        total: (sets[page].ar || []).length + (sets[page].en || []).length
      };
    }

    return out;
  },

  // ------------------------------------------------------------- contact

  // 201500668657 — international, no plus, no leading zero.
  whatsappNumber: function(phone) {
    var digits = String(phone || '').replace(/\D/g, '');

    if (!digits) {
      return '';
    }

    // Already carries the country code.
    if (digits.indexOf('20') === 0 && digits.length >= 12) {
      return digits;
    }

    return '20' + digits.replace(/^0+/, '');
  },

  whatsappLink: function(phone) {
    var number = this.whatsappNumber(phone);
    return number ? 'https://wa.me/' + number : '';
  },

  // "الخط الساخن: 01100755556 - 01500668657"
  hotlineLine: function(page) {
    var cfg = this._config();
    var entry = this._forPage(cfg.CONTACT_LINES, page);

    if (!entry || !entry.hotline || !entry.hotline.length) {
      return '';
    }

    var numbers = [];

    for (var i = 0; i < entry.hotline.length; i++) {
      var phone = String(entry.hotline[i] || '').trim();

      if (phone) {
        numbers.push(phone);
      }
    }

    if (!numbers.length) {
      return '';
    }

    return (cfg.HOTLINE_LABEL || 'الخط الساخن') + ': ' +
      numbers.join(cfg.HOTLINE_SEPARATOR || ' - ');
  },

  // "للتواصل واتس دوس عاللينك:\nhttps://wa.me/201500668657"
  whatsappLine: function(page) {
    var cfg = this._config();
    var entry = this._forPage(cfg.CONTACT_LINES, page);

    if (!entry || !entry.whatsapp) {
      return '';
    }

    var link = this.whatsappLink(entry.whatsapp);

    if (!link) {
      return '';
    }

    return (cfg.WHATSAPP_LABEL || 'للتواصل واتس دوس عاللينك') + ':\n' + link;
  },

  // ------------------------------------------------------------- the block

  // Everything below the body, in publish order:
  //
  //   <arabic hashtags>
  //   <english hashtags>
  //
  //   الخط الساخن: 01100755556 - 01500668657
  //
  //   للتواصل واتس دوس عاللينك:
  //   https://wa.me/201500668657
  //
  // Returns '' when the page is unknown and the row has no hashtags of its own,
  // so an unrecognised page produces no invented footer.
  build: function(page, primaryHashtags, secondaryHashtags) {
    if (this._config().ENABLED === false) {
      return '';
    }

    var blocks = [];

    var arabic = this.mergeHashtags(page, primaryHashtags, 'ar');
    var english = this.mergeHashtags(page, secondaryHashtags, 'en');
    var tagLines = [];

    if (arabic.length) {
      tagLines.push(arabic.join(' '));
    }

    if (english.length) {
      tagLines.push(english.join(' '));
    }

    if (tagLines.length) {
      blocks.push(tagLines.join('\n'));
    }

    var hotline = this.hotlineLine(page);

    if (hotline) {
      blocks.push(hotline);
    }

    var whatsapp = this.whatsappLine(page);

    if (whatsapp) {
      blocks.push(whatsapp);
    }

    // A blank line between each block. The operator asked specifically for the
    // hotline and the WhatsApp invitation to be separated by one.
    return blocks.join('\n\n');
  },

  // What the Content Creation Worker is shown, so it does not repeat the
  // standing set and can pick tags that add to it rather than restate it.
  briefFor: function(page) {
    var standing = this._forPage(this._config().HASHTAGS, page);

    if (!standing) {
      return '';
    }

    var lines = [
      'Every post on this page already carries these, appended automatically:',
      ''
    ];

    if (standing.ar && standing.ar.length) {
      lines.push('  Arabic:  ' + standing.ar.join(' '));
    }

    if (standing.en && standing.en.length) {
      lines.push('  English: ' + standing.en.join(' '));
    }

    lines.push('');
    lines.push('Do not repeat any of them. Write one or two of your own in each');
    lines.push('field — the ones that belong to THIS post and would not fit any');
    lines.push('other. A tag that could sit on every post of this campaign is');
    lines.push('already above.');

    return lines.join('\n');
  }
};
