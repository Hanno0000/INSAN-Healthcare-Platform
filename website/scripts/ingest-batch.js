const fs = require('fs');
const path = require('path');
const BASE_URL = 'http://169.58.77.61/api/v1';
const TOKEN = process.argv[2] || process.env.TOKEN;

if (!TOKEN) {
    console.error("Please provide the token as an argument:\n  node ingest-batch.js <token>");
    process.exit(1);
}

const H = {
    'Authorization': `Bearer ${TOKEN}`,
    'Content-Type': 'application/json'
};

const DATA_FILE = path.join(__dirname, '../Docs/insan-content-data.json');
const STATE_FILE = path.join(__dirname, '../Docs/ingestion-state.json');

const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
let state = {};
if (fs.existsSync(STATE_FILE)) {
    try { state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); } catch(e){}
}

function cleanObject(obj) {
    if (Array.isArray(obj)) {
        return obj.map(cleanObject).filter(v => v !== undefined);
    } else if (obj !== null && typeof obj === 'object') {
        const cleaned = {};
        for (const [k, v] of Object.entries(obj)) {
            if (typeof v === 'string' && (v.includes('__NEEDS_OPERATOR__') || v === 'USE_DEFAULT')) continue;
            // Also exclude internal _note or _meta fields
            if (k.startsWith('_')) continue;
            
            const cv = cleanObject(v);
            if (cv !== undefined) cleaned[k] = cv;
        }
        return Object.keys(cleaned).length > 0 ? cleaned : undefined;
    }
    return obj;
}

function isDifferent(obj1, obj2) {
    return JSON.stringify(obj1) !== JSON.stringify(obj2);
}

async function api(method, endpoint, body = null) {
    const opts = { method, headers: H };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(`${BASE_URL}${endpoint}`, opts);
    if (!res.ok) {
        let msg = '';
        try { msg = await res.text(); } catch(e){}
        throw new Error(`API Error ${res.status} on ${method} ${endpoint}: ${msg}`);
    }
    if (res.status === 204) return null;
    return await res.json();
}

async function getEntities(endpoint) {
    const res = await api('GET', endpoint);
    return res.data || [];
}

async function processEntities(type, endpoint, items) {
    console.log(`\nProcessing ${type}...`);
    if (!state[type]) state[type] = {};
    
    const existing = await getEntities(`${endpoint}?pageSize=100`);
    const slugToId = {};
    existing.forEach(e => {
        if (e.slug) slugToId[e.slug] = e.id;
    });

    for (let item of items) {
        if (!item.slug) continue;
        const cleaned = cleanObject(item);
        if (!cleaned) continue;

        const cached = state[type][item.slug];
        
        if (!isDifferent(cached, cleaned)) {
            console.log(`  Skip: ${item.slug} (No changes)`);
            continue;
        }

        // Ensure PUBLISHED status for all main entities unless explicitly defined
        if (!cleaned.status) cleaned.status = 'PUBLISHED';

        // Hydrate departments and centers for hospitals
        if (type === 'hospitals') {
            if (Array.isArray(cleaned.departments)) {
                cleaned.departments = cleaned.departments.map(item => {
                    let slug = typeof item === 'string' ? item : item.slug;
                    const globalDep = data.departments_catalog?.find(d => d.slug === slug) || {};
                    const localOverrides = typeof item === 'object' ? item : {};
                    
                    if (!globalDep.slug && !localOverrides.slug) return { slug };

                    const resolvedImg = localOverrides.image || (globalDep.suggestedImage !== '__NEEDS_OPERATOR__' ? globalDep.suggestedImage : null);
                    
                    return {
                        slug,
                        name: localOverrides.name || globalDep.name,
                        shortDescription: localOverrides.shortDescription || globalDep.shortDescription,
                        description: localOverrides.description || globalDep.description,
                        image: resolvedImg,
                        ...localOverrides
                    };
                });
            }
            if (Array.isArray(cleaned.centers)) {
                cleaned.centers = cleaned.centers.map(slug => {
                    if (typeof slug === 'string') {
                        const cen = data.centers?.find(c => c.slug === slug);
                        return cen ? { slug: cen.slug, name: cen.name } : { slug };
                    }
                    return slug;
                });
            }
        } else if (type === 'centers') {
            // Map hospitalSlugs to hospitalIds
            if (Array.isArray(cleaned.hospitalSlugs)) {
                const hospitals = await getEntities('/admin/hospitals?pageSize=100');
                cleaned.hospitalIds = cleaned.hospitalSlugs
                    .map(slug => hospitals.find(h => h.slug === slug)?.id)
                    .filter(id => !!id);
                delete cleaned.hospitalSlugs;
            }
        } else if (type === 'doctors') {
            if (cleaned.centerSlug || cleaned.centerSlugs) {
                const centers = await getEntities('/admin/medical-centers?pageSize=100');
                const slugs = cleaned.centerSlugs || [cleaned.centerSlug];
                cleaned.medicalCenterIds = slugs
                    .map(slug => centers.find(c => c.slug === slug)?.id)
                    .filter(id => !!id);
                delete cleaned.centerSlug;
                delete cleaned.centerSlugs;
            }
            if (cleaned.hospitalSlug || cleaned.hospitalSlugs) {
                const hospitals = await getEntities('/admin/hospitals?pageSize=100');
                const slugs = cleaned.hospitalSlugs || [cleaned.hospitalSlug];
                cleaned.hospitalIds = slugs
                    .map(slug => hospitals.find(h => h.slug === slug)?.id)
                    .filter(id => !!id);
                delete cleaned.hospitalSlug;
                delete cleaned.hospitalSlugs;
            }
        }

        try {
            const id = slugToId[item.slug];
            if (id) {
                console.log(`  PATCH: ${item.slug}`);
                await api('PATCH', `${endpoint}/${id}`, cleaned);
            } else {
                console.log(`  POST: ${item.slug}`);
                await api('POST', endpoint, cleaned);
            }
            state[type][item.slug] = cleaned;
            fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
        } catch(e) {
            console.error(`  Error processing ${item.slug}:`, e.message);
        }
    }
}

async function processCleanup() {
    console.log(`\nProcessing Cleanup...`);
    const centers = await getEntities('/admin/medical-centers?pageSize=100');
    const slugToId = {};
    centers.forEach(e => { if (e.slug) slugToId[e.slug] = e.id; });

    const toRemove = data.cleanup_actions?.centers_to_remove_or_reassign || [];
    for (let str of toRemove) {
        const slug = str.split(' ')[0];
        const id = slugToId[slug];
        if (id) {
            try {
                console.log(`  Unpublishing ${slug}...`);
                await api('POST', `/admin/medical-centers/${id}/unpublish`);
                console.log(`  Deleting ${slug}...`);
                await api('DELETE', `/admin/medical-centers/${id}`);
            } catch(e) {
                console.error(`  Error cleaning up ${slug}:`, e.message);
            }
        }
    }
}

async function main() {
    try {
        await processCleanup();
        
        if (data.hospitals) await processEntities('hospitals', '/admin/hospitals', data.hospitals);
        if (data.centers) await processEntities('centers', '/admin/medical-centers', data.centers);
        if (data.doctors && data.doctors.list) await processEntities('doctors', '/admin/doctors', data.doctors.list);
        
        if (data.settings) {
            console.log(`\nProcessing settings...`);
            if (!state.settings) state.settings = {};
            const cleanedSettings = cleanObject(data.settings) || {};
            for (const [k, v] of Object.entries(cleanedSettings)) {
                if (isDifferent(state.settings[k], v)) {
                    try {
                        console.log(`  PATCH setting: ${k}`);
                        await api('PATCH', `/admin/settings/${k}`, { value: v });
                        state.settings[k] = v;
                        fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
                    } catch(e) {
                        console.error(`  Error setting ${k}:`, e.message);
                    }
                }
            }
        }
        
        console.log("\nBatch ingestion complete.");
    } catch(e) {
        console.error("Fatal Error:", e);
    }
}

main();
