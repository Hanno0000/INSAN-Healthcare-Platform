const fs = require('fs');
const path = require('path');
const arabicTranslations = require('./arabic_translations.js');

const KNOWLEDGE_DIR = 'J:/My Drive/Insan/business/knowledge';
const SEED_FILE = 'J:/My Drive/Insan/website/apps/api/prisma/seed-data.json';

function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return { frontmatter: {}, body: content };
  const body = content.slice(match[0].length).trim();
  const frontmatter = {};
  match[1].split('\n').forEach(line => {
    const colonIdx = line.indexOf(':');
    if (colonIdx > -1) {
      const key = line.slice(0, colonIdx).trim();
      const val = line.slice(colonIdx + 1).trim();
      frontmatter[key] = val;
    }
  });
  return { frontmatter, body };
}

// Extracts specific ### subsection content
function extractSection(body, heading) {
  const re = new RegExp(`### ${heading}\\s*\\n([\\s\\S]*?)(?=\\n###|\\n---|\n##|$)`, 'i');
  const m = body.match(re);
  return m ? m[1].trim() : null;
}

// Extracts bullet list items from a block
function extractBullets(text) {
  if (!text) return [];
  return text.split('\n')
    .filter(l => /^\*\s+/.test(l))
    .map(l => l.replace(/^\*\s+/, '').replace(/\*\*/g, '').trim())
    .filter(Boolean);
}

// Remove markdown bold and list markers for clean text
function cleanText(text) {
  if (!text) return '';
  return text.replace(/\*\*/g, '').replace(/^\*\s+/gm, '• ').trim();
}

function slugify(text) {
  return text.toLowerCase()
    .replace(/&/g, ' ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

const REGISTRY_ID_MAP = {
  'CEN-001': { registryId: 'CEN-001', slug: 'cardiac-internal-medicine-center' },
  'CEN-007': { registryId: 'CEN-007', slug: 'womens-health-center' },
  'CEN-002': { registryId: 'CEN-002', slug: 'urology-andrology-surgery-center' },
  'CEN-006': { registryId: 'CEN-006', slug: 'pediatrics-neonatology-center' },
  'CEN-005': { registryId: 'CEN-005', slug: 'ent-head-and-neck-surgery-center' },
  'CEN-004': { registryId: 'CEN-004', slug: 'general-surgery-endoscopy-center' },
  'CEN-014': { registryId: 'CEN-014', slug: 'colorectal-anal-surgeries-center' },
  'CEN-013': { registryId: 'CEN-013', slug: 'bariatric-metabolic-surgeries-center' },
  'MED-001': { registryId: 'MED-001', slug: 'intensive-care-unit' },
  'MED-002': { registryId: 'MED-002', slug: 'emergency-department' },
  'MED-006': { registryId: 'MED-006', slug: 'outpatient-clinics' },
  'MED-007': { registryId: 'MED-007', slug: 'general-surgery-specialized-surgical-clinics' },
  'PROG-001': { registryId: 'PROG-001', slug: 'kabarona-program' },
};

function parseCenter(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const { frontmatter, body } = parseFrontmatter(content);
  
  const entityId = frontmatter['entity_id'];
  if (!entityId || !REGISTRY_ID_MAP[entityId]) {
    console.warn('  ! Skipping', path.basename(filePath), '— entity_id not in registry map');
    return null;
  }

  const { registryId, slug } = REGISTRY_ID_MAP[entityId];

  // Extract overview (1.1) for description
  const overview = extractSection(body, '1.1 Overview');
  // Extract definition (1.2) for more detail
  const definition = extractSection(body, '1.2 Definition');
  // Extract positioning (1.7)
  const positioning = extractSection(body, '1.7 Positioning');
  // Extract core features (3.4) for features array
  const featuresBlock = extractSection(body, '3.4 Core Features');
  // Extract specialized clinics (3.8) for clinics array
  const clinicsBlock = extractSection(body, '3.8 Specialized Clinics');
  // Extract clinic schedule for operations
  const schedule = extractSection(body, '3.9 Clinic Schedule');
  // Extract differentiators (3.5)
  const diffBlock = extractSection(body, '3.5 Differentiators');

  // Build description: overview + key points clean
  const descEn = [overview, positioning].filter(Boolean).join('\n\n');

  // Build short description from positioning or first sentence of overview
  const shortDescEn = positioning || (overview ? overview.split('.')[0] + '.' : '');

  // Features from 3.4 bullets
  const featureBullets = extractBullets(featuresBlock);
  const features = featureBullets.map(f => {
    const enText = cleanText(f);
    const tr = arabicTranslations[registryId];
    return {
      title: { en: enText, ar: (tr && tr.features && tr.features[enText]) ? tr.features[enText] : enText }
    };
  });

  // Differentiators as extra features if not many
  if (features.length < 3) {
    const diffBullets = extractBullets(diffBlock);
    diffBullets.forEach(d => {
      const enText = cleanText(d);
      const tr = arabicTranslations[registryId];
      features.push({ title: { en: enText, ar: (tr && tr.features && tr.features[enText]) ? tr.features[enText] : enText } });
    });
  }

  // Clinics from 3.8 bullets — extract Arabic name from parentheses if available
  const clinicBullets = extractBullets(clinicsBlock);
  const clinics = clinicBullets.map(cl => {
    // Pattern: "English Name (الاسم العربي)"
    const arMatch = cl.match(/\(([^)]+)\)/);
    const arName = arMatch ? arMatch[1] : cl;
    const enName = cl.replace(/\s*\([^)]*\)/, '').trim();
    return {
      name: { en: enName || cl, ar: arName },
      schedule: { en: "By Appointment", ar: "بحجز مسبق" }
    };
  });

  // Schedule text
  let scheduleText = '';
  if (schedule) {
    const scheduleBullets = extractBullets(schedule);
    scheduleText = scheduleBullets.map(b => cleanText(b)).join(' | ');
  }

  return {
    registryId,
    slug,
    name: {
      en: frontmatter['entity_name_en'] || '',
      ar: frontmatter['entity_name_ar'] || ''
    },
    shortDescription: {
      en: shortDescEn,
      ar: (arabicTranslations[registryId] && arabicTranslations[registryId].short) ? arabicTranslations[registryId].short : shortDescEn
    },
    description: {
      en: descEn,
      ar: (arabicTranslations[registryId] && arabicTranslations[registryId].desc) ? arabicTranslations[registryId].desc : descEn
    },
    isFeatured: false,
    features,
    clinics,
    schedule: scheduleText || null,
    services: clinics.map(c => ({
      name: c.name,
      description: null
    })),
    bookingQuestions: []
  };
}

function main() {
  const seedData = JSON.parse(fs.readFileSync(SEED_FILE, 'utf8'));
  
  const subDirs = ['centers', 'departments', 'programs'];
  const parsed = [];
  
  for (const dir of subDirs) {
    const dirPath = path.join(KNOWLEDGE_DIR, dir);
    if (!fs.existsSync(dirPath)) continue;
    const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.md'));
    
    for (const file of files) {
      console.log('Parsing:', file, 'as', dir);
      const result = parseCenter(path.join(dirPath, file));
      if (result) {
        // Set type based on directory
        if (dir === 'centers') result.type = 'CENTER';
        else if (dir === 'departments') result.type = 'DEPARTMENT';
        else if (dir === 'programs') result.type = 'PROGRAM';
        
        parsed.push(result);
        console.log('  ✓', result.slug, '| features:', result.features.length, '| clinics:', result.clinics.length);
      }
    }
  }

  seedData.medicalCenters = parsed;
  fs.writeFileSync(SEED_FILE, JSON.stringify(seedData, null, 2));
  console.log('\n✅ seed-data.json updated with', parsed.length, 'medical centers');
}

main();
