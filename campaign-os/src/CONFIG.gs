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
    WORKFLOW_STATUS: 'Workflow Status',
    NOTES: 'Notes'
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
        'Secondary Hashtags', 'Design Prompt (AI)'
      ],
      outputFields: {
        'Post Copy (AI)': 'free',
        'Primary Hashtags': 'free',
        'Secondary Hashtags': 'free',
        'Design Prompt (AI)': 'free'
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
        'Secondary Hashtags', 'Design Prompt (AI)'
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
    'Workflow Status': [
      'NEW', 'READY', 'PROCESSING', 'COMPLETED', 'FAILED'
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
