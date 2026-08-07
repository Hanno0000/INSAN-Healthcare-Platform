const fs = require('fs');
const path = require('path');

const KB_DIR = 'J:/My Drive/Insan/business/knowledge';
const SEED_FILE = 'J:/My Drive/Insan/website/apps/api/prisma/seed-data.json';

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return { frontmatter: {}, body: content };
  
  const raw = match[1];
  const body = content.slice(match[0].length).trim();
  
  const frontmatter = {};
  raw.split('\n').forEach(line => {
    const colonIdx = line.indexOf(':');
    if (colonIdx > -1) {
      const key = line.slice(0, colonIdx).trim();
      const val = line.slice(colonIdx + 1).trim();
      frontmatter[key] = val;
    }
  });
  
  return { frontmatter, body };
}

function parseSections(body) {
  const sections = [];
  const regex = /^##\s+(.+)$/gm;
  let match;
  let lastIndex = 0;
  let currentTitle = null;
  
  while ((match = regex.exec(body)) !== null) {
    if (currentTitle !== null) {
      sections.push({ title: currentTitle, content: body.slice(lastIndex, match.index).trim() });
    }
    currentTitle = match[1];
    lastIndex = regex.lastIndex;
  }
  if (currentTitle !== null) {
    sections.push({ title: currentTitle, content: body.slice(lastIndex).trim() });
  } else {
    sections.push({ title: 'Content', content: body.trim() });
  }
  return sections;
}

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function main() {
  const seedData = JSON.parse(fs.readFileSync(SEED_FILE, 'utf8'));
  
  // 1. Parse Hospitals
  const hospitalsDir = path.join(KB_DIR, 'hospitals');
  if (fs.existsSync(hospitalsDir)) {
    const files = fs.readdirSync(hospitalsDir).filter(f => f.endsWith('.md'));
    for (const file of files) {
      const content = fs.readFileSync(path.join(hospitalsDir, file), 'utf8');
      const { frontmatter, body } = parseFrontmatter(content);
      if (!frontmatter.entity_id) continue;
      
      const HOSPITAL_SLUG_MAP = {
        'HOSP-001': 'future-hospital',
        'HOSP-002': 'delta-hospital',
      };
      
      const slug = HOSPITAL_SLUG_MAP[frontmatter.entity_id] || slugify(frontmatter.entity_name_en);
      let hospital = seedData.hospitals.find(h => h.slug === slug);
      if (!hospital) {
        hospital = { slug, departments: [] };
        seedData.hospitals.push(hospital);
      }
      hospital.name = {
        en: frontmatter.entity_name_en,
        ar: frontmatter.entity_name_ar
      };
      hospital.status = frontmatter.status === 'Active' ? 'PUBLISHED' : 'DRAFT';
      
      // Try to parse short desc and desc from body
      const sections = parseSections(body);
      for (const sec of sections) {
        if (sec.title.toLowerCase().includes('overview')) {
          hospital.description = { en: sec.content, ar: '' };
        }
        if (sec.title.toLowerCase().includes('definition')) {
          hospital.shortDescription = { en: sec.content, ar: '' };
        }
      }
    }
  }

  // 2. Parse Departments
  const deptsDir = path.join(KB_DIR, 'departments');
  const parsedDepts = [];
  if (fs.existsSync(deptsDir)) {
    const files = fs.readdirSync(deptsDir).filter(f => f.endsWith('.md'));
    for (const file of files) {
      const content = fs.readFileSync(path.join(deptsDir, file), 'utf8');
      const { frontmatter, body } = parseFrontmatter(content);
      if (!frontmatter.entity_id) continue;
      
      const slug = slugify(frontmatter.entity_name_en);
      const dept = {
        slug,
        name: { en: frontmatter.entity_name_en, ar: frontmatter.entity_name_ar },
        hospitals: frontmatter.hospitals ? frontmatter.hospitals.replace(/[\[\]]/g, '').split(',').map(s=>s.trim().toLowerCase()) : []
      };
      
      const sections = parseSections(body);
      for (const sec of sections) {
        if (sec.title.toLowerCase().includes('overview')) {
          dept.description = { en: sec.content, ar: '' };
        }
        if (sec.title.toLowerCase().includes('definition')) {
          dept.shortDescription = { en: sec.content, ar: '' };
        }
      }
      parsedDepts.push(dept);
    }
  }

  // Inject departments into hospitals
  for (const hospital of seedData.hospitals) {
    // e.g. 'future' from 'future-hospital'
    const hKey = hospital.slug.replace('-hospital', ''); 
    const matchingDepts = parsedDepts.filter(d => d.hospitals.includes(hKey) || d.hospitals.includes(hospital.slug));
    
    for (const md of matchingDepts) {
      hospital.departments = hospital.departments || [];
      const existing = hospital.departments.find(d => d.slug === md.slug);
      if (existing) {
        existing.name = md.name;
        existing.shortDescription = md.shortDescription;
        existing.description = md.description;
      } else {
        hospital.departments.push({
          slug: md.slug,
          name: md.name,
          shortDescription: md.shortDescription,
          description: md.description,
          image: ''
        });
      }
    }
  }

  // 3. Parse Pages (Corporate & Programs)
  seedData.pages = seedData.pages || [];
  const pageDirs = ['corporate', 'programs'];
  for (const dir of pageDirs) {
    const dirPath = path.join(KB_DIR, dir);
    if (!fs.existsSync(dirPath)) continue;
    
    const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.md'));
    for (const file of files) {
      const content = fs.readFileSync(path.join(dirPath, file), 'utf8');
      const { frontmatter, body } = parseFrontmatter(content);
      if (!frontmatter.entity_id) continue;
      
      const slug = slugify(frontmatter.entity_name_en);
      const title = {
        en: frontmatter.entity_name_en,
        ar: frontmatter.entity_name_ar
      };
      
      let page = seedData.pages.find(p => p.slug === slug);
      if (!page) {
        page = { slug, type: 'standard', sections: [] };
        seedData.pages.push(page);
      }
      
      page.title = title;
      page.status = 'PUBLISHED';
      
      // Convert Markdown sections to CMS sections
      const sections = parseSections(body);
      page.sections = sections.map((sec, idx) => ({
        id: 'sec-' + idx,
        type: 'rich_text',
        order: idx,
        content: {
          title: { en: sec.title, ar: '' },
          body: { en: sec.content, ar: '' }
        }
      }));
    }
  }

  fs.writeFileSync(SEED_FILE, JSON.stringify(seedData, null, 2));
  console.log('Seed data updated successfully!');
}

main();
