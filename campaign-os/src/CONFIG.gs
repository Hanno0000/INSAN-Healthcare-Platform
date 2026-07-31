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
  DOCS_FOLDER_ID: '1tI0lW6Faai_d0vXz5fGJ4e7nNpl_yS5V',
  PROMPTS_FOLDER_ID: '1GbZxU9ndwrZLOqtz7kBBfH2nDlG1CWj-',
  VISUAL_PROMPTS_FOLDER_ID: '18TQFFAZoMfqLAE8TRzpOKTs6L001o9Zt',

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
  PROJECT_ASSETS: {
    FOLDER_ID: '1KIYMoXT-nKRxfKssmzvinuCJLRW-zdAw',
    SUPPORTED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
    MAX_REFERENCE_IMAGES: 3,

    // Keywords are matched against Campaign Name, Visual Concept, Visual Focus
    // and Visual Elements. Matching is deterministic and needs no model call.
    // Order matters: the first domain with a keyword hit wins, so the more
    // specific domains are listed first.
    DOMAINS: [
      { key: 'nicu', folder: 'Services/Neonatal Intensive Care Unit',
        keywords: ['nicu', 'neonatal', 'newborn', 'حضانة', 'حديثي الولادة'] },
      { key: 'icu', folder: 'Services/Intensive Care Unit',
        keywords: ['icu', 'intensive care', 'critical care', 'عناية مركزة', 'رعاية حرجة'] },
      { key: 'emergency', folder: 'Services/Emergency Department',
        keywords: ['emergency', 'triage', 'ambulance', 'طوارئ', 'إسعاف'] },
      { key: 'operating-room', folder: 'Services/Operating Room',
        keywords: ['operating', 'surgery', 'surgical', 'theatre', 'عمليات', 'جراحة'] },
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
      { key: 'outpatient-clinic', folder: 'Services/Outpatient Clinic',
        keywords: ['outpatient', 'clinic', 'consultation', 'reception', 'عيادة', 'استقبال', 'كشف'] },
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
    BAND_HEIGHT_PCT: 0.22,

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
    OPERATOR_OWNED: [
      'Priority', 'Duration', 'Target Posts', 'Status'
    ],

    // The twelve strategy fields must stay in Campaign Cards O:Z — the Content
    // Pipeline VLOOKUP addresses them by position, not by name.
    OUTPUT_FIELDS: {
      'Umbrella Campaign': 'free',
      'Master Brand': 'free',
      'Sub-Brand': 'free',
      'Medical Center': 'free',
      'Service Level': 'controlled',
      'Business Goal': 'free',
      'Marketing Goal': 'free',
      'Priority': 'free',
      'Duration': 'free',
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
  // Appended at the end of the sheet, never inserted: the Content Pipeline
  // VLOOKUP addresses Campaign Cards O:Z positionally, and an inserted column
  // shifts every strategy field out from under it.
  MANAGED_COLUMNS: [
    { sheet: 'Content Pipeline', column: 'Pipeline State' },
    { sheet: 'Content Pipeline', column: 'Alternative Opening' },
    { sheet: 'Campaign Cards', column: 'Service Level' }
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
        'Target Audience'
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
        docs: ['INSAN_VISUAL_LANGUAGE_SPEC.md']
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

    docs: [
      'MASTER_BRAND_ARCHITECTURE.md',
      'AI_CREATIVE_CONSTITUTION.md',
      'PROJECT_DECISIONS.md'
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

  VISUAL_ASSETS: {
    generated: '10wQyR4Xl1heAlfM6D_3DoQnbI1hhgPpK',
    approved: '1U4ICxBI-nloZ-ZyWbP4DT8i915o8Khbp',
    rejected: '1FXVqKNhXAyxSkSEXKCfGoynnMR_kYKIZ',
    published: '1h9QbGSYarSuBALgE9ZyEqPQKm0T6ywt7',
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
