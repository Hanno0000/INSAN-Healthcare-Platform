// PostFooter — what sits under the body of every published post.
//
// Standing hashtags merged with this post's own, then the hotline, then the
// WhatsApp link. Assembled in code rather than asked of the writer: a model
// reproducing six fixed tags gets it right nineteen times and drops one on the
// twentieth, and nobody reads twenty published posts hunting a missing brand.
//
// The defect that made this worth checking hard: a wa.me link is NOT the phone
// number with a country code glued on. The leading zero has to go. Two of the
// three links as first supplied by hand carried it, and would have been dead on
// every post they appeared on.

module.exports = {
  name: 'post footer',

  run(t) {
    const F = CONFIG.POST_FOOTER;
    const pages = CONFIG.CONTROLLED_VOCABULARY['Publishing Page'];

    // --- the wa.me trap ---
    t.is(PostFooter.whatsappNumber('01500668657'), '201500668657',
      'the leading zero is dropped — 2001500668657 is a dead link');
    t.is(PostFooter.whatsappNumber('01217778869'), '201217778869',
      'and again for Delta');
    t.is(PostFooter.whatsappNumber('201500668657'), '201500668657',
      'a number that already carries the country code is left alone');
    t.is(PostFooter.whatsappNumber('+20 150 066 8657'), '201500668657',
      'punctuation and spacing are stripped');
    t.is(PostFooter.whatsappNumber(''), '', 'nothing in, nothing out');
    t.is(PostFooter.whatsappLink(''), '', 'and no bare https://wa.me/');

    t.is(PostFooter.whatsappLink('01500668657'), 'https://wa.me/201500668657',
      'the link is built, not typed');

    for (const page of pages) {
      const link = PostFooter.whatsappLine(page);
      t.notOk(/wa\.me\/200/.test(link),
        `${page}'s WhatsApp link does not carry the extra zero`);
      t.ok(/wa\.me\/20[0-9]{10}$/m.test(link),
        `${page}'s link is a well-formed Egyptian wa.me number`);
    }

    // --- every page is complete ---
    for (const page of pages) {
      t.ok(F.HASHTAGS[page], `${page} has standing hashtags`);
      t.ok(F.CONTACT_LINES[page], `${page} has contact lines`);
      t.ok(PostFooter.hotlineLine(page), `${page} has a hotline line`);
      t.is((PostFooter.hotlineLine(page).match(/01\d{9}/g) || []).length, 2,
        `${page}'s hotline shows exactly two numbers`);
    }

    // The hotline numbers must be the page's own, not another page's.
    for (const page of pages) {
      const inFooter = F.CONTACT_LINES[page].hotline.slice().sort();
      const inBranding = CONFIG.BRANDING.CONTACT[page].phones.slice().sort();
      t.is(inFooter, inBranding,
        `${page}'s hotline matches the numbers composited onto its artwork — ` +
        'the same two numbers in the picture and in the caption');
    }

    // The WhatsApp number must be one of the page's own hotline numbers.
    for (const page of pages) {
      t.includes(F.CONTACT_LINES[page].hotline, F.CONTACT_LINES[page].whatsapp,
        `${page}'s WhatsApp number is one of its published numbers`);
    }

    // --- hashtag language separation ---
    // Primary is Arabic, Secondary is English. Mixing scripts inside one group
    // reads as a mistake, and the two columns exist to keep them apart.
    const arabic = /[؀-ۿ]/;

    for (const page of pages) {
      const set = F.HASHTAGS[page];

      t.ok(set.ar.every((tag) => arabic.test(tag)),
        `${page}'s Arabic set is Arabic`);
      t.ok(set.en.every((tag) => !arabic.test(tag)),
        `${page}'s English set carries no Arabic`);
      t.ok(set.ar.concat(set.en).every((tag) => tag.charAt(0) === '#'),
        `${page}'s tags all start with #`);
      t.ok(set.ar.concat(set.en).every((tag) => !/\s/.test(tag)),
        `${page} has no tag containing a space — that publishes as two tags`);
    }

    // --- the new tags, and what they cost ---
    t.includes(F.HASHTAGS.Delta.en, '#DeltaInternationalHospital',
      'Delta carries its own name in English — it had six Arabic tags to one');
    t.includes(F.HASHTAGS.Delta.en, '#LavenirMedical',
      'and its management company');
    t.includes(F.HASHTAGS.Future.en, '#WedgeGroup',
      'Wedge appears in English as well as Arabic');
    t.notOk(F.HASHTAGS.Future.en.indexOf('#InsanHealthcare') !== -1,
      '#InsanHealthcare is gone — it said the same thing as #InsanPlatform ' +
      'sitting beside it');

    for (const page of pages) {
      t.includes(F.HASHTAGS[page].en, '#EgyptHealthcare',
        `${page} carries the English market tag`);
      t.includes(F.HASHTAGS[page].ar, '#الرعاية_الصحية_في_مصر',
        `${page} carries the Arabic market tag`);
      t.includes(F.HASHTAGS[page].ar, '#مراكز_طبية_متخصصة',
        `${page} carries the centres tag, per PROJECT_DECISIONS`);
    }

    // The sets grow one approved suggestion at a time and the total is not
    // visible until something is published. This keeps it visible.
    const counts = PostFooter.counts();

    for (const page of pages) {
      t.ok(counts[page].ar <= F.MAX_TAGS_PER_LANGUAGE,
        `${page} carries ${counts[page].ar} Arabic tags, within the ` +
        `${F.MAX_TAGS_PER_LANGUAGE} the block is meant to hold`);
      t.ok(counts[page].en <= F.MAX_TAGS_PER_LANGUAGE,
        `${page} carries ${counts[page].en} English tags, within the limit`);
    }

    // Nothing is ever truncated — a tag missing from a published post looks
    // like an oversight nobody can trace.
    const over = PostFooter.mergeHashtags('Delta', '#أ #ب #ج #د #ه #و', 'ar');
    t.ok(over.length > F.MAX_TAGS_PER_LANGUAGE,
      'going over the limit is allowed');
    t.includes(over, '#و', 'and nothing is dropped when it happens');

    // --- merging ---
    const merged = PostFooter.mergeHashtags('INSAN', '#رعاية_مركزة', 'ar');
    t.includes(merged, '#منصة_إنسان', 'the standing set comes through');
    t.includes(merged, '#رعاية_مركزة', "and the writer's own tag is kept");
    t.is(merged[0], '#منصة_إنسان',
      'standing tags lead — a reader scanning the block meets the brand in the ' +
      'same place every time');

    // A writer that repeats a standing tag must not produce a duplicate the
    // reader can see.
    const repeated = PostFooter.mergeHashtags('INSAN', '#منصة_إنسان #جديد', 'ar');
    t.is(repeated.filter((x) => x === '#منصة_إنسان').length, 1,
      'a repeated standing tag is not duplicated');
    t.includes(repeated, '#جديد', 'and the genuinely new one survives');

    t.is(PostFooter.mergeHashtags('INSAN', 'INSAN_Care', 'en')
      .filter((x) => x === '#INSAN_Care').length, 1,
      'a tag written without its # is normalised, not dropped');

    t.is(PostFooter.mergeHashtags('INSAN', '#insan', 'en')
      .filter((x) => x.toLowerCase() === '#insan').length, 1,
      'case does not create a duplicate of a standing English tag');

    t.is(PostFooter.mergeHashtags('Nowhere', '#وحيد', 'ar'), ['#وحيد'],
      'an unknown page keeps the writer\'s tags and invents no standing set');
    t.is(PostFooter.mergeHashtags('INSAN', '', 'ar').length, F.HASHTAGS.INSAN.ar.length,
      'a row with no tags of its own still carries the standing set');

    t.is(PostFooter.mergeHashtags('INSAN', '#أ,  #ب   #ج', 'ar').length,
      F.HASHTAGS.INSAN.ar.length + 3,
      'tags separated by commas or runs of spaces are all read');

    // --- the assembled block ---
    const block = PostFooter.build('INSAN', '#رعاية_مركزة', '#ICU');
    const parts = block.split('\n\n');

    t.is(parts.length, 3,
      'three blocks: hashtags, hotline, WhatsApp — separated by one blank line ' +
      'each, as the operator asked');

    t.ok(parts[0].indexOf('\n') !== -1,
      'Arabic and English hashtags sit on their own lines');
    t.includes(parts[1], 'الخط الساخن', 'the hotline is labelled');
    t.is(parts[1].indexOf('\n'), -1,
      'the hotline and its two numbers are one line');
    t.includes(parts[2], 'للتواصل واتس', 'the WhatsApp invitation is labelled');
    t.includes(parts[2], 'https://wa.me/', 'and carries the link');
    t.ok(parts[2].indexOf('\n') !== -1,
      'the link sits on the line under its invitation');

    t.ok(block.indexOf('#') < block.indexOf('الخط الساخن'),
      'hashtags come before the contact block');

    t.is(PostFooter.build('Nowhere', '', ''), '',
      'an unknown page with no tags of its own produces no invented footer');

    // --- the switch ---
    const was = F.ENABLED;
    try {
      F.ENABLED = false;
      t.is(PostFooter.build('INSAN', '#x', '#y'), '', 'disabled means no footer');
    } finally {
      F.ENABLED = was;
    }

    // --- what the writer is shown ---
    const brief = PostFooter.briefFor('Delta');
    t.ok(brief, 'the writer is shown the standing set for its page');
    t.includes(brief, '#مستشفى_الدلتا_الدولي', 'including the actual tags');
    t.includes(brief, 'Do not repeat', 'and told not to restate them');
    t.is(PostFooter.briefFor('Nowhere'), '',
      'an unknown page shows nothing rather than another page\'s tags');
  }
};
