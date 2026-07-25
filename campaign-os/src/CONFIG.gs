// ================================
// PRODUCTION CONFIGURATION
// This section is frozen.
// Do not modify unless explicitly requested.
// ================================

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

  PROJECT_ASSETS: {
    FOLDER_ID: '',
    SUPPORTED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
    DOMAIN_FOLDERS: {
      'icu': 'Intensive Care Unit',
      'nicu': 'Neonatal Intensive Care Unit',
      'emergency': 'Emergency Department',
      'operating-room': 'Operating Room',
      'outpatient-clinic': 'Outpatient Clinic',
      'radiology': 'Radiology Department',
      'laboratory': 'Laboratory',
      'physiotherapy': 'Physiotherapy',
      'pharmacy': 'Pharmacy',
      'branding': 'Brand Identity'
    }
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

  CACHE_DURATION: 21600,
  LOG_SHEET_NAME: 'Execution Log',
  HEADER_ROW: 1,
  DATA_START_ROW: 2,
  BATCH_TIMEOUT_SECONDS: 300,

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
    }
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
        'Creative Director Quality Score',
        'Creative Director Review Status', 'Creative Director Notes',
        'Creative Director Post Copy', 'Creative Director Design Prompt'
      ],
      outputFields: {
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
      readColumns: [
        'Content ID', 'Content Format',
        'Creative Director Design Prompt', 'Visual Concept',
        'Visual Focus', 'Composition', 'Visual Elements',
        'Do NOT Show', 'Text On Design', 'Asset Count',
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
    'Content Format': [
      'Static', 'Carousel', 'Reel', 'Video',
      'Story', 'Motion Graphic', 'Infographic'
    ],
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
