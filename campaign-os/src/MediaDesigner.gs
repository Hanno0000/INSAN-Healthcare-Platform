// ================================
// MEDIA DESIGNER
//
// Makes MEDIA_GENERATION_SERVICE.md executable.
//
// That document describes a Senior Visual Designer who reviews an execution
// against a paid-campaign standard, rejects what is generic, and refines until
// the work is worth publishing. None of it ran. Media Generation lived under
// CONFIG.SERVICES, which has no promptFile, so DriveLoader never loaded the
// file and no language model existed anywhere in the image path. The prompt was
// assembled by string concatenation in ServiceRunner: four overlapping
// descriptions of the same scene welded together, a hardcoded style line that
// contradicted the Creative Director, and 1,781 characters of prohibitions —
// 40% of the prompt. A carousel received one identical prompt per card.
//
// Concatenation cannot do what the document asks. It can strip the word
// "cinematic" with a regular expression; it cannot notice that an idea is dull.
//
// This runs the document as its own worker: it receives the approved package,
// composes one coherent prompt per asset through the eight production layers,
// and applies its own quality standard before returning. The silent review the
// document specifies stays silent — nothing here asks the model to expose it.
// ================================

var MediaDesigner = {

  WORKER_NAME: 'MEDIA_GENERATION',

  // Returns { prompts: [...], blocked: bool, blockedReason: '' }.
  //
  // One prompt per asset, in order. A carousel gets genuinely different scenes
  // because the designer is asked for them, not because a "|" was split.
  compose: function(rowData, assetCount, options) {
    options = options || {};

    var context = this._buildContext(rowData, assetCount, options);

    Logger.log(
      'MEDIA_DESIGNER | composing ' + assetCount + ' prompt(s) | context ' +
      context.length + ' chars (~' + Math.round(context.length / 4) + ' tokens)'
    );

    var response = AIProvider.call(context, {
      temperature: this._config().temperature,
      provider: this._config().provider
    });

    var parsed = this._parse(response.text, assetCount);

    if (parsed.blocked) {
      Logger.log('MEDIA_DESIGNER | blocked: ' + parsed.blockedReason);
    }

    return parsed;
  },

  _config: function() {
    var service = (CONFIG.SERVICES && CONFIG.SERVICES.MEDIA_GENERATION) || {};
    return service.designer || {};
  },

  _buildContext: function(rowData, assetCount, options) {
    var sections = [];

    sections.push(this._header());
    sections.push(this._trainingManual());

    var docs = this._projectDocs();
    if (docs) {
      sections.push(docs);
    }

    sections.push(this._brief(rowData));
    sections.push(this._contract(rowData, assetCount, options));

    return sections.filter(function(s) { return s; }).join('\n\n');
  },

  // No per-call values here — see ContextBuilder._buildHeader. This header
  // reproduced the same cache blocker; the manual behind it is 11,074 tokens
  // and is re-sent on every asset. (Audit A, finding F18.)
  _header: function() {
    return [
      'You are executing inside the INSAN Healthcare AI Operating System.',
      'Worker: MEDIA GENERATION SERVICE',
      '',
      'Your training manual follows. Follow it exactly.'
    ].join('\n');
  },

  _trainingManual: function() {
    var prompt = DriveLoader.loadPrompt(this.WORKER_NAME);

    if (!prompt) {
      throw new Error(
        'Could not load MEDIA_GENERATION_SERVICE.md. Check ' +
        'CONFIG.VISUAL_PROMPTS_FOLDER_ID and that the file exists in that folder.'
      );
    }

    return [
      '=== YOUR TRAINING MANUAL ===',
      '',
      prompt,
      '',
      '=== END OF TRAINING MANUAL ==='
    ].join('\n');
  },

  _projectDocs: function() {
    var names = this._config().docs || [];

    if (!names.length) {
      return '';
    }

    var sections = [];

    for (var i = 0; i < names.length; i++) {
      var content = DriveLoader.loadMarkdown(names[i], CONFIG.DOCS_FOLDER_ID);
      if (content) {
        sections.push('## ' + names[i] + '\n\n' + content);
      }
    }

    if (!sections.length) {
      return '';
    }

    return [
      '=== PROJECT DOCUMENTATION ===',
      '',
      sections.join('\n\n---\n\n'),
      '',
      '=== END OF PROJECT DOCUMENTATION ==='
    ].join('\n');
  },

  // The approved package, field by field and unmerged. The old assembly
  // flattened these into one run-on paragraph, which is why the same scene
  // arrived described four times.
  _brief: function(rowData) {
    var fields = [
      'Content ID', 'Content Format', 'Hospital Brand',
      'Creative Director Design Prompt', 'Visual Concept', 'Visual Focus',
      'Visual Priority', 'Design Mood', 'Composition', 'Visual Elements',
      'Do NOT Show', 'Design Notes', 'Reference Asset Package'
    ];

    var lines = ['=== PRODUCTION EXECUTION BRIEF ===', ''];

    for (var i = 0; i < fields.length; i++) {
      var value = String(rowData[fields[i]] || '').trim();
      if (value) {
        lines.push('### ' + fields[i]);
        lines.push(value);
        lines.push('');
      }
    }

    lines.push('=== END OF PRODUCTION EXECUTION BRIEF ===');

    return lines.join('\n');
  },

  // The manual defers its Inputs and Outputs to "the current Worker Contract".
  // This is that contract — the part that changes with the pipeline rather than
  // with the craft, which is why it lives here and not in the document.
  _contract: function(rowData, assetCount, options) {
    var lines = [
      '=== WORKER CONTRACT ===',
      '',
      '## What you are producing',
      '',
      'Text only. You do not generate the image — you write the prompt that will',
      'be sent to the image model, exactly as it will be sent.',
      ''
    ];

    if (assetCount > 1) {
      lines.push(
        '## This is a ' + assetCount + '-card carousel',
        '',
        'Write ' + assetCount + ' prompts. Each card is a distinct moment that',
        'advances one story — a different scene, a different camera position, a',
        'different beat. Cards that describe the same picture from the same angle',
        'are a production failure: the reader swipes and nothing happens.',
        '',
        'Hold the art direction constant across the set — the same palette,',
        'lighting character and rendering treatment — so the cards read as one',
        'family. Vary the scene, never the style.',
        ''
      );
    } else {
      lines.push('## This is a single image', '', 'Write 1 prompt.', '');
    }

    // Layer 7 of the manual assumes the image model sets the approved wording.
    // It no longer does. Arabic needs contextual shaping and RTL ordering, which
    // a diffusion model reproduces by luck: one run produced a headline in
    // disconnected reversed glyphs, a second corrupted copy of the same line on
    // one card, and the prompt's own quotation marks drawn as artwork. The
    // wording is now set as real type after generation.
    var wording = String(rowData['Text On Design'] || '').trim();
    var overlayOn = (CONFIG.TEXT_OVERLAY || {}).ENABLED;

    if (wording && overlayOn) {
      var atTop = String((CONFIG.TEXT_OVERLAY || {}).POSITION || 'bottom')
        .toLowerCase() === 'top';

      lines.push(
        '## Visible text — read this carefully, it overrides Layer 7',
        '',
        'Do not ask for any text, lettering or numerals in the artwork. Not the',
        'approved wording, not signage, not labels, not readable documents or',
        'screens. The image model cannot set Arabic type, and every attempt has',
        'produced malformed or duplicated script.',
        '',
        'The approved wording is composited onto the finished artwork as real',
        'typography, downstream of you:',
        '',
        '  "' + wording + '"',
        '',
        'Your job is to leave it somewhere to live. Compose so the ' +
          (atTop ? 'upper' : 'lower') + ' third',
        'carries no face, no hand and no critical detail — quiet tone, uncluttered.',
        'Treat it as reserved space in the composition, not as wasted frame.',
        ''
      );
    } else {
      lines.push(
        '## Visible text',
        '',
        'This asset carries no visible wording. Ask for no text, lettering or',
        'numerals of any kind.',
        ''
      );
    }

    if (options.usingReference) {
      lines.push(
        '## Project photographs are attached',
        '',
        'Real photographs of this facility will be supplied to the image model',
        'alongside your prompt. Write the prompt so it complements them: the',
        'architecture, finishes, equipment and uniforms come from the',
        'photographs, not from your description. Do not describe an environment',
        'from scratch, and do not ask for any person or any text visible in them',
        'to be reproduced.',
        ''
      );
    }

    lines.push(
      '## Your authority',
      '',
      'You own the execution, as your manual sets out under Creative Ownership:',
      'composition, camera placement, framing, focal emphasis, depth, lighting',
      'refinement, rhythm and spacing are yours. Do not wait for the brief to',
      'specify them, and do not settle for its first suggestion where a stronger',
      'execution of the same idea exists. If adding something the brief never',
      'mentioned makes the approved idea land harder, add it.',
      '',
      'What you may not do is change the idea, the message or the strategy, or',
      'contradict Do NOT Show, the Non-Negotiable Rules, or the Production Safety',
      'rules in your manual.',
      '',
      '## The standard',
      '',
      'This artwork runs as paid social advertising with real budget behind it.',
      'Apply your Internal Quality Check before you answer. If the execution is',
      'merely acceptable — generic, templated, stock-like, emotionally flat,',
      'or the kind of image a viewer scrolls past — rewrite it before returning.',
      'Do not return the review, or any explanation. Return the finished work.',
      '',
      '## If the brief cannot produce publishable work',
      '',
      'Only when the brief is genuinely unusable — internally contradictory, or',
      'missing what the image would have to be about — set "blocked" and say what',
      'is missing in one sentence. The row returns to the Creative Director. Do',
      'not use this because the brief is thin; a thin brief is what your',
      'execution authority is for.',
      '',
      '## Output',
      '',
      'Valid JSON, nothing before or after it, no markdown fence:',
      '',
      '{',
      '  "prompts": [' + this._exampleSlots(assetCount) + '],',
      '  "blocked": false,',
      '  "blocked_reason": ""',
      '}',
      '',
      'Exactly ' + assetCount + ' string(s) in "prompts". Each is a complete,',
      'self-contained prompt in English, written for an image model, following',
      'the eight production layers of your manual in order. No card numbers, no',
      'labels, no commentary.',
      '',
      '=== END OF WORKER CONTRACT ==='
    );

    return lines.join('\n');
  },

  _exampleSlots: function(assetCount) {
    var slots = [];
    for (var i = 0; i < assetCount; i++) {
      slots.push('"<prompt ' + (i + 1) + '>"');
    }
    return slots.join(', ');
  },

  _parse: function(responseText, assetCount) {
    var json = ResponseParser._extractJSON(
      ResponseParser._cleanResponseText(responseText)
    );

    if (!json) {
      throw new Error(
        'The Media Designer did not return valid JSON. First 300 characters: ' +
        String(responseText || '').substring(0, 300)
      );
    }

    if (json.blocked === true) {
      return {
        prompts: [],
        blocked: true,
        blockedReason: String(json.blocked_reason || 'No reason given.').trim()
      };
    }

    var prompts = json.prompts;

    if (!prompts || !prompts.length) {
      throw new Error('The Media Designer returned no prompts.');
    }

    // A short count means cards would silently share a prompt, which is the
    // defect this worker exists to remove. Fail instead.
    if (prompts.length < assetCount) {
      throw new Error(
        'The Media Designer returned ' + prompts.length + ' prompt(s) for ' +
        assetCount + ' assets. Generating would repeat a card.'
      );
    }

    var cleaned = [];
    for (var i = 0; i < assetCount; i++) {
      var prompt = String(prompts[i] || '').trim();

      if (!prompt) {
        throw new Error('The Media Designer returned an empty prompt at position ' + (i + 1) + '.');
      }

      cleaned.push(prompt);
    }

    return { prompts: cleaned, blocked: false, blockedReason: '' };
  }
};
