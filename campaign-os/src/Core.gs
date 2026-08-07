// ===========================================================================
// Core.gs
//
// Configuration, logging, and the sheet and Drive layers everything else is
// built on.
//
// Merged from 7 source files on 2026-08-02. Apps Script has no
// modules: every .gs is evaluated into one shared scope before anything is
// called, so which file a definition sits in has never affected what runs.
// They were split for reading and merged because the operator pastes each
// file into the editor by hand.
//
// The BEGIN/END banners below are load-bearing for the tests, which read a
// section by name — see tests/run.js, fixtures.srcSection.
//
// Contents:
//   CONFIG.gs
//   ConfigResolver.gs
//   Logger.gs
//   SheetSchema.gs
//   SheetWriter.gs
//   DriveLoader.gs
//   ResponseParser.gs
// ===========================================================================


// ---------------------------------------------------------------------------
// BEGIN SOURCE FILE: CONFIG.gs
// ---------------------------------------------------------------------------
// ================================
// PRODUCTION CONFIGURATION
// This section is frozen.
// Do not modify unless explicitly requested.
// ================================

// Declared before CONFIG so it can be referenced from inside the literal.
// Content Format offered to workers must equal what the pipeline can build.
var CONFIG_IMPLEMENTED_FORMATS = ['Static', 'Carousel', 'Story', 'Infographic'];

var CONFIG = {

  SHEET_NAME: 'Content Pipeline',
  DOCS_FOLDER_ID: '1jV62YARsYyAED7hIg6HVpe6Swj8wtaVH',
  PROMPTS_FOLDER_ID: '1GbZxU9ndwrZLOqtz7kBBfH2nDlG1CWj-',
  VISUAL_PROMPTS_FOLDER_ID: '18TQFFAZoMfqLAE8TRzpOKTs6L001o9Zt',

  // Confirmed against Drive by the operator, 2026-08-02.
  //
  // These three used to be readable ONLY from Script Properties, which made
  // them the last pieces of setup with no working default — and
  // KNOWLEDGE_FOLDER_ID had no fallback at all, so W1 could not find a single
  // file until someone remembered to set it. They now follow the same rule as
  // the eleven above: the Script Property wins where it is set, this value is
  // used where it is not.
  KNOWLEDGE_FOLDER_ID: '1fwd_BX_rGfc2954FG52fZKzCW_Q6yizS',
  PLANNING_PROMPTS_FOLDER_ID: '1wIpi1lCRYPs0tTmanIrCADlxVb6L92x4',
  ADS_PROMPTS_FOLDER_ID: '1YTwCq10ijTWale06kPG9p7SwGAD2LY6j',

  AI_PROVIDER: 'gemini',

  // PRODUCTION MODEL
  // Do not change unless explicitly requested.
  GEMINI_MODEL: 'gemini-3.5-flash',
  GEMINI_TEMPERATURE: 0.7,
  GEMINI_MAX_OUTPUT_TOKENS: 8192,

  // ================================
  // ALTERNATE PROVIDER (dormant)
  // Used only by workers that name it. To enable:
  //   1. Add ANTHROPIC_API_KEY to Script Properties
  //   2. Add provider: 'claude' to the worker in the WORKERS block below
  // Suggested first candidates, by expected return:
  //   CREATIVE_DIRECTOR_WORKER — owns every creative decision
  //   VISUAL_QA_WORKER         — reads text inside images
  //   CONTENT_CREATION_WORKER  — writes the published Arabic
  // ================================

  CLAUDE_MODEL: 'claude-sonnet-5',
  CLAUDE_MAX_OUTPUT_TOKENS: 8192,

  // ================================
  // CREATIVE CRITIC (opt-in)
  // The Creative Director writes the package and grades its own work in one
  // inference, and graded five different campaigns identically. This runs a
  // second, independent pass that re-scores the finished package against the
  // deduction rubric — it does not rewrite anything, so it costs a fraction of
  // a full generation rather than doubling it.
  //
  // Off by default: it is a real cost increase and the decision is the
  // operator's. Set ENABLED to true to turn it on.
  // ================================

  CREATIVE_CRITIC: {
    ENABLED: false,
    provider: null,   // null inherits AI_PROVIDER; 'claude' for an independent read
    model: null,
    temperature: 0.2
  },

  // ================================
  // INSAN VISUAL LANGUAGE
  // Canonical visual identity for all generated media.
  // All workers must reference this standard.
  // ================================

  VISUAL_LANGUAGE: {
    IDENTITY: {
      label: 'INSAN Premium Editorial Visual Language',
      philosophy: 'Designed artwork, not fake photography',
      goal: 'Human warmth, premium healthcare branding, Egyptian healthcare environment'
    },
    STYLE_RATIO: {
      STYLIZED_REALISM: 0.70,
      SEMI_REALISTIC_EDITORIAL: 0.20,
      THREE_D_MATTE: 0.10
    },
    STYLE_GUIDELINES: [
      'Modern composition',
      'Soft realistic rendering',
      'Social-media friendly',
      'Clearly designed artwork rather than fake photography',
      'Premium healthcare branding',
      'Egyptian healthcare environment',
      'Human warmth'
    ],
    STRICTLY_AVOID: [
      'Cartoon style',
      'Anime',
      'Pixar',
      'Comic-book style',
      'Hyper-realistic AI photography',
      'Uncanny faces',
      'Plastic skin',
      'Obvious AI artifacts',
      'Photorealistic generation'
    ]
  },

  // ================================
  // PROJECT ASSETS CONFIGURATION
  // Future: Reference images for visual production.
  // Currently a workflow hook — folder is empty.
  // ================================

  // ================================
  // PROJECT ASSETS
  // Real photographs of the actual facilities, used as visual reference so the
  // model renders these hospitals rather than a generic idea of a hospital.
  //
  // To activate: put the Drive folder ID below, and create subfolders inside it
  // named exactly as the `folder` values here. Drop real photos in. Nothing else
  // is required — an empty or missing subfolder falls back to AI_GENERATED.
  // ================================

  // Drive: My Drive / Insan / business / Media
  //   Media/
  //   ├── Brand Identity/
  //   └── Services/
  //       ├── Emergency Department/
  //       ├── Intensive Care Unit/
  //       └── ...
  //
  // `folder` below is a path relative to FOLDER_ID; "/" descends a level.
  // ================================
  // BRANDING OVERLAY
  //
  // Logos and contact details are composited onto finished artwork, in the same
  // Slides pass that sets the Arabic headline. Not a separate worker: that pass
  // is a copy-export-trash per asset and it is the most expensive step in the
  // visual path, so doing this in a second one would double it for no gain.
  //
  // WHICH LOGOS — decided by the row's `Hospital Brand`, per the brand
  // architecture. A hospital carries three marks: the platform it belongs to,
  // the company that manages it, and its own.
  //
  // THE META TEXT RULE — Meta retired the automatic rejection at 20% text in
  // 2020; it is now guidance that affects delivery rather than a hard block.
  // The constraint is kept anyway because every post here is intended for paid
  // promotion. Band height is a conservative proxy for text area: the bands
  // include their scrim, so the glyphs themselves are always well under it.
  // ================================

  BRANDING: {
    ENABLED: true,

    // Drive: My Drive / Insan / business / Media / Brand Identity / Png
    // Resolved from PROJECT_ASSETS.FOLDER_ID, so only one id is configured.
    //
    // `business/Media` was reorganised per hospital on 2026-08-06 — Insan/,
    // Future/, Delta/ — which is right for PHOTOGRAPHS: a ward photo belongs to
    // the hospital it was taken in. The reorganisation swept Brand Identity into
    // Future/ along with them, and every logo lookup then resolved to nothing.
    // That does not throw — Branding places the marks it finds and logs the rest
    // — so artwork would have come out unbranded with one line in the log.
    //
    // LOGOS ARE NOT PER HOSPITAL, and that is the whole reason this sits at the
    // Media root beside the three hospital folders rather than inside one of
    // them. BRAND_SETS below is the proof: a Future post carries INSAN + WEDGE +
    // FUTURE marks, a Delta post carries INSAN + LVENIR + DELTA. Every post needs
    // marks belonging to several brands at once, so no per-hospital folder can
    // hold them. Moved back up 2026-08-07.
    LOGO_FOLDER: 'Brand Identity/Png',

    // The `* Transparent.png` set only. Every one is verified RGBA.
    // The `* White.png` files have NO alpha channel — placing one composites a
    // solid white rectangle over the artwork. Do not use them here; the light
    // and dark variants come from TINT below.
    LOGOS: {
      INSAN:   'Color.png',
      FUTURE:  'Future Transparent.png',
      DELTA:   'Delta Transparent.png',
      WEDGE:   'Wedge Transparent.png',
      LVENIR:  'lvenir Transparent.png'
    },

    // Hospital Brand → the marks that appear, in order. INSAN first: the
    // platform governs, and the hierarchy should read the same way every time.
    BRAND_SETS: {
      'INSAN':  ['INSAN'],
      'Future': ['INSAN', 'WEDGE', 'FUTURE'],
      'Delta':  ['INSAN', 'LVENIR', 'DELTA']
    },

    // Two numbers per page, reachable on both WhatsApp and phone.
    // Supplied by the operator 2026-07-31.
    //
    // ⚠️ 01500668657 is listed for BOTH Insan and Delta. That may be deliberate
    // — one line answering for two pages — or a slip. It is left exactly as
    // given rather than deduplicated, because guessing which page loses a
    // number is not a decision code should make. The check in tests reports it
    // rather than failing on it.
    CONTACT: {
      'INSAN':  { phones: ['01500668657', '01100755556'], label: 'للتواصل' },
      'Future': { phones: ['01151001177', '01122224352'], label: 'للتواصل' },
      'Delta':  { phones: ['01217778869', '01500668657'], label: 'للتواصل' }
    },

    // Optional. Missing icons degrade to the label alone rather than failing —
    // a post without a small glyph is fine, a post that never shipped is not.
    // One level above the logos, in Brand Identity itself.
    ICON_FOLDER: 'Brand Identity',
    ICONS: {
      WHATSAPP: 'icon-whatsapp.png',
      PHONE:    'icon-phone.png'
    },

    PLACEMENT: {
      // Which corner the logos sit in. `auto` uses the corner MediaDesigner
      // reserved when it wrote the image prompt — it is the only thing that
      // knows what was asked for in each corner before the image existed.
      CORNER: 'auto',
      FALLBACK_CORNER: 'top-left',

      // Longest side of a single logo, as a fraction of the image's longest
      // side. Small: three marks in a corner is an endorsement line, not a
      // headline.
      LOGO_SCALE: 0.11,
      GAP_PCT: 0.02,
      MARGIN_PCT: 0.05,

      // Laid out along the short axis of the corner they sit in.
      DIRECTION: 'auto',

      // Only white and black, and only when the artwork demands it — a tinted
      // brand mark is already a compromise, and a coloured one is a different
      // logo. `auto` follows the scrim's own lightness.
      TINT: 'auto'
    },

    // The contact strip sits directly under the headline band, inside the same
    // scrim, so the two together are one reserved zone rather than two.
    CONTACT_BAND: {
      HEIGHT_PCT: 0.03,
      FONT_FAMILY: 'Cairo',
      FONT_PT: 18,
      TEXT_COLOR: '#ffffff',
      SEPARATOR: '  •  '
    },

    // Headline band + contact band, as a fraction of image height. Checked
    // before anything is drawn: exceeding it is a configuration error, not
    // something to discover on a rejected ad.
    MAX_TEXT_BAND_PCT: 0.16
  },

  // ================================
  // POST FOOTER
  //
  // What every published post carries under its body: the page's standing
  // hashtags, then the hotline, then the WhatsApp link.
  //
  // These are configuration, not writing. The Content Creation Worker is told
  // what the standing set is so it does not repeat it, and contributes only the
  // one or two tags that belong to this specific post — but the merge happens
  // in code, in `_composeFinalPostCopy`. A model that drops a brand hashtag
  // would do it silently on one post in twenty, and nobody reads twenty posts
  // looking for a missing tag.
  //
  // Assembled after the Creative Director approves, so the published text is
  // one block: body, standing + post hashtags, hotline, WhatsApp.
  // ================================

  POST_FOOTER: {
    ENABLED: true,

    // Standing tags per page. Arabic and English are kept apart because the
    // two hashtag columns are split that way — Primary is Arabic, Secondary is
    // English, and mixing scripts inside one group reads as a mistake.
    // Extended 2026-07-31 on the operator's approval. Three changes beyond the
    // originals:
    //
    //   · every page gained the market tags #EgyptHealthcare and
    //     #الرعاية_الصحية_في_مصر, plus #مراكز_طبية_متخصصة — the last one carries
    //     PROJECT_DECISIONS' "centres, not departments" into the tag block
    //   · Delta gained its own name in English and its management company's;
    //     it had six Arabic tags against one English
    //   · Future dropped #InsanHealthcare, which said the same thing as
    //     #InsanPlatform sitting beside it
    //
    // ⚠️ These sets are long. See the note on MAX_TAGS_PER_LANGUAGE below.
    HASHTAGS: {
      'INSAN': {
        ar: ['#منصة_إنسان', '#منظومة_إنسان_الصحية', '#إدارة_المستشفيات',
             '#معايير_موحدة', '#مراكز_طبية_متخصصة', '#الرعاية_الصحية_في_مصر'],
        en: ['#INSAN', '#HealthcarePlatform', '#EgyptianHealthcarePlatform',
             '#HospitalOperations', '#EgyptHealthcare']
      },
      'Future': {
        ar: ['#ويدج_جروب_لإدارة_المستشفيات', '#منصة_إنسان',
             '#مستشفى_المستقبل_التخصصي', '#مراكز_طبية_متخصصة',
             '#الرعاية_الصحية_في_مصر'],
        en: ['#FutureHospital', '#InsanPlatform', '#WedgeGroup',
             '#EgyptHealthcare']
      },
      'Delta': {
        ar: ['#الثقة_لها_دليل', '#كل_تفصيلة_بتحكي', '#الفرق_في_التجربة',
             '#لافينير_لإدارة_المستشفيات', '#منصة_إنسان', '#مستشفى_الدلتا_الدولي',
             '#مراكز_طبية_متخصصة', '#الرعاية_الصحية_في_مصر'],
        en: ['#InsanPlatform', '#DeltaInternationalHospital', '#LavenirMedical',
             '#EgyptHealthcare']
      }
    },

    // Where the block stops being a block and starts being a wall.
    //
    // Nothing truncates. This is a reporting threshold: a tag silently dropped
    // from a published post is worse than a long block, and which one to drop
    // is a brand decision. Exceeding it is logged when the footer is built and
    // reported by the tests, so the count stays visible rather than growing
    // one approved suggestion at a time until somebody notices on a live page.
    MAX_TAGS_PER_LANGUAGE: 8,

    // The hotline line, then a blank line, then the WhatsApp line.
    //
    // ⚠️ The wa.me numbers are NOT the phone numbers with a country code glued
    // on. wa.me takes an international number with the leading zero REMOVED:
    // 01500668657 becomes 201500668657, not 2001500668657. Two of the three
    // links as first supplied carried the extra zero and would have been dead
    // on every post they appeared on. Corrected here; `whatsappLink` derives
    // them from the phone number so the mistake cannot recur by hand.
    CONTACT_LINES: {
      'INSAN':  { hotline: ['01100755556', '01500668657'], whatsapp: '01500668657' },
      'Future': { hotline: ['01122224352', '01151001177'], whatsapp: '01151001177' },
      'Delta':  { hotline: ['01217778869', '01500668657'], whatsapp: '01217778869' }
    },

    HOTLINE_LABEL: 'الخط الساخن',
    WHATSAPP_LABEL: 'للتواصل واتس دوس عاللينك',
    HOTLINE_SEPARATOR: ' - '
  },

  PROJECT_ASSETS: {
    FOLDER_ID: '1KIYMoXT-nKRxfKssmzvinuCJLRW-zdAw',
    SUPPORTED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
    MAX_REFERENCE_IMAGES: 3,

    // Keywords are matched against Campaign Name, Visual Concept, Visual Focus
    // and Visual Elements. Matching is deterministic and needs no model call.
    // Order matters: the first domain with a keyword hit wins, so the more
    // specific domains are listed first.
    //
    // ⚠️ Matching is plain substring, with no word boundary. A keyword that is a
    // substring of an unrelated word fires on that word: 'ward' matches "award",
    // 'dental' matches "accidental", and a bare 'management' matches the Pain
    // Management Center. Every keyword below that would be ambiguous alone is
    // therefore written as a compound phrase. Prefer a keyword that misses to one
    // that fires wrongly — a miss falls back to AI generation, a wrong hit puts a
    // photograph of the laundry behind a post about the ICU.
    //
    // Arabic keywords are normalised the same way as the row text, so write them
    // naturally: the leading definite article, ة/ه and أ/ا are all handled.
    DOMAINS: [
      { key: 'nicu', folder: 'Services/Neonatal Intensive Care Unit',
        keywords: ['nicu', 'neonatal', 'newborn', 'حضانة', 'حديثي الولادة'] },
      { key: 'icu', folder: 'Services/Intensive Care Unit',
        keywords: ['icu', 'intensive care', 'critical care', 'عناية مركزة', 'رعاية حرجة'] },
      // Before 'icu' would be wrong and after it is safe: no keyword here is a
      // substring of one there. It is its own signposted unit at the hospital.
      { key: 'intermediate-care', folder: 'Services/Intermediate Care Unit',
        keywords: ['intermediate care', 'step-down', 'stepdown', 'رعاية متوسطة'] },
      // Ahead of the support domains so 'غسيل الكلى' is never read as laundry.
      { key: 'dialysis', folder: 'Services/Dialysis Unit',
        keywords: ['dialysis', 'haemodialysis', 'hemodialysis', 'غسيل كلوي', 'غسيل الكلى'] },
      { key: 'emergency', folder: 'Services/Emergency Department',
        keywords: ['emergency', 'triage', 'ambulance', 'طوارئ', 'إسعاف'] },
      { key: 'operating-room', folder: 'Services/Operating Room',
        keywords: ['operating', 'surgery', 'surgical', 'theatre', 'عمليات', 'جراحة'] },
      { key: 'sterilization', folder: 'Services/Sterilization',
        keywords: ['sterilization', 'sterilisation', 'disinfection', 'تعقيم', 'تطهير'] },
      // Ahead of 'radiology', which claims the generic word 'imaging'. An
      // ultrasound brief that says "imaging" should still get the ultrasound room.
      { key: 'diagnostics', folder: 'Services/Diagnostics',
        keywords: ['ultrasound', 'sonar', 'echocardiograph', 'موجات صوتية', 'سونار'] },
      { key: 'radiology', folder: 'Services/Radiology Department',
        keywords: ['radiology', 'imaging', 'x-ray', 'mri', 'ct scan', 'أشعة'] },
      { key: 'laboratory', folder: 'Services/Laboratory',
        keywords: ['laboratory', 'lab ', 'specimen', 'blood test', 'معمل', 'تحاليل'] },
      { key: 'physiotherapy', folder: 'Services/Physiotherapy',
        keywords: ['physiotherapy', 'rehabilitation', 'physical therapy', 'علاج طبيعي', 'تأهيل'] },
      // Folder not created yet — resolves to no reference images and falls back
      // to AI generation until it exists. Create Services/Pharmacy to enable.
      { key: 'pharmacy', folder: 'Services/Pharmacy',
        keywords: ['pharmacy', 'pharmacist', 'medication', 'صيدلية', 'دواء'] },
      // Not the bare word 'dental' — it is a substring of "accidental".
      { key: 'dental', folder: 'Services/Dental Center',
        keywords: ['dental clinic', 'dental center', 'dental centre', 'dentist', 'أسنان'] },
      // Ahead of 'outpatient-clinic', which is where 'reception' used to live:
      // "clinic reception" should resolve to the reception, not a consulting room.
      { key: 'reception-waiting', folder: 'Facility/Reception & Waiting',
        keywords: ['reception', 'waiting area', 'waiting room', 'lounge', 'استقبال', 'انتظار'] },
      { key: 'outpatient-clinic', folder: 'Services/Outpatient Clinic',
        keywords: ['outpatient', 'clinic', 'consultation', 'عيادة', 'كشف'] },
      // Not 'ward' on its own — it is a substring of "award".
      { key: 'inpatient-room', folder: 'Services/Inpatient Rooms',
        keywords: ['inpatient', 'patient room', 'hospital room', 'hospital ward',
                   'bedside', 'غرفة المريض', 'جناح المرضى', 'تنويم', 'إقامة المريض'] },
      // Only the compound phrase. A bare 'nurse' would answer a post about a
      // nurse with a photograph of an empty desk.
      { key: 'nursing-station', folder: 'Facility/Nursing Stations',
        keywords: ['nursing station', 'nurses station', 'nurse station', 'محطة التمريض',
                   'مكتب التمريض'] },
      // Back of house. 'غسيل' alone is not used — it is the first word of
      // "غسيل الكلى" and belongs to the dialysis domain above.
      { key: 'support-services', folder: 'Facility/Support Services',
        keywords: ['laundry', 'linen', 'medical gas', 'oxygen supply', 'oxygen plant',
                   'plant room', 'مغسلة', 'غسيل الملابس', 'الغازات الطبية', 'الأكسجين'] },
      // Not a bare 'management' — that is the Pain Management Center.
      { key: 'administration', folder: 'Facility/Administration',
        keywords: ['administration', 'administrative office', 'management office',
                   'meeting room', 'boardroom', 'مجلس الإدارة', 'مكتب الإدارة', 'اجتماع'] },
      // Not a bare 'building' — "building trust" is a phrase this brand uses
      // constantly, and it is not a request for a photograph of the facade.
      { key: 'hospital-exterior', folder: 'Facility/Hospital Exterior',
        keywords: ['exterior', 'facade', 'hospital building', 'hospital entrance',
                   'واجهة', 'مبنى المستشفى', 'مدخل المستشفى'] },
      { key: 'branding', folder: 'Brand Identity',
        keywords: ['brand', 'identity', 'logo', 'هوية'] }
    ]
  },

  // ================================
  // MEDIA MODELS CONFIGURATION
  // Dedicated models for media generation.
  // Do not modify unless explicitly requested.
  // ================================

  MEDIA_MODELS: {
    IMAGE: 'gemini-3.1-flash-image',
    VIDEO: 'veo-3.1-generate-001'
  },

  // ================================
  // MEDIA SPECS CONFIGURATION
  // Production specifications for all asset types.
  // Enforced by ServiceRunner, not by providers.
  // ================================

  MEDIA_SPECS: {
    STATIC_IMAGE: {
      aspectRatio: '1:1',
      width: 1080,
      height: 1080,
      format: 'png',
      assetCount: 1
    },
    CAROUSEL: {
      aspectRatio: '1:1',
      width: 1080,
      height: 1080,
      format: 'png',
      assetCount: 3,
      minAssetCount: 2,
      maxAssetCount: 10
    },
    SHORT_VIDEO: {
      aspectRatio: '9:16',
      width: 1080,
      height: 1920,
      format: 'mp4',
      fps: 30,
      durationSeconds: 15,
      codec: 'h264',
      assetCount: 1
    },
    STORY: {
      aspectRatio: '9:16',
      width: 1080,
      height: 1920,
      format: 'png',
      assetCount: 1
    },
    REEL: {
      aspectRatio: '9:16',
      width: 1080,
      height: 1920,
      format: 'png',
      assetCount: 1
    }
  },

  // ================================
  // ASSET INTEGRITY
  // Deterministic gate in front of Visual QA. See AssetIntegrity.gs — a vision
  // model scored a set of half-cropped, wrong-aspect assets "A / Approved"
  // with an accurate description of what was in them.
  // ================================

  ASSET_INTEGRITY: {
    ENABLED: true,

    // Aspect drift allowed against the format's MEDIA_SPECS. Assets arrive at
    // more than one size legitimately — the image model returns its own, the
    // text overlay re-exports at the rasteriser's — so the shape is checked,
    // not the dimensions. 3% passes a 1024x1792 nine-sixteenths; it fails a
    // square delivered as 16:9 by a wide margin.
    ASPECT_TOLERANCE: 0.03,

    // Long edge below this is soft on a phone once the placement upscales it.
    MIN_LONG_EDGE: 1000,

    // A blank or failed render compresses to almost nothing. A floor, not a
    // quality measure.
    MIN_BYTES: 15000
  },

  // ================================
  // TEXT OVERLAY
  // Approved Arabic wording is set as real type after generation rather than
  // asked of the image model, which cannot shape or order Arabic reliably.
  // See TextOverlay.gs for the defects this replaced.
  //
  // ENABLED: false returns the pipeline to asking the image model for text.
  // Keep it true unless diagnosing the overlay itself.
  // ================================

  TEXT_OVERLAY: {
    ENABLED: true,

    // Blank presentations whose page size matches the asset. A presentation's
    // page size cannot be set through the API — only inherited by copying — so
    // these are created once by hand. setUpOverlayTemplates() prints the steps.
    //
    // Only the sizes actually produced are needed: 1:1 for Static and Carousel,
    // 9:16 for Story and Reel.
    TEMPLATES: {
      '1:1': '18f-q4jDsW8uCt7km5JtgyEGh0Sek-uekskHahWMjHMk',
      '9:16': '1HyrDEfQdgdFAxvpYb5tAzw6W-23_Cg8GKJKho0Sxg8w'
    },

    POSITION: 'bottom',        // 'bottom' | 'top'
    FONT_FAMILY: 'Cairo',      // must exist in Google Slides
    TEXT_COLOR: '#ffffff',
    BOLD: true,
    MAX_FONT_PT: 44,
    MIN_FONT_PT: 20,
    MARGIN_PCT: 0.07,

    // Share of the frame the type may occupy. The scrim hugs this, so it is
    // also roughly how much of the artwork gets covered — keep it small enough
    // that the image is still the thing being looked at.
    //
    // Reduced from 0.22 on 2026-07-31. Every post here is intended for paid
    // promotion, and Meta's guidance is that images carrying more than 20% text
    // are delivered worse. This band plus BRANDING.CONTACT_BAND must stay under
    // BRANDING.MAX_TEXT_BAND_PCT, which TextOverlay checks before drawing.
    // 0.22 alone was already over the line the operator set.
    BAND_HEIGHT_PCT: 0.13,

    SCRIM_COLOR: '#0d1b2a',
    SCRIM_ALPHA: 0.55,         // 0 disables the scrim entirely

    // Headlines longer than this are logged as a copy problem. Nothing is
    // truncated — a silently shortened headline is worse than a long one.
    LONG_HEADLINE_CHARS: 90
  },

  CACHE_DURATION: 21600,
  LOG_SHEET_NAME: 'Execution Log',
  HEADER_ROW: 1,
  DATA_START_ROW: 2,
  BATCH_TIMEOUT_SECONDS: 300,

  // ================================
  // RETRY POLICY (TD-001)
  // A transient rate limit must not cost a whole row. Delays are deliberately
  // modest: Apps Script kills an execution at ~6 minutes, and a carousel makes
  // one API call per asset, so a long backoff would consume the budget it is
  // meant to protect.
  // Worst case added per call: 2s + 5s = 7s.
  // ================================

  RETRY: {
    MAX_ATTEMPTS: 3,
    DELAYS_MS: [2000, 5000],
    RETRYABLE_HTTP: [408, 429, 500, 502, 503, 504]
  },

  // ================================
  // EXECUTION BUDGET
  // Apps Script terminates a script at ~6 minutes with no chance to save state.
  // The budget is shared by every worker in one invocation: a three-worker
  // pipeline does not get three separate allowances. Work stops early, writes a
  // checkpoint, and tells the operator which row to resume from.
  // ================================

  EXECUTION: {
    HARD_LIMIT_MS: 360000,   // Apps Script ceiling
    SAFETY_MARGIN_MS: 45000, // reserved for checkpointing and the summary dialog
    DEFAULT_ROW_ESTIMATE_MS: 30000,
    INTER_ROW_PAUSE_MS: 400
  },

  // Formats the pipeline can actually produce today. Anything outside this list
  // reaches Media Generation and fails, after strategy and creative work have
  // already been paid for.
  IMPLEMENTED_FORMATS: CONFIG_IMPLEMENTED_FORMATS,

  // ================================
  // STAGE ORDER
  // Re-running a stage invalidates everything produced after it: the later
  // stages were derived from inputs that no longer exist. Without this, a
  // re-planned row keeps the previous run's generated images and its "Approved"
  // QA verdict — an approved-looking row whose assets came from a brief that
  // has since been replaced.
  //
  // Used by SheetWriter.clearDownstreamOutput().
  // ================================

  STAGE_ORDER: {
    CONTENT: [
      'CONTENT_STRATEGY_WORKER',
      'CONTENT_CREATION_WORKER',
      'CREATIVE_DIRECTOR_WORKER'
    ],
    VISUAL: [
      'VISUAL_PLANNER_WORKER',
      'MEDIA_GENERATION',
      'VISUAL_QA_WORKER'
    ]
  },

  COLUMN_NAMES: {
    AI_WORKER: 'AI Worker',
    PUBLISHING_DATE: 'Publishing Date',
    VISUAL_STAGE: 'VISUAL_STAGE',
    CONTENT_ID: 'Content ID',
    REVISION_NUMBER: 'Revision Number',

    // Was 'Workflow Status'. The code's state machine and the operator's
    // editorial workflow were sharing one column; see CONTROLLED_VOCABULARY.
    // Created automatically by ensureManagedColumns() if absent.
    PIPELINE_STATE: 'Pipeline State',

    NOTES: 'Notes'
  },

  // Sheets whose dropdowns are generated from CONTROLLED_VOCABULARY.
  CAMPAIGN_CARDS_SHEET_NAME: 'Campaign Cards',

  // ================================
  // PORTFOLIO CRITIC
  // Reads the whole plan once, before production spends anything on it.
  // Everything a number can settle is settled in code; the model is asked only
  // what the numbers mean. One call per plan against 132 rows of production.
  // ================================

  PORTFOLIO_CRITIC: {
    temperature: 0.3,
    provider: null,   // null inherits AI_PROVIDER
    model: null
  },

  // ================================
  // DETERMINISTIC VISUAL PLAN (opt-in)
  // Replaces the Visual Planner's model call with computation. Saves 6,584
  // input tokens a row and removes a worker from the maintenance surface.
  //
  // OFF by default, deliberately. The visual pipeline has never completed a
  // production run (Audit A, finding F19). Verify it on the path that has been
  // running, then turn this on and verify the change separately — otherwise a
  // first run is testing two unknowns at once and neither result means
  // anything.
  // ================================

  VISUAL_PLAN: {
    ENABLED: false
  },

  // ================================
  // W2 — CAMPAIGN PLANNER
  // Turns an operator brief into Content Calendar rows. Its most important
  // behaviour is refusal: a campaign with no usable card cannot be scheduled,
  // and saying so before the plan exists is the only moment that gap is cheap.
  // ================================

  CAMPAIGN_PLANNER: {
    promptFile: 'CAMPAIGN_PLANNER.md',
    CALENDAR_SHEET_NAME: 'Content Calendar',
    temperature: 0.4,
    provider: null,
    model: null,

    // PROJECT_DECISIONS.md §4: maximum 3 posts a day across all pages,
    // averaging 1.5–2. Consistency over volume.
    MAX_POSTS_PER_DAY: 3
  },

  // ================================
  // W1 — CAMPAIGN CARD BUILDER
  // Turns one knowledge file into one Campaign Cards row. Runs once per
  // campaign, on demand — not per post. The knowledge file is ~16,000 tokens;
  // reading it once per campaign costs ~640K tokens across the plan, reading it
  // once per post would cost ~2.1M. That difference is why the card exists.
  //
  // Two folder IDs are read from Script Properties rather than hardcoded here:
  // KNOWLEDGE_FOLDER_ID (required) and PLANNING_PROMPTS_FOLDER_ID (optional,
  // falls back to PROMPTS_FOLDER_ID). Eleven hardcoded Google IDs already block
  // a second tenant; this does not add a twelfth. (Audit A, finding F17.)
  // ================================

  CARD_BUILDER: {
    promptFile: 'CAMPAIGN_CARD_BUILDER.md',
    temperature: 0.3,
    provider: null,   // null inherits AI_PROVIDER
    model: null,

    // A section still carrying this marker has not been written by anyone who
    // knows the answer. Building a card from it would launder a gap into a
    // finished-looking strategy — which is the failure this worker exists to
    // stop. The scan is deterministic and runs before the model is called.
    GAP_MARKER: 'NEEDS-OPERATOR',

    // Checked in code against the file's headings before any inference. These
    // are Template.md's [REQUIRED] sections: the ones a campaign card cannot be
    // derived from without inventing.
    //
    // Matched on substrings rather than exact titles, because real files name
    // these sections around the entity. The reference implementation calls them
    // "Service Definition", "Service Differentiators" and "What The ICU Should
    // Never Promise"; an Emergency file would say "the Emergency Department" in
    // the same place. Exact-title matching would have rejected the very file
    // KNOWLEDGE_BASE_SPEC §6 holds up as the standard.
    REQUIRED_SECTIONS: [
      { name: 'Definition',                   match: ['definition'] },
      { name: 'Why This Service Exists',      match: ['why this service exists', 'why this exists', 'why it exists'] },
      { name: 'Positioning',                  match: ['positioning'] },
      { name: 'Core Promise',                 match: ['core promise'] },
      { name: 'Human Problem',                match: ['human problem'] },
      { name: 'Human Insight',                match: ['human insight'] },
      { name: 'Invisible Product',            match: ['invisible product'] },
      { name: 'Psychological Transformation', match: ['psychological transformation'] },
      { name: 'Audience',                     match: ['audience'] },
      { name: 'Core Features',                match: ['core features'] },
      { name: 'Differentiators',              match: ['differentiator'] },
      { name: 'What We Are Really Selling',   match: ['really selling'] },
      { name: 'Psychological Barriers',       match: ['psychological barrier'] },
      { name: 'Narrative Themes',             match: ['narrative theme'] },
      { name: 'Content Pillars',              match: ['content pillar'] },
      { name: 'Never Promise',                match: ['never promise'] },
      { name: 'Relationship With INSAN',      match: ['relationship with insan', 'relationship with the insan'] }
    ],

    // Campaign decisions belong to the operator, not to the knowledge file —
    // priority and post count are planning choices, not facts about the entity.
    // A rebuild refreshes everything derived and leaves these alone when they
    // already hold a value, reporting what it kept.
    //
    // `Duration` used to be here. Nothing ever read it: the model was asked to
    // produce it, the code wrote it, and no worker or menu action consumed it —
    // measured across all 25 source files. The planning brief already states
    // how long a cycle runs, and it says so about the cycle in front of you
    // rather than as a value written on a card months earlier.
    //
    // `Status` is the one here that carries weight: PlannerRunner excludes any
    // card that is not Active. `Priority` and `Target Posts` are passed to the
    // model as context and are not enforced by anything.
    OPERATOR_OWNED: [
      'Priority', 'Target Posts', 'Status'
    ],

    // Field order here does not bind the sheet. Transfer.gs carries the twelve
    // strategy fields into the Content Pipeline BY NAME; the array formula that
    // addressed Campaign Cards O:Z positionally is what it replaced.
    OUTPUT_FIELDS: {
      'Umbrella Campaign': 'free',
      'Master Brand': 'free',
      'Sub-Brand': 'free',
      'Medical Center': 'free',
      'Service Level': 'controlled',
      'Business Goal': 'free',
      'Marketing Goal': 'free',
      'Priority': 'free',
      'Target Posts': 'free',
      'Status': 'free',
      'Execution Guidance': 'free',
      'Desired Audience Perception': 'free',
      'Campaign Philosophy': 'free',
      'Trust Platform': 'free',
      'Core Message': 'free',
      'Trust Promise': 'free',
      'Emotional Trigger': 'free',
      'Psychological Barrier': 'free',
      'Content Pillars': 'free',
      'Approved Content Angles': 'free',
      'Non-Negotiable Rules': 'free',
      'CTA Strategy': 'controlled',
      'Primary KPI': 'free',
      'Target Audience': 'free',
      'Core Positioning': 'free',
      'Human Insight': 'free',
      'Invisible Product': 'free',
      'Psychological Transformation': 'free',
      'Trust Platform Type': 'controlled',
      'Narrative Arc': 'free'
    }
  },

  // Columns code writes that must exist for a write to land. writeCell skips a
  // missing column and only logs it, so a rename or a fresh copy of the sheet
  // loses the write silently. Checked and created by ensureManagedColumns().
  // Appended at the end of the sheet, never inserted — simplest possible rule
  // for a function that only needs to find a free slot. Every column is
  // resolved by header text at read time (SheetSchema._getColumnMap), so this
  // is a convenience, not a requirement: nothing downstream depends on position.
  MANAGED_COLUMNS: [
    { sheet: 'Content Pipeline', column: 'Pipeline State' },
    { sheet: 'Content Pipeline', column: 'Alternative Opening' },
    { sheet: 'Campaign Cards', column: 'Service Level' },
    // Stamped once per planning run. The calendar accumulates cycle after
    // cycle, and dates cannot separate two plans that overlap or a cycle that
    // was replanned. See Batches.gs.
    { sheet: 'Content Calendar', column: 'Batch ID' },

    // Provenance. CardBuilder writes both on every build and neither column
    // existed, so writeCell skipped them silently and every card looked
    // hand-written — SYSTEM_ARCHITECTURE §3.3 calls an empty Knowledge Source
    // a defect, and on the first real run all of them were empty. Found by
    // reading the workbook after the first production card, 2026-08-05.
    { sheet: 'Campaign Cards', column: 'Knowledge Source' },
    { sheet: 'Campaign Cards', column: 'Card Built At' },

    // The cycle's intent, stamped on every row of a planning batch. The
    // operator states an objective when planning — "this month is engagement,
    // not awareness" — and until now the planner used it to choose slots and
    // then discarded it: it reached no column, so the Content Strategy Worker
    // never learned what the cycle was for and invented a Content Objective
    // per row from the card alone.
    { sheet: 'Content Calendar', column: 'Cycle Objective' },
    { sheet: 'Content Pipeline', column: 'Cycle Objective' }
  ],

  // ================================
  // REQUIRED INPUTS PER WORKER
  // A worker given empty inputs does not fail — it invents, and the invention
  // reads as confident work. 67% of pipeline rows reached the Content Strategy
  // Worker with all twelve strategy fields blank and it produced a strategy for
  // every one of them. (Audit A, findings F1 and F2.)
  //
  // Checked in code before the model call: an incomplete row costs milliseconds
  // and names the missing fields, instead of costing a full inference and
  // returning something plausible.
  //
  // These lists are deliberately the minimum without which the worker's own
  // decision would be invention rather than derivation — not every field it
  // reads. Widen or narrow them here; nothing else needs to change.
  // ================================

  REQUIRED_INPUTS: {
    CONTENT_STRATEGY_WORKER: [
      'Campaign Name', 'Campaign Philosophy', 'Core Message',
      'Target Audience', 'Content Pillars', 'Trust Promise'
    ],
    CONTENT_CREATION_WORKER: [
      'Content Objective', 'Content Angle', 'Content Type',
      'Content Format', 'Hook', 'Post Structure', 'Language Style'
    ],
    CREATIVE_DIRECTOR_WORKER: [
      'Post Copy (AI)', 'Design Prompt (AI)'
    ],
    VISUAL_PLANNER_WORKER: [
      'Creative Director Design Prompt', 'Visual Concept',
      'Visual Focus', 'Design Mood', 'Composition'
    ]
  },

  // ================================
  // VISUAL PIPELINE CONFIGURATION
  // ================================

  VISUAL_PIPELINE: {
    SHEET_NAME: 'Visual Pipeline',
    SECTION_A_COLUMNS: [
      'Content ID', 'Calendar ID', 'Campaign Name', 'Hospital Brand',
      'Content Type', 'Content Format', 'Post Copy (AI)',
      'Creative Director Design Prompt', 'Visual Concept',
      'Visual Focus', 'Visual Priority', 'Design Mood',
      'Composition', 'Visual Elements', 'Do NOT Show',
      'Text On Design', 'Design Notes'
    ],
    SECTION_B_COLUMNS: [
      'VISUAL_STAGE', 'Asset Count', 'Production Mode', 'Reference Asset Package',
      'Generated Assets', 'Generation Status', 'Generation Timestamp',
      'Visual QA Score', 'Visual QA Decision', 'Visual QA Notes', 'Final Asset URL',
      'Publishing Status', 'Publishing Timestamp', 'Live Post URL',
      'AI Worker'
    ],
    STAGE_VALUES: {
      READY: 'READY',
      PLANNING: 'PLANNING',
      GENERATING: 'GENERATING',
      QA: 'QA',
      PUBLISHING: 'PUBLISHING',
      COMPLETED: 'COMPLETED',
      FAILED: 'FAILED'
    },

    // Hard ceiling on the QA -> PLANNING -> GENERATING -> QA loop.
    // Each cycle re-generates every asset for the row, so an uncapped loop is
    // an uncapped bill. Specified in VISUAL_PIPELINE_FLOW.md, enforced here.
    MAX_REVISION_CYCLES: 3
  },

  WORKERS: {

    CONTENT_STRATEGY_WORKER: {
      promptFile: 'CONTENT_STRATEGY_WORKER.md',
      docs: [
        'MASTER_BRAND_ARCHITECTURE.md',
        'AI_CREATIVE_CONSTITUTION.md',
        'PROJECT_STRUCTURE.md',
        'PROJECT_DECISIONS.md',
        'PLATFORM_KNOWLEDGE_BASE.md',

        // W3 writes nine visual columns — Visual Concept, Visual Elements,
        // Do NOT Show, Design Notes and Text On Design are free text, and they
        // are the ones W5 and the Media Designer inherit. It was writing them
        // against no statement of what this brand's artwork looks like, while
        // the spec that says so (Style Ratio, Strictly Prohibited Styles) was
        // loaded only by workers downstream of the decision.
        'INSAN_VISUAL_LANGUAGE_SPEC.md',
        'SYSTEM_CONSTANTS.md'
      ],
      temperature: 0.7,
      readColumns: [
        'Publishing Date', 'Calendar ID', 'Publishing Page',
        'Campaign Group', 'Campaign Name', 'Hospital Brand',
        'Campaign Philosophy', 'Trust Platform', 'Core Message',
        'Trust Promise', 'Emotional Trigger', 'Psychological Barrier',
        'Content Pillars', 'Approved Content Angles',
        'Non-Negotiable Rules', 'CTA Strategy', 'Primary KPI',
        'Target Audience',
        // What THIS cycle is for, as opposed to what the campaign permanently
        // is. Every other column here comes from the card and is the same for
        // every cycle; this one changes each time the operator plans, and
        // without it the worker was deciding Content Objective from the card
        // alone — the same answer every month, whatever the operator asked for.
        'Cycle Objective'
      ],
      writeColumns: [
        'Content Objective', 'Content Angle', 'Content Type',
        'Content Format', 'Content Funnel Stage', 'Hook',
        'Post Structure', 'Language Style', 'Emoji Style',
        'Visual Concept', 'Visual Focus', 'Visual Priority',
        'Design Mood', 'Composition', 'Visual Elements',
        'Do NOT Show', 'Text On Design', 'Design Notes'
      ],
      outputFields: {
        'Content Objective': 'controlled',
        'Content Angle': 'free',
        'Content Type': 'controlled',
        'Content Format': 'controlled',
        'Content Funnel Stage': 'controlled',
        'Hook': 'free',
        'Post Structure': 'controlled',
        'Language Style': 'controlled',
        'Emoji Style': 'controlled',
        'Visual Concept': 'free',
        'Visual Focus': 'controlled',
        'Visual Priority': 'controlled',
        'Design Mood': 'controlled',
        'Composition': 'controlled',
        'Visual Elements': 'free',
        'Do NOT Show': 'free',
        'Text On Design': 'free',
        'Design Notes': 'free'
      }
    },

    CONTENT_CREATION_WORKER: {
      promptFile: 'CONTENT_CREATION_WORKER.md',
      docs: [
        'MASTER_BRAND_ARCHITECTURE.md',
        'AI_CREATIVE_CONSTITUTION.md',
        'PROJECT_STRUCTURE.md',
        'PROJECT_DECISIONS.md',
        'PLATFORM_KNOWLEDGE_BASE.md',
        'SYSTEM_CONSTANTS.md'
      ],
      temperature: 0.85,
      readColumns: [
        'Publishing Date', 'Calendar ID', 'Publishing Page',
        'Campaign Group', 'Campaign Name', 'Hospital Brand',
        'Campaign Philosophy', 'Trust Platform', 'Core Message',
        'Trust Promise', 'Emotional Trigger', 'Psychological Barrier',
        'Content Pillars', 'Approved Content Angles',
        'Non-Negotiable Rules', 'CTA Strategy', 'Primary KPI',
        'Target Audience',
        'Content Objective', 'Content Angle', 'Content Type',
        'Content Format', 'Content Funnel Stage', 'Hook',
        'Post Structure', 'Language Style', 'Emoji Style',
        'Visual Concept', 'Visual Focus', 'Visual Priority',
        'Design Mood', 'Composition', 'Visual Elements',
        'Do NOT Show', 'Text On Design', 'Design Notes'
      ],
      writeColumns: [
        'Post Copy (AI)', 'Primary Hashtags',
        'Secondary Hashtags', 'Design Prompt (AI)',
        'Alternative Opening'
      ],
      outputFields: {
        'Post Copy (AI)': 'free',
        'Primary Hashtags': 'free',
        'Secondary Hashtags': 'free',
        'Design Prompt (AI)': 'free',

        // Facebook truncates at roughly 250 characters and the median post here
        // is 1,199, so the first line is the entire product for most readers —
        // and 88% of finished posts open with one of five constructions.
        //
        // Output is remarkably cheap against input on this worker: 715 output
        // tokens against 18,885 in. A second opening costs about 3% more and
        // doubles the choice at the exact point where the portfolio converges.
        // Requested through the schema rather than by editing a 2,196-line
        // prompt that was tuned over a full sprint.
        'Alternative Opening': 'free'
      },

      // Per-field guidance, injected into the generated output schema. Used
      // where a field needs more direction than "free text" and less than a
      // prompt edit.
      outputHints: {
        'Alternative Opening': 'a genuinely different first line for this same ' +
          'post — different construction, not a reworded version of the one ' +
          'above. If the main opening is temporal ("لما .."), a question or a ' +
          'quotation, this one must not be. One line only, no hashtags'
      }
    },

    CREATIVE_DIRECTOR_WORKER: {
      promptFile: 'CREATIVE_DIRECTOR_WORKER.md',
      docs: [
        'MASTER_BRAND_ARCHITECTURE.md',
        'AI_CREATIVE_CONSTITUTION.md',
        'PROJECT_STRUCTURE.md',
        'PROJECT_DECISIONS.md',
        'PLATFORM_KNOWLEDGE_BASE.md',
        'INSAN_VISUAL_LANGUAGE_SPEC.md',
        'SYSTEM_CONSTANTS.md'
      ],
      temperature: 0.5,

      // The one worker on the alternate provider. Chosen because it is both the
      // most expensive call in the system (~20,130 input tokens) and the owner
      // of the copy that actually gets published — so it is where a second
      // opinion is worth paying for, and where a Gemini outage hurts most.
      //
      // REQUIRES ANTHROPIC_API_KEY in Script Properties. Without the key this
      // worker fails on every row with a named error — it does not fall back to
      // Gemini. Set the key before pasting this file into the Apps Script editor.
      provider: 'claude',

      readColumns: [
        'Content ID', 'Publishing Date', 'Calendar ID', 'Publishing Page',
        'Campaign Group', 'Campaign Name', 'Hospital Brand',
        'Campaign Philosophy', 'Trust Platform', 'Core Message',
        'Trust Promise', 'Emotional Trigger', 'Psychological Barrier',
        'Content Pillars', 'Approved Content Angles',
        'Non-Negotiable Rules', 'CTA Strategy', 'Primary KPI',
        'Target Audience',
        'Content Objective', 'Content Angle', 'Content Type',
        'Content Format', 'Content Funnel Stage', 'Hook',
        'Post Structure', 'Language Style', 'Emoji Style',
        'Visual Concept', 'Visual Focus', 'Visual Priority',
        'Design Mood', 'Composition', 'Visual Elements',
        'Do NOT Show', 'Text On Design', 'Design Notes',
        'Post Copy (AI)', 'Primary Hashtags',
        'Secondary Hashtags', 'Design Prompt (AI)',

        // The second opening W4 produced. The Creative Director owns the final
        // copy, so it is the worker best placed to judge whether the
        // alternative is the stronger one — and it is the only reader that sees
        // both alongside the recent openings in creative memory.
        'Alternative Opening'
      ],
      writeColumns: [
        'Content Objective', 'Content Angle', 'Content Type',
        'Content Format', 'Content Funnel Stage', 'Hook',
        'Post Structure', 'Language Style', 'Emoji Style',
        'Visual Concept', 'Visual Focus', 'Visual Priority',
        'Design Mood', 'Composition', 'Visual Elements',
        'Do NOT Show', 'Text On Design', 'Design Notes',
        'Creative Director Quality Score',
        'Creative Director Review Status', 'Creative Director Notes',
        'Creative Director Post Copy', 'Creative Director Design Prompt'
      ],
      outputFields: {
        'Content Objective': 'controlled',
        'Content Angle': 'free',
        'Content Type': 'controlled',
        'Content Format': 'controlled',
        'Content Funnel Stage': 'controlled',
        'Hook': 'free',
        'Post Structure': 'controlled',
        'Language Style': 'controlled',
        'Emoji Style': 'controlled',
        'Visual Concept': 'free',
        'Visual Focus': 'controlled',
        'Visual Priority': 'controlled',
        'Design Mood': 'controlled',
        'Composition': 'controlled',
        'Visual Elements': 'free',
        'Do NOT Show': 'free',
        'Text On Design': 'free',
        'Design Notes': 'free',
        'Creative Director Quality Score': 'controlled',
        'Creative Director Review Status': 'controlled',
        'Creative Director Notes': 'free',
        'Creative Director Post Copy': 'free',
        'Creative Director Design Prompt': 'free'
      }
    },

    // ================================
    // VISUAL TEAM WORKERS
    // ================================

    VISUAL_PLANNER_WORKER: {
      sheetName: 'Visual Pipeline',
      promptFile: 'VISUAL_PLANNER_WORKER.md',
      docs: [
        'MASTER_BRAND_ARCHITECTURE.md',
        'AI_CREATIVE_CONSTITUTION.md',
        'SYSTEM_CONSTANTS.md'
      ],
      temperature: 0.3,
      readColumns: [
        'Content ID', 'Content Format', 'Hospital Brand',
        'Creative Director Design Prompt', 'Visual Concept',
        'Visual Focus', 'Visual Priority', 'Design Mood',
        'Composition', 'Visual Elements', 'Do NOT Show',
        'Text On Design', 'Design Notes',
        'Visual QA Decision', 'Visual QA Notes'
      ],
      writeColumns: [
        'Asset Count', 'Production Mode', 'Reference Asset Package'
      ],
      outputFields: {
        'Asset Count': 'controlled',
        'Production Mode': 'controlled',
        'Reference Asset Package': 'free'
      },
      stageTransitions: {
        'GENERATING': 'GENERATING'
      }
    },

    VISUAL_QA_WORKER: {
      sheetName: 'Visual Pipeline',
      promptFile: 'VISUAL_QA_WORKER.md',
      docs: [
        'MASTER_BRAND_ARCHITECTURE.md',
        'AI_CREATIVE_CONSTITUTION.md',

        // This is the worker that scores artwork and decides Approved /
        // Revision Required / Rejected. The spec holds the criteria it is
        // judging against — Style Ratio, Strictly Prohibited Styles, Quality
        // Criteria. The Creative Director loaded it and the Media Designer
        // loaded it; the only worker that passes or fails the result did not.
        // A gate that has not read the standard approves what it should stop.
        'INSAN_VISUAL_LANGUAGE_SPEC.md',
        'SYSTEM_CONSTANTS.md'
      ],
      temperature: 0.3,
      readColumns: [
        'Content ID', 'Content Format', 'Hospital Brand',
        'Creative Director Design Prompt', 'Visual Concept',
        'Visual Focus', 'Visual Priority', 'Design Mood',
        'Composition', 'Visual Elements', 'Do NOT Show',
        'Text On Design', 'Design Notes', 'Generated Assets',
        'Production Mode', 'Reference Asset Package'
      ],
      writeColumns: [
        'Visual QA Score', 'Visual QA Decision', 'Visual QA Notes',
        'Final Asset URL'
      ],
      outputFields: {
        'Visual QA Score': 'controlled',
        'Visual QA Decision': 'controlled',
        'Visual QA Notes': 'free',
        'Final Asset URL': 'generated'
      },
      stageMapping: {
        'Approved': 'PUBLISHING',
        'Revision Required': 'PLANNING',
        'Rejected': 'FAILED'
      }
    }

  },

  // ================================
  // MEDIA GENERATION SERVICE CONFIG
  // ================================

  SERVICES: {
    MEDIA_GENERATION: {
      sheetName: 'Visual Pipeline',
      type: 'generation',

      // The training manual. Loading this is what turns MEDIA_GENERATION from
      // string concatenation into a worker that reads, judges and composes.
      promptFile: 'MEDIA_GENERATION_SERVICE.md',

      designer: {
        // false returns generation to the code-built prompt in
        // ServiceRunner._buildGenerationPrompt(). Kept as a way back if the
        // designer misbehaves mid-campaign, not as a normal setting.
        ENABLED: true,

        // Execution work, not strategy: high enough to reach past the brief's
        // first suggestion, low enough to stay inside it.
        temperature: 0.8,

        // Omit to use CONFIG.AI_PROVIDER.
        provider: null,

        // The manual is comprehensive on its own and already costs ~8k tokens.
        // Every doc added here is paid on every row and comes out of the same
        // six-minute execution budget. Add on evidence that the designer needs
        // it, not in case it might.
        //
        // MASTER_BRAND_ARCHITECTURE is here on that evidence. `Hospital Brand`
        // reaches this service as a bare string — "Future" — and the designer
        // composes an image around a corner reserved for that hospital's brand
        // marks, with nothing telling it what Future is, that it operates under
        // INSAN, or what the two look like beside each other. It was rendering
        // a hospital it had never been introduced to.
        docs: [
          'MASTER_BRAND_ARCHITECTURE.md',
          'INSAN_VISUAL_LANGUAGE_SPEC.md'
        ]
      },

      readColumns: [
        'Content ID', 'Content Format', 'Hospital Brand',
        'Creative Director Design Prompt', 'Visual Concept',
        'Visual Focus', 'Visual Priority', 'Design Mood', 'Composition',
        'Visual Elements', 'Do NOT Show', 'Design Notes',
        'Text On Design', 'Asset Count',
        'Production Mode', 'Reference Asset Package'
      ],
      writeColumns: [
        'Generated Assets', 'Generation Status',
        'Generation Timestamp'
      ],
      stageAfterGeneration: 'QA'
    }
  },

  // ================================
  // EGYPTIAN EVENTS CALENDAR  (improvement I5)
  //
  // Nothing in this system knew a season was coming. Audit B recorded it as
  // B10: no way to plan around Ramadan, Eid or awareness days — which are the
  // highest-attention windows of the year in this market, and the only content
  // that genuinely cannot be produced retrospectively.
  //
  // The planner reads this so a cycle that overlaps a period is told so before
  // it is planned, not after it is published.
  //
  // ⚠️ MOVEABLE dates are entered by hand, per year, and are never computed.
  // Ramadan and Eid follow the Hijri calendar and are confirmed locally by
  // announcement; a tabular approximation is routinely a day out. A wrong
  // Ramadan date would misplan a month of content about medication timing, so
  // this system refuses to guess — it says the date is missing instead.
  // ================================

  EVENTS_CALENDAR: {
    ENABLED: true,

    // Gregorian, recurring every year. Safe to compute.
    FIXED: [
      { key: 'world-cancer-day',      name: 'World Cancer Day',            month: 2,  day: 4,  leadDays: 14, weight: 'medium' },
      { key: 'mothers-day-eg',        name: "Mother's Day (Egypt)",        month: 3,  day: 21, leadDays: 10, weight: 'high' },
      { key: 'world-health-day',      name: 'World Health Day',            month: 4,  day: 7,  leadDays: 14, weight: 'medium' },
      { key: 'world-hypertension-day',name: 'World Hypertension Day',      month: 5,  day: 17, leadDays: 14, weight: 'high' },
      { key: 'world-no-tobacco-day',  name: 'World No Tobacco Day',        month: 5,  day: 31, leadDays: 14, weight: 'medium' },
      { key: 'world-blood-donor-day', name: 'World Blood Donor Day',       month: 6,  day: 14, leadDays: 10, weight: 'medium' },
      { key: 'summer-heat',           name: 'Peak summer heat',            month: 7,  day: 1,  leadDays: 21, weight: 'high',
        endMonth: 8, endDay: 31 },
      { key: 'school-return',         name: 'School return',               month: 9,  day: 15, leadDays: 14, weight: 'medium' },
      { key: 'world-heart-day',       name: 'World Heart Day',             month: 9,  day: 29, leadDays: 14, weight: 'high' },
      { key: 'breast-cancer-month',   name: 'Breast Cancer Awareness Month', month: 10, day: 1, leadDays: 21, weight: 'high',
        endMonth: 10, endDay: 31 },
      { key: 'first-cold-week',       name: 'First cold week',             month: 11, day: 15, leadDays: 14, weight: 'medium' },
      { key: 'world-diabetes-day',    name: 'World Diabetes Day',          month: 11, day: 14, leadDays: 14, weight: 'high' },
      { key: 'exam-season',           name: 'Exam season',                 month: 12, day: 20, leadDays: 14, weight: 'medium',
        endMonth: 1, endDay: 31 }
    ],

    // Hijri-based and locally announced. **The operator fills these in.**
    // Format: 'YYYY-MM-DD'. An empty string means "not yet known", and the
    // system reports it as missing rather than estimating.
    //
    // Ramadan is the single most valuable content window in the Egyptian year
    // for a healthcare organisation, and the one that most needs lead time —
    // clinical review of medication-timing content has to happen before the
    // month starts, not during it.
    MOVEABLE: [
      { key: 'ramadan',     name: 'Ramadan',            leadDays: 30, weight: 'critical',
        dates: { /* '2027': { start: '', end: '' } */ } },
      { key: 'eid-fitr',    name: 'Eid al-Fitr',        leadDays: 14, weight: 'high',
        dates: {} },
      { key: 'eid-adha',    name: 'Eid al-Adha',        leadDays: 14, weight: 'high',
        dates: {} }
    ],

    // How far past the window's end an event still counts as relevant.
    TRAILING_DAYS: 3
  },

  // ================================
  // W9 — PUBLISHING
  // Takes an approved row live on a Facebook page. There is no model call here
  // and there should not be: every decision was already made and owned
  // upstream — the copy by the Creative Director, the artwork by Visual QA, the
  // page by the planner. Publishing is the one step in the chain with nothing
  // left to judge, and a worker asked to judge nothing invents something.
  //
  // DRY_RUN is true. This worker performs the only irreversible action in the
  // system, on real public pages, and has never run. In dry run it resolves the
  // page, the token, the copy and every asset, reports exactly what it would
  // post, and calls nothing. Turn it off deliberately, on one row.
  // ================================

  PUBLISHING: {
    DRY_RUN: true,

    GRAPH_VERSION: 'v21.0',
    GRAPH_HOST: 'https://graph.facebook.com',

    // Script Properties, one pair per page in CONTROLLED_VOCABULARY
    // 'Publishing Page'. The page name is upper-cased and non-alphanumerics
    // become underscores: "Future" -> FB_PAGE_ID_FUTURE / FB_PAGE_TOKEN_FUTURE.
    //
    // Not in this file, deliberately. A page token posts as the brand; it does
    // not belong in a source file that gets copied between deployments.
    PAGE_ID_PREFIX: 'FB_PAGE_ID_',
    PAGE_TOKEN_PREFIX: 'FB_PAGE_TOKEN_',

    // Written to Publishing Status before the first API call and cleared after
    // the result is recorded. A row still carrying it was interrupted between
    // posting and writing the URL — which is the one state where a re-run could
    // double-post — so it is refused until an operator checks the page.
    IN_FLIGHT_MARKER: 'IN FLIGHT',

    // Facebook truncates a post at roughly 250 characters behind "See more".
    // Not enforced — long-form has a place, and every finished post measured
    // 914–1,593 characters (Audit B, B7) — but a post is never published
    // without the length being stated in the log.
    VISIBLE_CHARS: 250
  },

  // ================================
  // W10 — PAID ADS
  // Drafts an ad specification for a post that is already live. It does not
  // spend money, does not create campaigns, and touches no ad account: it
  // writes a row a human reads, edits and executes.
  //
  // That boundary is the design, not a phase. Automating spend before the rest
  // of the chain has a production track record would put a model in charge of
  // the only irreversible thing more expensive than publishing.
  // ================================

  PAID_ADS: {
    SHEET_NAME: 'Ads Pipeline',
    promptFile: 'PAID_ADS_WORKER.md',
    temperature: 0.4,
    provider: null,   // null inherits AI_PROVIDER
    model: null,

    // W10 does not decorate a decision someone else made. It proposes the
    // objective, the audience, the age range, the interests and the placements
    // — the whole targeting of a paid campaign — from one Visual Pipeline row.
    // That is strategic work of the same kind W3 and W4 do, and it was the only
    // content-producing worker reading a shorter list than they do.
    //
    // PLATFORM_KNOWLEDGE_BASE is the substance of the argument: §3 patient
    // experience advantages and §4 competitive advantages are what a paid ad
    // claims. PROJECT_STRUCTURE says which pages exist and how they relate.
    // SYSTEM_CONSTANTS carries the vocabulary Objective and Gender come from.
    docs: [
      'MASTER_BRAND_ARCHITECTURE.md',
      'AI_CREATIVE_CONSTITUTION.md',
      'PROJECT_STRUCTURE.md',
      'PROJECT_DECISIONS.md',
      'PLATFORM_KNOWLEDGE_BASE.md',
      'SYSTEM_CONSTANTS.md'
    ],

    // Created by ensureAdsPipelineSheet() on first run. Content ID is the join
    // back to the row that produced the post.
    COLUMNS: [
      'Content ID', 'Campaign Name', 'Page', 'Live Post URL',
      'Objective', 'Target Audience', 'Age Range', 'Gender', 'Location',
      'Interests', 'Budget', 'Duration', 'Placements',
      'Ad Status', 'Ad ID', 'Results', 'Drafted At'
    ],

    // The worker proposes everything except money and outcome. Budget is the
    // operator's decision and Ad Status/Ad ID/Results are recorded after a
    // human launches — a model filling them would be reporting a spend that
    // never happened.
    OUTPUT_FIELDS: {
      'Objective': 'controlled',
      'Target Audience': 'free',
      'Age Range': 'free',
      'Gender': 'controlled',
      'Location': 'free',
      'Interests': 'free',
      'Duration': 'free',
      'Placements': 'free'
    },

    OPERATOR_OWNED: ['Budget', 'Ad Status', 'Ad ID', 'Results']
  },

  // ================================
  // VISUAL ASSET FOLDER CONFIG
  // ================================

  // Confirmed against Drive by the operator on 2026-08-02. Three of the five
  // had moved since they were written on 2026-07-25 — approved, rejected and
  // published. Only `generated` had ever been written to, so nothing noticed:
  // a stale id here fails at the moment a file is filed, not before.
  VISUAL_ASSETS: {
    generated: '10wQyR4Xl1heAlfM6D_3DoQnbI1hhgPpK',
    approved: '16DcH4XW5uYsA7zgpn0MWMygHeDCGvgnu',
    rejected: '1jUJ76XU0Y2WlmGM6fntf5No4XnAeL9uK',
    published: '1tebmGSwrKFYkAFtON5_LSSP_e4xrq6Rd',
    archive: '1fLQK_x8hj7fQuADO2DQhjNTjgQczxJnO'
  },

  CONTROLLED_VOCABULARY: {
    'Publishing Page': [
      'INSAN', 'Future', 'Delta'
    ],
    'Content Objective': [
      'Build Trust', 'Educate', 'Showcase Service',
      'Generate Awareness', 'Humanize Brand', 'Social Proof',
      'Drive Engagement', 'Increase Bookings',
      'Promote Program', 'Strengthen Brand'
    ],
    'Content Type': [
      'Educational', 'Promotional', 'Storytelling',
      'Behind The Scenes', 'Doctor Spotlight', 'Patient Story',
      'Medical Service', 'Myth vs Fact', 'FAQ',
      'Health Tips', 'Announcement', 'Community', 'Campaign'
    ],
    // Restricted to what the pipeline can actually produce. Video, Reel and
    // Motion Graphic remain valid business concepts but have no generation path,
    // and selecting one spent strategy, copy and creative direction before
    // failing at the final step. Restore them here when video is implemented.
    'Content Format': CONFIG_IMPLEMENTED_FORMATS,
    'Content Funnel Stage': [
      'Awareness', 'Interest', 'Consideration',
      'Trust', 'Decision', 'Retention', 'Advocacy'
    ],
    'Language Style': [
      'Egyptian Medical Friendly', 'Modern Professional',
      'Educational', 'Formal Arabic'
    ],
    'Emoji Style': [
      'Minimal', 'Balanced', 'Friendly', 'Professional', 'None'
    ],
    'Visual Focus': [
      'Doctor', 'Patient', 'Family', 'Medical Team',
      'Medical Procedure', 'Medical Equipment',
      'Facility', 'Service', 'Emotion'
    ],
    'Visual Priority': [
      'Doctor', 'Patient', 'Equipment', 'Family',
      'Facility', 'Procedure', 'Brand'
    ],
    'Design Mood': [
      'Trust', 'Hope', 'Comfort', 'Professional',
      'Premium', 'Urgent', 'Calm', 'Human',
      'Educational', 'Inspirational'
    ],
    'Composition': [
      'Portrait', 'Landscape', 'Close-up', 'Wide',
      'Split Scene', 'Lifestyle', 'Infographic',
      'Carousel Layout', 'Hero Shot'
    ],
    'Post Structure': [
      'PAS', 'AIDA', 'Problem to Solution',
      'Question to Answer', 'Storytelling',
      'Educational', 'Listicle', 'Before to After'
    ],
    'CTA Strategy': [
      'Book Now', 'Contact Us', 'Call Now', 'Learn More',
      'Send Message', 'Visit Hospital', 'Read More',
      'Save Post', 'Share Post'
    ],
    'Creative Director Quality Score': [
      'A+', 'A', 'B+', 'B', 'C', 'Needs Rewrite'
    ],
    'Creative Director Review Status': [
      'Pending', 'Under Review', 'Approved',
      'Rejected', 'Needs Revision'
    ],
    // Two different concepts used to share the name "Workflow Status": the
    // code's state machine and the operator's editorial workflow. They agreed
    // on exactly one value, so every machine write landed in a human column and
    // was rejected. They are now separate columns. (Audit A, finding F4.)
    //
    // Pipeline State is written only by code. Workflow Status is written only by
    // a human — it is listed here so this file stays the single source for every
    // dropdown in the sheet, not because anything in code writes it.
    'Pipeline State': [
      'NEW', 'READY', 'PROCESSING', 'COMPLETED', 'FAILED'
    ],
    'Workflow Status': [
      'Content Writing', 'Design', 'Review',
      'Publishing', 'Completed', 'On Hold'
    ],

    // Stops a Department being filed as a Center. Defined in
    // MEDICAL_SERVICES_TAXONOMY.md §5; lives on Campaign Cards.
    'Service Level': [
      'DEPARTMENT', 'CENTER', 'CLINIC', 'PROGRAM',
      'CORPORATE', 'HOSPITAL', 'SUPPORTING'
    ],

    // Meta's campaign objectives, in the vocabulary the Ads Manager uses. W10
    // picks from this list; anything outside it is a value a human would have
    // to translate before the campaign could be created.
    'Objective': [
      'Awareness', 'Traffic', 'Engagement', 'Leads', 'App Promotion', 'Sales'
    ],

    'Gender': [
      'All', 'Men', 'Women'
    ],

    // Which of the master brand's standards a campaign sits on. From
    // Template.md, "Relationship With INSAN".
    'Trust Platform Type': [
      'Leadership', 'Transparency', 'Governance',
      'Innovation', 'Safety', 'Continuity', 'Expertise'
    ],
    'VISUAL_STAGE': [
      'READY', 'PLANNING', 'GENERATING', 'QA',
      'PUBLISHING', 'COMPLETED', 'FAILED'
    ],
    'Visual QA Decision': [
      'Approved', 'Revision Required', 'Rejected'
    ],
    'Visual QA Score': [
      'A+', 'A', 'B+', 'B', 'C', 'Needs Revision'
    ],
    'Production Mode': [
      'PROJECT_ASSET', 'AI_GENERATED'
    ]
  }
};

// ---------------------------------------------------------------------------
// END SOURCE FILE: CONFIG.gs
// ---------------------------------------------------------------------------


// ---------------------------------------------------------------------------
// BEGIN SOURCE FILE: ConfigResolver.gs
// ---------------------------------------------------------------------------
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
    'KNOWLEDGE_FOLDER_ID':       'KNOWLEDGE_FOLDER_ID',
    'PLANNING_PROMPTS_FOLDER_ID':'PLANNING_PROMPTS_FOLDER_ID',
    'ADS_PROMPTS_FOLDER_ID':     'ADS_PROMPTS_FOLDER_ID',

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

// ---------------------------------------------------------------------------
// END SOURCE FILE: ConfigResolver.gs
// ---------------------------------------------------------------------------


// ---------------------------------------------------------------------------
// BEGIN SOURCE FILE: Logger.gs
// ---------------------------------------------------------------------------
var Logger = {

  log: function(message) {
    console.log(message);
  },

  _getLogSheet: function() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(CONFIG.LOG_SHEET_NAME);

    if (!sheet) {
      sheet = ss.insertSheet(CONFIG.LOG_SHEET_NAME);
      sheet.appendRow([
        'Timestamp', 'Worker', 'Row', 'Status',
        'Runtime (ms)', 'Input Tokens', 'Output Tokens',
        'Error Message', 'Details'
      ]);
      var headerRange = sheet.getRange(1, 1, 1, 9);
      headerRange.setFontWeight('bold');
      headerRange.setBackground('#1a73e8');
      headerRange.setFontColor('#ffffff');
      sheet.setFrozenRows(1);
      sheet.setColumnWidth(1, 180);
      sheet.setColumnWidth(2, 220);
      sheet.setColumnWidth(3, 70);
      sheet.setColumnWidth(4, 100);
      sheet.setColumnWidth(5, 110);
      sheet.setColumnWidth(6, 110);
      sheet.setColumnWidth(7, 110);
      sheet.setColumnWidth(8, 300);
      sheet.setColumnWidth(9, 400);
    }

    return sheet;
  },

  logExecution: function(data) {
    try {
      var sheet = this._getLogSheet();
      var timestamp = new Date();
      var worker = data.worker || '';
      var row = data.row || '';
      var status = data.status || 'UNKNOWN';
      var runtime = data.runtime || 0;
      var inputTokens = data.inputTokens || '';
      var outputTokens = data.outputTokens || '';
      var error = data.error || '';
      var details = data.details || '';

      sheet.appendRow([
        timestamp, worker, row, status,
        runtime, inputTokens, outputTokens,
        error, details
      ]);

      var lastRow = sheet.getLastRow();
      var statusCell = sheet.getRange(lastRow, 4);

      if (status === 'SUCCESS') {
        statusCell.setBackground('#0d652d');
        statusCell.setFontColor('#ffffff');
      } else if (status === 'PARTIAL') {
        statusCell.setBackground('#e37400');
        statusCell.setFontColor('#ffffff');
      } else {
        statusCell.setBackground('#c5221f');
        statusCell.setFontColor('#ffffff');
      }

    } catch (e) {
      Logger.log('Logger itself failed: ' + e.toString());
    }
  },

  logSuccess: function(worker, row, runtime, inputTokens, outputTokens, details) {
    this.logExecution({
      worker: worker,
      row: row,
      status: 'SUCCESS',
      runtime: runtime,
      inputTokens: inputTokens,
      outputTokens: outputTokens,
      details: details
    });
  },

  logFailure: function(worker, row, runtime, error, details) {
    this.logExecution({
      worker: worker,
      row: row,
      status: 'FAILURE',
      runtime: runtime,
      error: error,
      details: details
    });
  },

  logPartial: function(worker, row, runtime, details) {
    this.logExecution({
      worker: worker,
      row: row,
      status: 'PARTIAL',
      runtime: runtime,
      details: details
    });
  },

  // A worker produced a value the sheet's data validation refused. The value is
  // written anyway; this records it so the controlled vocabulary can be widened
  // later from real production evidence instead of guesswork.
  logValidationBypass: function(row, columnName, value, action) {
    this.logExecution({
      worker: 'DATA_VALIDATION',
      row: row,
      status: 'PARTIAL',
      details: 'Value rejected by sheet validation and written anyway | Column: ' +
        columnName + ' | Value: "' + String(value).substring(0, 200) + '" | ' +
        'Recovery: ' + action
    });
  },

  // A controlled field came back with a value outside CONTROLLED_VOCABULARY.
  // Logged rather than blocked, so the run continues and the vocabulary gap is
  // visible afterwards.
  logVocabularyDeviation: function(worker, row, columnName, value, vocabulary) {
    this.logExecution({
      worker: worker,
      row: row,
      status: 'PARTIAL',
      details: 'Out-of-vocabulary value accepted | Column: ' + columnName +
        ' | Produced: "' + String(value).substring(0, 120) + '"' +
        ' | Allowed: ' + (vocabulary || []).join(' / ')
    });
  },

  // Collects every out-of-vocabulary value seen so far, grouped by column, so a
  // production run can be turned into concrete SYSTEM_CONSTANTS updates.
  getVocabularyDeviations: function() {
    var sheet = this._getLogSheet();
    var lastRow = sheet.getLastRow();

    if (lastRow < 2) {
      return {};
    }

    var rows = sheet.getRange(2, 1, lastRow - 1, 9).getValues();
    var grouped = {};

    for (var i = 0; i < rows.length; i++) {
      var details = String(rows[i][8] || '');

      if (details.indexOf('Out-of-vocabulary value accepted') === -1 &&
          details.indexOf('rejected by sheet validation') === -1) {
        continue;
      }

      var colMatch = details.match(/Column:\s*([^|]+)/);
      var valMatch = details.match(/(?:Produced|Value):\s*"([^"]*)"/);

      if (!colMatch || !valMatch) {
        continue;
      }

      var column = colMatch[1].trim();
      var value = valMatch[1].trim();

      if (!grouped[column]) {
        grouped[column] = {};
      }

      grouped[column][value] = (grouped[column][value] || 0) + 1;
    }

    return grouped;
  },

  getExecutionLog: function(limit) {
    var sheet = this._getLogSheet();
    var lastRow = sheet.getLastRow();

    if (lastRow <= 1) return [];

    var numRows = Math.min(limit || 20, lastRow - 1);
    var startRow = lastRow - numRows + 1;
    var data = sheet.getRange(startRow, 1, numRows, 9).getValues();

    var entries = [];
    for (var i = data.length - 1; i >= 0; i--) {
      entries.push({
        timestamp: data[i][0],
        worker: data[i][1],
        row: data[i][2],
        status: data[i][3],
        runtime: data[i][4],
        inputTokens: data[i][5],
        outputTokens: data[i][6],
        error: data[i][7],
        details: data[i][8]
      });
    }

    return entries;
  },

  clearLog: function() {
    var sheet = this._getLogSheet();
    var lastRow = sheet.getLastRow();

    if (lastRow > 1) {
      sheet.deleteRows(2, lastRow - 1);
    }
  }
};

// ---------------------------------------------------------------------------
// END SOURCE FILE: Logger.gs
// ---------------------------------------------------------------------------


// ---------------------------------------------------------------------------
// BEGIN SOURCE FILE: SheetSchema.gs
// ---------------------------------------------------------------------------
var SheetSchema = {

  _getSheet: function(sheetName) {
    var targetSheet = sheetName || CONFIG.SHEET_NAME;
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(targetSheet);

    if (!sheet) {
      sheet = ss.getSheets()[0];
    }

    return sheet;
  },

  _getVisualSheet: function() {
    return this._getSheet(CONFIG.VISUAL_PIPELINE.SHEET_NAME);
  },

  _getColumnMap: function(sheetName) {
    var targetSheet = sheetName || CONFIG.SHEET_NAME;
    var cacheKey = 'colMap_' + targetSheet;
    var cached = CacheService.getScriptCache().get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    var sheet = this._getSheet(targetSheet);
    var headerRow = sheet.getRange(CONFIG.HEADER_ROW, 1, 1, sheet.getLastColumn()).getValues()[0];

    var map = {};
    for (var i = 0; i < headerRow.length; i++) {
      var name = String(headerRow[i]).trim();
      if (name !== '') {
        map[name] = i + 1;
      }
    }

    CacheService.getScriptCache().put(cacheKey, JSON.stringify(map), CONFIG.CACHE_DURATION);
    return map;
  },

  _getVisualColumnMap: function() {
    return this._getColumnMap(CONFIG.VISUAL_PIPELINE.SHEET_NAME);
  },

  invalidateColumnMap: function(sheetName) {
    var targetSheet = sheetName || CONFIG.SHEET_NAME;
    var cacheKey = 'colMap_' + targetSheet;
    CacheService.getScriptCache().remove(cacheKey);
  },

  getColumnIndex: function(columnName, sheetName) {
    var map = this._getColumnMap(sheetName);
    return map[columnName] || -1;
  },

  getColumnNames: function(sheetName) {
    var map = this._getColumnMap(sheetName);
    var names = [];
    var indices = [];

    for (var name in map) {
      names.push(name);
      indices.push(map[name]);
    }

    var sorted = names.sort(function(a, b) {
      return map[a] - map[b];
    });

    return sorted;
  },

  getRowData: function(rowNumber, sheetName) {
    var sheet = this._getSheet(sheetName);
    var lastCol = sheet.getLastColumn();

    if (lastCol <= 0) return {};

    var values = sheet.getRange(rowNumber, 1, 1, lastCol).getValues()[0];
    var map = this._getColumnMap(sheetName);
    var rowData = {};

    var columnName;
    for (columnName in map) {
      var colIndex = map[columnName];
      rowData[columnName] = values[colIndex - 1] || '';
    }

    return rowData;
  },

  getVisualRowData: function(rowNumber) {
    return this.getRowData(rowNumber, CONFIG.VISUAL_PIPELINE.SHEET_NAME);
  },

  getColumnsByName: function(rowNumber, columnNames, sheetName) {
    var allData = this.getRowData(rowNumber, sheetName);
    var result = {};

    for (var i = 0; i < columnNames.length; i++) {
      var name = columnNames[i];
      if (allData.hasOwnProperty(name)) {
        result[name] = allData[name];
      }
    }

    return result;
  },

  getHeaders: function(sheetName) {
    var sheet = this._getSheet(sheetName);
    var lastCol = sheet.getLastColumn();

    if (lastCol <= 0) return [];

    return sheet.getRange(CONFIG.HEADER_ROW, 1, 1, lastCol).getValues()[0];
  },

  getLastRow: function(sheetName) {
    var sheet = this._getSheet(sheetName);
    return sheet.getLastRow();
  },

  getVisualLastRow: function() {
    return this.getLastRow(CONFIG.VISUAL_PIPELINE.SHEET_NAME);
  },

  validateColumnExists: function(columnName, sheetName) {
    var index = this.getColumnIndex(columnName, sheetName);
    return index !== -1;
  },

  validateColumnsExist: function(columnNames, sheetName) {
    var missing = [];

    for (var i = 0; i < columnNames.length; i++) {
      if (!this.validateColumnExists(columnNames[i], sheetName)) {
        missing.push(columnNames[i]);
      }
    }

    return {
      valid: missing.length === 0,
      missing: missing
    };
  }
};

// ---------------------------------------------------------------------------
// END SOURCE FILE: SheetSchema.gs
// ---------------------------------------------------------------------------


// ---------------------------------------------------------------------------
// BEGIN SOURCE FILE: SheetWriter.gs
// ---------------------------------------------------------------------------
var SheetWriter = {

  _getSheet: function(sheetName) {
    var targetSheet = sheetName || CONFIG.SHEET_NAME;
    return SpreadsheetApp.getActiveSpreadsheet()
      .getSheetByName(targetSheet);
  },

  _getVisualSheet: function() {
    return this._getSheet(CONFIG.VISUAL_PIPELINE.SHEET_NAME);
  },

  // Sheets coerces some written values ("4.0" -> 4, collapsed whitespace,
  // trimmed newlines). Those are successful writes, not failures.
  _valuesMatch: function(expected, actual) {
    if (expected instanceof Date && actual instanceof Date) {
      return expected.getTime() === actual.getTime();
    }

    var e = String(expected).trim();
    var a = String(actual).trim();

    if (e === a) {
      return true;
    }

    var eNum = parseFloat(e);
    var aNum = parseFloat(a);
    if (!isNaN(eNum) && !isNaN(aNum) && eNum === aNum) {
      return true;
    }

    return e.replace(/\s+/g, ' ') === a.replace(/\s+/g, ' ');
  },

  // Keeps the dropdown, but stops it rejecting input. This is preferred over
  // clearDataValidations(), which destroys the dropdown permanently and quietly
  // degrades the sheet one cell at a time.
  _relaxValidation: function(range) {
    try {
      var rule = range.getDataValidation();

      if (!rule) {
        return false;
      }

      range.setDataValidation(rule.copy().setAllowInvalid(true).build());
      return true;

    } catch (e) {
      return false;
    }
  },

  _safeClearValidation: function(range) {
    try {
      range.clearDataValidations();
      return true;
    } catch (e) {
      return false;
    }
  },

  // A worker must never halt because a value is missing from the controlled
  // vocabulary. Deviations are written through and recorded, so the vocabulary
  // can be corrected later from real production evidence.
  _writeCellSafe: function(range, value, rowNumber, colName, colIndex) {
    var attempt = function() {
      range.setValue(value);
      SpreadsheetApp.flush();
    };

    try {
      attempt();

    } catch (e) {
      // Error text is locale-dependent, so never branch on its wording.
      // Any write failure is treated as potentially validation-related.
      var recovered = false;

      if (this._relaxValidation(range)) {
        try {
          attempt();
          recovered = true;
          Logger.logValidationBypass(
            rowNumber, colName, value, 'relaxed to warn-only (dropdown kept)'
          );
        } catch (relaxErr) {
          recovered = false;
        }
      }

      if (!recovered && this._safeClearValidation(range)) {
        try {
          attempt();
          recovered = true;
          Logger.logValidationBypass(
            rowNumber, colName, value, 'validation cleared on this cell'
          );
        } catch (clearErr) {
          recovered = false;
        }
      }

      if (!recovered) {
        Logger.log(
          'WRITE_FAILED | Row: ' + rowNumber + ' | Column: ' + colName +
          ' (col ' + colIndex + ') | ' + e.toString()
        );
        return false;
      }
    }

    var actualRaw = range.getValue();
    var match = this._valuesMatch(value, actualRaw);

    Logger.log(
      'VERIFY_WRITE | Row: ' + rowNumber +
      ' | Column: ' + colName +
      ' | Expected: [' + String(value).substring(0, 100) + ']' +
      ' | Actual: [' + String(actualRaw).substring(0, 100) + ']' +
      ' | Match: ' + match
    );

    if (!match) {
      // Report it, do not throw. A mismatched cell is a data issue to review
      // later; it is not a reason to abort the run.
      Logger.log(
        'WRITE_VERIFICATION_MISMATCH | Row: ' + rowNumber +
        ' | Column: ' + colName +
        ' | Expected: [' + String(value).substring(0, 200) + ']' +
        ' | Actual: [' + String(actualRaw).substring(0, 200) + ']'
      );
      return false;
    }

    Logger.log('WRITE_SUCCESS | Row: ' + rowNumber + ' | Column: ' + colName);
    return true;
  },

  writeToRow: function(rowNumber, columnValues, workerName) {
    var workerConfig = CONFIG.WORKERS[workerName];

    if (!workerConfig) {
      throw new Error('Unknown worker for writing: ' + workerName);
    }

    var sheetName = workerConfig.sheetName || CONFIG.SHEET_NAME;

    Logger.log('WRITER_INCOMING_PAYLOAD | Row: ' + rowNumber + ' | Worker: ' + workerName + ' | Sheet: ' + sheetName + ' | Keys: ' + Object.keys(columnValues).join(', '));

    var allowedColumns = {};
    for (var i = 0; i < workerConfig.writeColumns.length; i++) {
      allowedColumns[workerConfig.writeColumns[i]] = true;
    }

    var sheet = this._getSheet(sheetName);
    var columnMap = SheetSchema._getColumnMap(sheetName);

    var written = [];
    var skipped = [];

    for (var colName in columnValues) {
      if (!allowedColumns[colName]) {
        Logger.log('WRITER_SKIPPED_NOT_ALLOWED | Column: ' + colName);
        skipped.push(colName);
        continue;
      }

      var colIndex = columnMap[colName];

      if (!colIndex) {
        Logger.log('WRITER_SKIPPED_NO_COLUMN | Column: ' + colName + ' | NOT FOUND in header map');
        skipped.push(colName + ' (column not found in sheet)');
        continue;
      }

      var value = columnValues[colName];

      if (value === undefined || value === null) {
        value = '';
      }

      Logger.log(
        'WRITE_ATTEMPT | Row: ' + rowNumber +
        ' | Column: ' + colName +
        ' | ColIndex: ' + colIndex +
        ' | ValueLength: ' + String(value).length +
        ' | Value: ' + String(value).substring(0, 100)
      );

      var range = sheet.getRange(rowNumber, colIndex);
      var writeOk = this._writeCellSafe(range, String(value), rowNumber, colName, colIndex);
      if (writeOk) {
        written.push(colName);
      } else {
        Logger.log('WRITE_FAILED_SILENTLY | Row: ' + rowNumber + ' | Column: ' + colName);
        skipped.push(colName + ' (write failed)');
      }
    }

    Logger.log('WRITER_SUMMARY | Row: ' + rowNumber + ' | Written: ' + written.join(', ') + ' | Skipped: ' + skipped.join(', '));

    return {
      written: written,
      skipped: skipped,
      rowNumber: rowNumber
    };
  },

  writeAIWorkerTag: function(rowNumber, workerName, sheetName) {
    var targetSheet = sheetName || CONFIG.SHEET_NAME;
    var colIndex = SheetSchema.getColumnIndex(CONFIG.COLUMN_NAMES.AI_WORKER, targetSheet);

    if (colIndex === -1) return;

    var sheet = this._getSheet(targetSheet);
    var cell = sheet.getRange(rowNumber, colIndex);
    var current = cell.getValue();
    var tag = workerName.replace('_WORKER', '');

    if (current && String(current).trim() !== '') {
      tag = String(current).trim() + ' + ' + tag;
    }

    this._writeCellSafe(cell, tag, rowNumber, 'AI Worker', colIndex);
  },

  writeTimestamp: function(rowNumber, columnName, sheetName) {
    var targetSheet = sheetName || CONFIG.SHEET_NAME;
    var colIndex = SheetSchema.getColumnIndex(columnName, targetSheet);

    if (colIndex === -1) return;

    var sheet = this._getSheet(targetSheet);
    var cell = sheet.getRange(rowNumber, colIndex);

    if (!cell.getValue()) {
      this._writeCellSafe(cell, new Date(), rowNumber, columnName, colIndex);
    }
  },

  clearWorkerOutput: function(rowNumber, workerName) {
    var workerConfig = CONFIG.WORKERS[workerName];

    if (!workerConfig) return;

    var sheetName = workerConfig.sheetName || CONFIG.SHEET_NAME;
    var sheet = this._getSheet(sheetName);
    var columnMap = SheetSchema._getColumnMap(sheetName);

    for (var i = 0; i < workerConfig.writeColumns.length; i++) {
      var colName = workerConfig.writeColumns[i];
      var colIndex = columnMap[colName];

      if (colIndex) {
        this._writeCellSafe(
          sheet.getRange(rowNumber, colIndex), '',
          rowNumber, colName, colIndex
        );
      }
    }
  },

  // Resolves the columns a stage owns, for both workers and services.
  _stageWriteColumns: function(stageName) {
    if (CONFIG.WORKERS[stageName]) {
      return {
        columns: CONFIG.WORKERS[stageName].writeColumns || [],
        sheet: CONFIG.WORKERS[stageName].sheetName || CONFIG.SHEET_NAME
      };
    }

    if (CONFIG.SERVICES[stageName]) {
      return {
        columns: CONFIG.SERVICES[stageName].writeColumns || [],
        sheet: CONFIG.SERVICES[stageName].sheetName || CONFIG.SHEET_NAME
      };
    }

    return null;
  },

  // Wipes everything produced after `stageName` in the same pipeline.
  //
  // A worker overwrites its own columns on every run — the parser emits every
  // output field, blank when the model omitted one. What it never touched was
  // the output of *later* stages, which is derived from inputs this run just
  // replaced. Re-planning a row therefore left the previous run's generated
  // images and its "Approved" QA verdict sitting beside a brand-new brief:
  // a row that reads as approved and publishable, whose assets came from a
  // brief that no longer exists.
  //
  // Clearing is the honest state. A blank QA verdict says "not yet judged",
  // which is true; a stale one asserts something false about work that has
  // since been redone.
  clearDownstreamOutput: function(rowNumber, stageName) {
    var pipelines = CONFIG.STAGE_ORDER || {};
    var cleared = [];

    for (var key in pipelines) {
      var stages = pipelines[key];
      var position = stages.indexOf(stageName);

      if (position === -1) {
        continue;
      }

      // Some columns have more than one writer by design: the Creative
      // Director refines the same 18 strategy fields the Content Strategy
      // Worker proposes, so those names appear in *both* stages' writeColumns.
      //
      // Appearing in a later stage's writeColumns does not make a column that
      // stage's output. It belongs to the earliest stage that writes it, and
      // that stage has already run. Treating it as downstream deletes work
      // this very execution just produced — which is exactly what happened:
      // the Content Creation Worker wiped every strategy field on each row it
      // touched, because all 18 sit in the Creative Director's writeColumns.
      //
      // So protect every column written at or before this stage, not just the
      // caller's own. What remains is genuinely downstream: derived from
      // inputs this run replaced, and safe to clear.
      var protectedCols = {};
      for (var p = 0; p <= position; p++) {
        var upstream = this._stageWriteColumns(stages[p]);

        if (!upstream) {
          continue;
        }

        for (var u = 0; u < upstream.columns.length; u++) {
          protectedCols[upstream.columns[u]] = true;
        }
      }

      for (var i = position + 1; i < stages.length; i++) {
        var target = this._stageWriteColumns(stages[i]);

        if (!target || !target.columns.length) {
          continue;
        }

        var sheet = this._getSheet(target.sheet);
        var columnMap = SheetSchema._getColumnMap(target.sheet);

        if (!sheet) {
          continue;
        }

        for (var c = 0; c < target.columns.length; c++) {
          var colName = target.columns[c];

          if (protectedCols[colName]) {
            continue;
          }

          var colIndex = columnMap[colName];

          if (!colIndex) {
            continue;
          }

          var cell = sheet.getRange(rowNumber, colIndex);

          // Only touch cells that actually hold something — avoids pointless
          // writes and keeps the log readable.
          if (String(cell.getValue() || '').trim() === '') {
            continue;
          }

          this._writeCellSafe(cell, '', rowNumber, colName, colIndex);
          cleared.push(colName);
        }
      }
    }

    if (cleared.length) {
      Logger.log(
        'STALE_CLEARED | Row: ' + rowNumber + ' | Re-ran: ' + stageName +
        ' | Cleared downstream: ' + cleared.join(', ')
      );
    }

    return cleared;
  },

  batchWrite: function(rowsData, workerName) {
    var results = [];

    for (var i = 0; i < rowsData.length; i++) {
      var result = this.writeToRow(
        rowsData[i].rowNumber,
        rowsData[i].values,
        workerName
      );
      results.push(result);
    }

    return results;
  },

  writeCell: function(rowNumber, columnName, value, sheetName) {
    var resolvedSheet = sheetName || CONFIG.SHEET_NAME;
    var sheet = this._getSheet(resolvedSheet);
    var columnMap = SheetSchema._getColumnMap(resolvedSheet);
    var col = columnMap[columnName];

    if (!col) {
      Logger.log('WRITE_CELL_SKIPPED | Column not found: ' + columnName +
        ' in sheet "' + resolvedSheet + '"');
      return false;
    }

    return this._writeCellSafe(
      sheet.getRange(rowNumber, col), value, rowNumber, columnName, col
    );
  },

  // Writes the machine state. Deliberately not "Workflow Status" — that column
  // is the operator's editorial workflow and shares only one value with this
  // state machine, so every write here used to be rejected by its dropdown.
  // (Audit A, finding F4.)
  writePipelineState: function(rowNumber, state, sheetName) {
    var resolvedSheet = sheetName || CONFIG.SHEET_NAME;
    return this.writeCell(
      rowNumber, CONFIG.COLUMN_NAMES.PIPELINE_STATE, state, resolvedSheet
    );
  },

  // One-time repair: converts every "reject input" dropdown on a sheet into a
  // "show warning" dropdown. The list still appears for human editors and the
  // cell is still flagged when it holds an unexpected value — but a worker can
  // no longer be blocked from writing.
  //
  // This is the root-cause fix. _writeCellSafe is the per-cell safety net for
  // anything added to the sheet afterwards.
  relaxSheetValidation: function(sheetName) {
    var resolvedSheet = sheetName || CONFIG.SHEET_NAME;
    var sheet = this._getSheet(resolvedSheet);

    if (!sheet) {
      return { sheet: resolvedSheet, error: 'Sheet not found' };
    }

    var lastRow = Math.max(sheet.getLastRow(), CONFIG.DATA_START_ROW);
    var lastCol = sheet.getLastColumn();

    if (lastRow < 1 || lastCol < 1) {
      return { sheet: resolvedSheet, relaxed: 0, scanned: 0 };
    }

    var range = sheet.getRange(1, 1, lastRow, lastCol);
    var rules = range.getDataValidations();
    var relaxed = 0;
    var scanned = 0;
    var changed = false;

    for (var r = 0; r < rules.length; r++) {
      for (var c = 0; c < rules[r].length; c++) {
        var rule = rules[r][c];

        if (!rule) {
          continue;
        }

        scanned++;

        if (rule.getAllowInvalid()) {
          continue;
        }

        rules[r][c] = rule.copy().setAllowInvalid(true).build();
        relaxed++;
        changed = true;
      }
    }

    if (changed) {
      range.setDataValidations(rules);
      SpreadsheetApp.flush();
    }

    Logger.log(
      'VALIDATION_RELAXED | Sheet: ' + resolvedSheet +
      ' | Rules scanned: ' + scanned + ' | Converted to warn-only: ' + relaxed
    );

    return { sheet: resolvedSheet, relaxed: relaxed, scanned: scanned };
  },

  relaxAllPipelineValidation: function() {
    return [
      this.relaxSheetValidation(CONFIG.SHEET_NAME),
      this.relaxSheetValidation(CONFIG.VISUAL_PIPELINE.SHEET_NAME)
    ];
  },

  // Rebuilds one sheet's dropdowns from CONFIG.CONTROLLED_VOCABULARY, making
  // this file the single vocabulary source. Four fields disagreed between code
  // and sheet — the worker produced exactly what the code asked for and the
  // dropdown refused it, 19 times. (Audit A, finding F4.)
  //
  // Every rule is written allowInvalid, so a value outside the list is flagged
  // for review rather than blocking a worker mid-run. Columns absent from the
  // sheet are reported, never created — a missing dropdown column is a schema
  // question for a person to answer, not one this function should guess at.
  syncSheetValidation: function(sheetName) {
    var sheet = this._getSheet(sheetName);

    if (!sheet) {
      return { sheet: sheetName, error: 'Sheet not found' };
    }

    var columnMap = SheetSchema._getColumnMap(sheetName);
    var lastRow = Math.max(sheet.getLastRow(), CONFIG.DATA_START_ROW);
    var applied = [];
    var absent = [];

    for (var columnName in CONFIG.CONTROLLED_VOCABULARY) {
      var col = columnMap[columnName];

      if (!col) {
        absent.push(columnName);
        continue;
      }

      var values = CONFIG.CONTROLLED_VOCABULARY[columnName];

      var rule = SpreadsheetApp.newDataValidation()
        .requireValueInList(values, true)
        .setAllowInvalid(true)
        .setHelpText(
          columnName + ' — allowed values come from CONFIG.gs. ' +
          'Anything else is recorded in the Execution Log for review.'
        )
        .build();

      sheet
        .getRange(CONFIG.DATA_START_ROW, col, lastRow - CONFIG.DATA_START_ROW + 1, 1)
        .setDataValidation(rule);

      applied.push(columnName);
    }

    SpreadsheetApp.flush();

    Logger.log(
      'VOCABULARY_SYNCED | Sheet: ' + sheetName +
      ' | Columns written: ' + applied.length +
      ' | Not present on this sheet: ' + absent.length
    );

    return { sheet: sheetName, applied: applied, absent: absent };
  },

  syncAllValidationFromConfig: function() {
    return [
      this.syncSheetValidation(CONFIG.SHEET_NAME),
      this.syncSheetValidation(CONFIG.VISUAL_PIPELINE.SHEET_NAME),
      this.syncSheetValidation(CONFIG.CAMPAIGN_CARDS_SHEET_NAME)
    ];
  },

  // Creates the columns code writes but cannot invent. writeCell skips a
  // missing column with nothing but a log line, so a renamed or freshly copied
  // sheet loses those writes silently — which is exactly how the machine state
  // ended up in the operator's Workflow Status column.
  //
  // Appends only, never inserts — the simplest way to add a column that does
  // not yet exist. Every column is resolved by header text at read time, not
  // by position, so this is a matter of simplicity, not a constraint the rest
  // of the system relies on.
  ensureManagedColumns: function() {
    var results = [];
    var managed = CONFIG.MANAGED_COLUMNS || [];

    for (var i = 0; i < managed.length; i++) {
      var spec = managed[i];
      var sheet = this._getSheet(spec.sheet);

      if (!sheet) {
        results.push({
          sheet: spec.sheet, column: spec.column, status: 'sheet not found'
        });
        continue;
      }

      if (SheetSchema._getColumnMap(spec.sheet)[spec.column]) {
        results.push({
          sheet: spec.sheet, column: spec.column, status: 'already present'
        });
        continue;
      }

      var newCol = sheet.getLastColumn() + 1;
      sheet.getRange(CONFIG.HEADER_ROW, newCol).setValue(spec.column);

      // The column map is cached for six hours. Without this, every write to
      // the new column for the rest of the day resolves against a map that
      // predates it and is skipped.
      SheetSchema.invalidateColumnMap(spec.sheet);

      results.push({
        sheet: spec.sheet,
        column: spec.column,
        status: 'created in column ' + newCol
      });

      Logger.log(
        'MANAGED_COLUMN_CREATED | Sheet: ' + spec.sheet +
        ' | Column: ' + spec.column + ' | Position: ' + newCol
      );
    }

    return results;
  }
};

// ---------------------------------------------------------------------------
// END SOURCE FILE: SheetWriter.gs
// ---------------------------------------------------------------------------


// ---------------------------------------------------------------------------
// BEGIN SOURCE FILE: DriveLoader.gs
// ---------------------------------------------------------------------------
var DriveLoader = {

  _loadFile: function(fileName, folderId) {
    var cacheKey = 'drive_' + folderId + '_' + fileName;
    var cached = CacheService.getScriptCache().get(cacheKey);

    if (cached) {
      return cached;
    }

    try {
      var folder = DriveApp.getFolderById(folderId);
      var files = folder.getFilesByName(fileName);

      if (!files.hasNext()) {
        Logger.log('File not found in Drive: ' + fileName);
        return null;
      }

      var file = files.next();
      var content = file.getBlob().getDataAsString('UTF-8');

      // Caching is an optimisation, and it must not be able to lose a file that
      // was read successfully. CacheService refuses a value over 100KB by
      // throwing; CREATIVE_DIRECTOR_WORKER.md is already 77KB and these files
      // only grow. Inside the outer catch, that throw returned null — and the
      // caller reports null as "prompt file not found, check the folder ID",
      // sending the operator to look for a file that is sitting right there.
      try {
        CacheService.getScriptCache().put(cacheKey, content, CONFIG.CACHE_DURATION);
      } catch (cacheErr) {
        Logger.log(
          'DriveLoader | ' + fileName + ' (' + content.length + ' chars) was ' +
          'read but not cached: ' + cacheErr.toString() +
          ' It will be re-read from Drive on every call.'
        );
      }

      return content;

    } catch (e) {
      Logger.log('DriveLoader error for ' + fileName + ': ' + e.toString());
      return null;
    }
  },

  loadMarkdown: function(fileName, folderId) {
    return this._loadFile(fileName, folderId || CONFIG.DOCS_FOLDER_ID);
  },

  // Services are resolved as well as workers. Media Generation lives under
  // CONFIG.SERVICES, and because this function only ever looked at
  // CONFIG.WORKERS its 1,990-line training manual was never loaded by anything
  // — the file sat in Drive being edited while the image prompt was built by
  // string concatenation in code.
  loadPrompt: function(workerName) {
    var config = CONFIG.WORKERS[workerName] ||
      (CONFIG.SERVICES && CONFIG.SERVICES[workerName]);

    if (!config) {
      Logger.log('Unknown worker or service: ' + workerName);
      return null;
    }

    if (!config.promptFile) {
      Logger.log('No promptFile configured for: ' + workerName);
      return null;
    }

    var isVisual = config.sheetName === CONFIG.VISUAL_PIPELINE.SHEET_NAME;
    var folderId = isVisual
      ? CONFIG.VISUAL_PROMPTS_FOLDER_ID
      : CONFIG.PROMPTS_FOLDER_ID;

    return this._loadFile(config.promptFile, folderId);
  },

  loadProjectDocs: function(workerName) {
    var workerConfig = CONFIG.WORKERS[workerName];

    if (!workerConfig) {
      Logger.log('Unknown worker for doc loading: ' + workerName);
      return null;
    }

    var docNames = workerConfig.docs;
    var sections = [];

    for (var i = 0; i < docNames.length; i++) {
      var content = this.loadMarkdown(docNames[i], CONFIG.DOCS_FOLDER_ID);

      if (content) {
        sections.push(
          '=== PROJECT DOCUMENT: ' + docNames[i] + ' ===\n' +
          content
        );
      } else {
        sections.push(
          '=== PROJECT DOCUMENT: ' + docNames[i] + ' ===\n' +
          '[FILE NOT FOUND - SKIP]'
        );
      }
    }

    return sections.join('\n\n');
  },

  loadAllDocs: function() {
    var cacheKey = 'allDocs';
    var cached = CacheService.getScriptCache().get(cacheKey);

    if (cached) {
      return cached;
    }

    try {
      var folder = DriveApp.getFolderById(CONFIG.DOCS_FOLDER_ID);
      var files = folder.getFilesByType(MimeType.PLAIN_TEXT);
      var contents = {};

      while (files.hasNext()) {
        var file = files.next();
        var name = file.getName();

        if (name.endsWith('.md')) {
          contents[name] = file.getBlob().getDataAsString('UTF-8');
        }
      }

      var result = JSON.stringify(contents);
      CacheService.getScriptCache().put(cacheKey, result, CONFIG.CACHE_DURATION);
      return contents;

    } catch (e) {
      Logger.log('loadAllDocs error: ' + e.toString());
      return {};
    }
  },

  // Accepts a Drive file URL or a bare file ID and returns the image as
  // inline data for multimodal AI requests. Returns null on any failure so a
  // single unreadable asset never aborts the whole worker run.
  loadImageAsInlineData: function(fileRef) {
    var ref = String(fileRef || '').trim();

    if (!ref) {
      return null;
    }

    var idMatch = ref.match(/[-\w]{25,}/);
    var fileId = idMatch ? idMatch[0] : ref;

    try {
      var blob = DriveApp.getFileById(fileId).getBlob();
      var mimeType = blob.getContentType() || '';

      if (mimeType.indexOf('image/') !== 0) {
        Logger.log('Skipping non-image Drive file: ' + fileId + ' (' + mimeType + ')');
        return null;
      }

      return {
        base64: Utilities.base64Encode(blob.getBytes()),
        mimeType: mimeType
      };

    } catch (e) {
      Logger.log('loadImageAsInlineData failed for ' + fileId + ': ' + e.toString());
      return null;
    }
  },

  // ================================
  // PROJECT ASSETS
  // Real photographs of the actual facilities. Everything below degrades to an
  // empty result rather than throwing: a missing folder, an unshared folder or
  // an empty subfolder simply means this row is generated without reference.
  // ================================

  // Arabic text in the sheet carries definite articles and inconsistent letter
  // forms, so a literal search for "عناية مركزة" never matches the way people
  // actually write it — "العناية المركزة". Normalising both sides first is what
  // makes keyword matching usable on real content.
  _normalizeArabic: function(text) {
    return String(text || '')
      .toLowerCase()
      .replace(/[أإآٱ]/g, 'ا')  // أ إ آ -> ا
      .replace(/ة/g, 'ه')                       // ة -> ه
      .replace(/[ى]/g, 'ي')                     // ى -> ي
      .replace(/[ً-ْـ]/g, '')    // diacritics and tatweel
      // Definite article. \b is ASCII-only in JS, so an explicit boundary is
      // required — without it "العناية" never matches the keyword "عناية".
      .replace(/(^|\s)ال/g, '$1')
      .replace(/\s+/g, ' ')
      .trim();
  },

  // Picks the domain whose keywords appear in the row's creative fields. No
  // model call — the same row always resolves to the same domain.
  resolveAssetDomain: function(rowData) {
    var domains = (CONFIG.PROJECT_ASSETS && CONFIG.PROJECT_ASSETS.DOMAINS) || [];

    if (!domains.length) {
      return null;
    }

    var haystack = this._normalizeArabic([
      rowData['Campaign Name'],
      rowData['Visual Concept'],
      rowData['Visual Focus'],
      rowData['Visual Elements'],
      rowData['Content Type']
    ].join(' '));

    if (!haystack) {
      return null;
    }

    for (var i = 0; i < domains.length; i++) {
      var domain = domains[i];
      for (var k = 0; k < domain.keywords.length; k++) {
        if (haystack.indexOf(this._normalizeArabic(domain.keywords[k])) !== -1) {
          return domain;
        }
      }
    }

    return null;
  },

  // Resolves a "/"-separated path beneath the project assets root.
  //
  // Domains are grouped in Drive — clinical departments live under Services/,
  // brand material sits at the top — so a domain's folder is a path, not a
  // direct child. Walking the segments keeps the Drive layout free to be
  // organised for humans rather than flattened for the code.
  // `hospital` scopes the lookup to one hospital's photographs.
  //
  // Added 2026-08-07. `business/Media` was reorganised per hospital on
  // 2026-08-06 — Insan/, Future/, Delta/ — which is correct for photographs: a
  // ward photo belongs to the hospital it was taken in, and Delta's ICU does not
  // look like Future's. But every domain path in CONFIG was written against the
  // flat layout, so all fifteen resolved to null and every row fell back to AI
  // generation with no reference photograph. Silently — an absent folder means
  // "no reference images", which is indistinguishable from a folder that moved.
  //
  // Tries `<Hospital>/<path>` first, then the bare `<path>`. The fallback is not
  // decoration: shared material that is genuinely not per hospital keeps working
  // from the root, and a row whose Hospital Brand is blank still finds whatever
  // is there rather than finding nothing.
  _assetSubfolder: function(folderPath, hospital) {
    var rootId = CONFIG.PROJECT_ASSETS && CONFIG.PROJECT_ASSETS.FOLDER_ID;

    if (!rootId || !String(rootId).trim() || !folderPath) {
      return null;
    }

    var scoped = String(hospital || '').trim();

    if (scoped) {
      var underHospital = this._walkAssetPath(scoped + '/' + folderPath);
      if (underHospital) return underHospital;
    }

    return this._walkAssetPath(folderPath);
  },

  _walkAssetPath: function(folderPath) {
    var rootId = CONFIG.PROJECT_ASSETS && CONFIG.PROJECT_ASSETS.FOLDER_ID;
    var segments = String(folderPath).split('/');
    var current;

    try {
      current = DriveApp.getFolderById(rootId);
    } catch (e) {
      Logger.log('PROJECT_ASSETS | cannot open root folder: ' + e.toString());
      return null;
    }

    for (var i = 0; i < segments.length; i++) {
      var name = segments[i].trim();

      if (!name) {
        continue;
      }

      try {
        var matches = current.getFoldersByName(name);

        if (!matches.hasNext()) {
          // Expected whenever a domain folder has not been created yet.
          // Callers treat an absent folder as "no reference images".
          return null;
        }

        current = matches.next();

      } catch (e) {
        Logger.log(
          'PROJECT_ASSETS | cannot descend into "' + name + '" of "' +
          folderPath + '": ' + e.toString()
        );
        return null;
      }
    }

    return current;
  },

  // Names only — cheap enough to call while building worker context.
  // One named file from a project-assets subfolder, as a blob.
  //
  // Separate from loadProjectAssets, which takes a whole folder as visual
  // reference for the image model. A logo is not reference material: exactly
  // one file is wanted, by name, and the wrong one is not a degraded result but
  // a different company's mark on a real hospital's post.
  //
  // Cached for the same six hours as everything else read from Drive, because
  // a carousel composites the same three logos onto every card.
  loadProjectAsset: function(folderPath, fileName) {
    var wanted = String(fileName || '').trim();

    if (!folderPath || !wanted) {
      return null;
    }

    var cacheKey = 'asset:' + folderPath + '/' + wanted;
    var folder = this._assetSubfolder(folderPath);

    if (!folder) {
      Logger.log('PROJECT_ASSETS | folder "' + folderPath + '" did not resolve');
      return null;
    }

    try {
      var files = folder.getFilesByName(wanted);

      if (!files.hasNext()) {
        Logger.log(
          'PROJECT_ASSETS | "' + wanted + '" not found in "' + folderPath + '"'
        );
        return null;
      }

      var blob = files.next().getBlob();

      // A second file with the same name means Drive cannot say which one was
      // meant, and picking the first silently is how the wrong logo ships.
      if (files.hasNext()) {
        Logger.log(
          'PROJECT_ASSETS | more than one file named "' + wanted + '" in "' +
          folderPath + '" — used the first. Remove the duplicate.'
        );
      }

      return blob;

    } catch (e) {
      Logger.log(
        'PROJECT_ASSETS | could not read "' + wanted + '" from "' + folderPath +
        '": ' + e.toString()
      );
      return null;
    }
  },

  listProjectAssets: function(domain, hospital) {
    if (!domain) {
      return [];
    }

    var folder = this._assetSubfolder(domain.folder, hospital);

    if (!folder) {
      return [];
    }

    var types = CONFIG.PROJECT_ASSETS.SUPPORTED_IMAGE_TYPES;
    var names = [];

    try {
      var files = folder.getFiles();
      while (files.hasNext()) {
        var file = files.next();
        if (types.indexOf(file.getMimeType()) !== -1) {
          names.push(file.getName());
        }
      }
    } catch (e) {
      Logger.log('PROJECT_ASSETS | cannot list "' + domain.folder + '": ' + e.toString());
      return [];
    }

    return names;
  },

  // Actual bytes, for handing to the image model as visual reference.
  loadProjectAssets: function(domain, maxImages, hospital) {
    if (!domain) {
      return [];
    }

    var folder = this._assetSubfolder(domain.folder, hospital);

    if (!folder) {
      return [];
    }

    var limit = maxImages || CONFIG.PROJECT_ASSETS.MAX_REFERENCE_IMAGES || 3;
    var types = CONFIG.PROJECT_ASSETS.SUPPORTED_IMAGE_TYPES;
    var images = [];

    try {
      var files = folder.getFiles();
      while (files.hasNext() && images.length < limit) {
        var file = files.next();

        if (types.indexOf(file.getMimeType()) === -1) {
          continue;
        }

        images.push({
          base64: Utilities.base64Encode(file.getBlob().getBytes()),
          mimeType: file.getMimeType(),
          name: file.getName()
        });
      }
    } catch (e) {
      Logger.log('PROJECT_ASSETS | cannot read "' + domain.folder + '": ' + e.toString());
      return [];
    }

    if (images.length) {
      Logger.log(
        'PROJECT_ASSETS | domain "' + domain.key + '" supplied ' +
        images.length + ' reference image(s)'
      );
    }

    return images;
  },

  // Splits a comma-separated Generated Assets cell into inline image payloads.
  loadImagesFromCell: function(cellValue, maxImages) {
    var value = String(cellValue || '').trim();

    if (!value) {
      return [];
    }

    var refs = value.split(',');
    var limit = maxImages || 4;
    var images = [];

    for (var i = 0; i < refs.length && images.length < limit; i++) {
      var ref = refs[i].trim();
      if (!ref) {
        continue;
      }

      var image = this.loadImageAsInlineData(ref);
      if (image) {
        images.push(image);
      }
    }

    return images;
  },

  invalidateCache: function(fileName, folderId) {
    var targetFolder = folderId || CONFIG.DOCS_FOLDER_ID;
    var cacheKey = 'drive_' + targetFolder + '_' + fileName;
    CacheService.getScriptCache().remove(cacheKey);
  },

  invalidateAllCache: function() {
    var cache = CacheService.getScriptCache();

    cache.removeAll([
      'allDocs',
      'drive_' + CONFIG.DOCS_FOLDER_ID,
      'drive_' + CONFIG.PROMPTS_FOLDER_ID,
      'drive_' + CONFIG.VISUAL_PROMPTS_FOLDER_ID
    ]);

    // Services as well as workers. Media Generation lives under CONFIG.SERVICES,
    // so Refresh Cache walked straight past MEDIA_GENERATION_SERVICE.md — the
    // second largest prompt in the system. Editing it in Drive and refreshing
    // did nothing for six hours, and looked exactly like an edit that had
    // taken effect.
    // The planning workers are not in either registry — they read their manual
    // from PLANNING_PROMPTS_FOLDER_ID, which is a Script Property — so their
    // prompts were unreachable from here too.
    var planningFolder =
      PropertiesService.getScriptProperties().getProperty('PLANNING_PROMPTS_FOLDER_ID') ||
      CONFIG.PLANNING_PROMPTS_FOLDER_ID || CONFIG.PROMPTS_FOLDER_ID;

    var planning = [CONFIG.CARD_BUILDER, CONFIG.CAMPAIGN_PLANNER, CONFIG.PORTFOLIO_CRITIC];

    for (var q = 0; q < planning.length; q++) {
      var promptFile = planning[q] && planning[q].promptFile;
      if (promptFile) {
        cache.remove('drive_' + planningFolder + '_' + promptFile);
      }
    }

    // Brand documents the planning workers name inline rather than through a
    // docs array. If a call site there starts reading a different document, add
    // it here — a doc loaded inline and absent from this list stays cached for
    // six hours after the operator edits it, which reads as "my change did
    // nothing" rather than as a stale cache.
    var planningDocs = [
      'MASTER_BRAND_ARCHITECTURE.md', 'AI_CREATIVE_CONSTITUTION.md',
      'PROJECT_DECISIONS.md', 'PROJECT_STRUCTURE.md',
      'PLATFORM_KNOWLEDGE_BASE.md', 'ENTITY_REGISTRY.md'
    ];

    for (var b = 0; b < planningDocs.length; b++) {
      cache.remove('drive_' + CONFIG.DOCS_FOLDER_ID + '_' + planningDocs[b]);
    }

    var registries = [CONFIG.WORKERS || {}, CONFIG.SERVICES || {}];

    for (var r = 0; r < registries.length; r++) {
      var registry = registries[r];

      for (var name in registry) {
        var entry = registry[name] || {};

        var docNames = entry.docs || [];

        for (var i = 0; i < docNames.length; i++) {
          cache.remove('drive_' + CONFIG.DOCS_FOLDER_ID + '_' + docNames[i]);
        }

        // A service keeps its own docs under its worker block — the Media
        // Designer's live in .designer.docs — and those are loaded from the
        // same folder, so they go stale the same way.
        var nested = (entry.designer && entry.designer.docs) || [];
        for (var n = 0; n < nested.length; n++) {
          cache.remove('drive_' + CONFIG.DOCS_FOLDER_ID + '_' + nested[n]);
        }

        if (!entry.promptFile) {
          continue;
        }

        var isVisual = entry.sheetName === CONFIG.VISUAL_PIPELINE.SHEET_NAME;
        var promptFolder = isVisual
          ? CONFIG.VISUAL_PROMPTS_FOLDER_ID
          : CONFIG.PROMPTS_FOLDER_ID;

        cache.remove('drive_' + promptFolder + '_' + entry.promptFile);
      }
    }
  }
};

// ---------------------------------------------------------------------------
// END SOURCE FILE: DriveLoader.gs
// ---------------------------------------------------------------------------


// ---------------------------------------------------------------------------
// BEGIN SOURCE FILE: ResponseParser.gs
// ---------------------------------------------------------------------------
var ResponseParser = {

  parse: function(responseText, workerName) {
    var workerConfig = CONFIG.WORKERS[workerName];

    if (!workerConfig) {
      throw new Error('Unknown worker for parsing: ' + workerName);
    }

    Logger.log('PARSER_RAW_RESPONSE | First 500 chars: ' + responseText.substring(0, 500));

    var cleaned = this._cleanResponseText(responseText);
    var json = this._extractJSON(cleaned);

    if (!json) {
      Logger.log('PARSER_JSON_FAILED | Could not extract JSON');
      throw new Error(
        'Failed to extract JSON from AI response. ' +
        'Response starts with: ' + cleaned.substring(0, 200)
      );
    }

    Logger.log('PARSER_EXTRACTED_JSON | Keys: ' + Object.keys(json).join(', '));

    var validated = this._validateFields(json, workerConfig, workerName);

    Logger.log('PARSER_VALIDATED_VALUES | Values: ' + JSON.stringify(validated.values).substring(0, 500));
    Logger.log('PARSER_WARNINGS | Warnings: ' + validated.warnings.join('; '));

    return {
      values: validated.values,
      warnings: validated.warnings,
      deviations: validated.deviations || [],
      isPartial: validated.warnings.length > 0
    };
  },

  _cleanResponseText: function(text) {
    var cleaned = text.trim();

    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.substring(7);
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.substring(3);
    }

    if (cleaned.endsWith('```')) {
      cleaned = cleaned.substring(0, cleaned.length - 3);
    }

    var firstBrace = cleaned.indexOf('{');
    var lastBrace = cleaned.lastIndexOf('}');

    if (firstBrace !== -1 && lastBrace > firstBrace) {
      cleaned = cleaned.substring(firstBrace, lastBrace + 1);
    }

    return cleaned.trim();
  },

  _extractJSON: function(text) {
    try {
      return JSON.parse(text);
    } catch (e) {
    }

    var firstBrace = text.indexOf('{');
    var lastBrace = text.lastIndexOf('}');

    if (firstBrace !== -1 && lastBrace > firstBrace) {
      var candidate = text.substring(firstBrace, lastBrace + 1);

      try {
        return JSON.parse(candidate);
      } catch (e) {
      }
    }

    return null;
  },

  _validateFields: function(json, workerConfig, workerName) {
    var outputFields = workerConfig.outputFields;
    var values = {};
    var warnings = [];
    var deviations = [];

    for (var fieldName in outputFields) {
      var fieldType = outputFields[fieldName];

      if (!json.hasOwnProperty(fieldName)) {
        warnings.push('Missing field: ' + fieldName);
        values[fieldName] = '';
        continue;
      }

      var rawValue = String(json[fieldName]).trim();

      if (rawValue === '' || rawValue === 'null' || rawValue === 'undefined') {
        warnings.push('Empty field: ' + fieldName);
        values[fieldName] = '';
        continue;
      }

      if (fieldType === 'controlled') {
        var corrected = this._validateControlledField(fieldName, rawValue);

        if (corrected.wasCorrected) {
          warnings.push(
            'Corrected "' + fieldName + '": "' +
            rawValue + '" -> "' + corrected.value + '"'
          );
        } else if (corrected.isOutOfVocabulary) {
          // Accepted as-is. The vocabulary is treated as guidance, not as a gate:
          // a value nobody anticipated is production evidence, not a reason to stop.
          warnings.push(
            'Out-of-vocabulary "' + fieldName + '": "' + corrected.value + '" (accepted)'
          );
          deviations.push({
            field: fieldName,
            value: corrected.value,
            vocabulary: CONFIG.CONTROLLED_VOCABULARY[fieldName] || []
          });
        }

        values[fieldName] = corrected.value;
      } else {
        values[fieldName] = rawValue;
      }
    }

    return {
      values: values,
      warnings: warnings,
      deviations: deviations,
      worker: workerName
    };
  },

  _validateControlledField: function(fieldName, value) {
    var vocabulary = CONFIG.CONTROLLED_VOCABULARY[fieldName];

    if (!vocabulary) {
      return { value: value, wasCorrected: false };
    }

    if (vocabulary.indexOf(value) !== -1) {
      return { value: value, wasCorrected: false };
    }

    var normalizedInput = value.toLowerCase().trim();

    for (var i = 0; i < vocabulary.length; i++) {
      if (vocabulary[i].toLowerCase() === normalizedInput) {
        return { value: vocabulary[i], wasCorrected: true };
      }
    }

    var bestMatch = this._findBestMatch(normalizedInput, vocabulary);

    if (bestMatch) {
      return { value: bestMatch, wasCorrected: true };
    }

    // No match and no near-match. Keep the worker's value and flag it.
    return { value: value, wasCorrected: false, isOutOfVocabulary: true };
  },

  _findBestMatch: function(input, options) {
    var bestScore = 0;
    var bestMatch = null;

    for (var i = 0; i < options.length; i++) {
      var option = options[i].toLowerCase();
      var score = 0;

      if (option.indexOf(input) !== -1 || input.indexOf(option) !== -1) {
        score = 0.8;
      } else {
        score = this._similarity(input, option);
      }

      if (score > bestScore && score > 0.6) {
        bestScore = score;
        bestMatch = options[i];
      }
    }

    return bestMatch;
  },

  _similarity: function(a, b) {
    var longer = a.length > b.length ? a : b;
    var shorter = a.length > b.length ? b : a;

    if (longer.length === 0) return 1.0;

    var longerLength = longer.length;
    var distance = this._editDistance(longer, shorter);

    return (longerLength - distance) / longerLength;
  },

  _editDistance: function(a, b) {
    var matrix = [];

    for (var i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }

    for (var j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    for (var i = 1; i <= b.length; i++) {
      for (var j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[b.length][a.length];
  }
};

// ---------------------------------------------------------------------------
// END SOURCE FILE: ResponseParser.gs
// ---------------------------------------------------------------------------

