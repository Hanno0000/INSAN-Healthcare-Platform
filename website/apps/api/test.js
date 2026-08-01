function clean(obj) {
  if (Array.isArray(obj)) {
    return obj.map(clean);
  }
  if (obj && typeof obj === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
      if (v === '' || v === undefined || v === null) continue;
      if (typeof v === 'object') {
        const cleaned = clean(v);
        if (Array.isArray(cleaned) && cleaned.length === 0) continue;
        if (!Array.isArray(cleaned) && typeof cleaned === 'object' && Object.keys(cleaned).length === 0) continue;
        out[k] = cleaned;
      } else {
        out[k] = v;
      }
    }
    return out;
  }
  return obj;
}

const d = {
  name: { ar: 'Test', en: '' },
  departments: [
    { slug: 'cardio', name: { ar: 'قلب', en: '' }, doctorIds: [] }
  ]
};

const payload = clean({ ...d });
payload.departments = (d.departments?.length ? d.departments : []) || [];
payload.departments = payload.departments.filter(dept => dept && dept.slug);

console.log(JSON.stringify(payload, null, 2));
