// DriveLoader.resolveAssetDomain — which folder of real photographs a row gets.
//
// Matching is plain substring with no word boundary and first-hit-wins, so the
// interesting cases are not the ones that match. They are the words that must
// NOT match: 'ward' inside "award", 'dental' inside "accidental", 'management'
// inside "Pain Management Center". Those are the checks worth keeping.

module.exports = {
  name: 'asset domains',

  run(t) {
    const domain = (text) => {
      const d = DriveLoader.resolveAssetDomain({ 'Visual Concept': text });
      return d ? d.key : null;
    };

    // --- the ordinary cases ---
    t.is(domain('ICU Center'), 'icu', 'ICU Center resolves to the ICU folder');
    t.is(domain('Emergency Center'), 'emergency', 'Emergency resolves');
    t.is(domain('Dental Center'), 'dental', 'Dental Center resolves');
    t.is(domain('ct scan of the chest'), 'radiology', 'CT resolves to radiology');
    t.is(domain('patient room comfort'), 'inpatient-room', 'patient room resolves');
    t.is(domain('nursing station handover'), 'nursing-station', 'nursing station resolves');
    t.is(domain('حضانة الأطفال'), 'nicu', 'Arabic NICU resolves');
    t.is(domain('عمليات جراحية'), 'operating-room', 'Arabic surgery resolves');
    t.is(domain('غرفة المريض'), 'inpatient-room', 'Arabic patient room resolves');
    t.is(domain('واجهة المستشفى'), 'hospital-exterior', 'Arabic facade resolves');
    t.is(domain('الرعاية المتوسطة'), 'intermediate-care', 'Arabic intermediate care resolves');
    t.is(domain('مجلس الإدارة'), 'administration', 'Arabic board resolves');
    t.is(domain('تعقيم الأدوات'), 'sterilization', 'Arabic sterilization resolves');

    // --- the substring traps: each of these must NOT match ---
    t.is(domain('award-winning care team'), null,
      '"award" does not resolve to the inpatient ward');
    t.is(domain('accidental injury prevention'), null,
      '"accidental" does not resolve to the dental centre');
    t.is(domain('Pain Management Center'), null,
      '"Management" does not resolve to the administration offices');
    t.is(domain('building trust with families'), null,
      '"building trust" does not resolve to a photograph of the facade');

    // --- ordering: first hit wins, so these prove the list order ---
    t.is(domain('غسيل الكلى للمرضى'), 'dialysis',
      'غسيل الكلى is dialysis, not the laundry');
    t.is(domain('المغسلة ونظافة الملابس'), 'support-services',
      'the laundry is still reachable on its own words');
    t.is(domain('ultrasound imaging'), 'diagnostics',
      'ultrasound wins over radiology, which owns the generic word "imaging"');
    t.is(domain('clinic reception desk'), 'reception-waiting',
      'a clinic reception is the lobby, not a consulting room');
    t.is(domain('outpatient consultation'), 'outpatient-clinic',
      'an outpatient consultation is still the clinic');

    // --- structural: the list itself ---
    const domains = CONFIG.PROJECT_ASSETS.DOMAINS;
    const keys = domains.map((d) => d.key);

    t.is(keys.length, new Set(keys).size, 'every domain key is unique');
    t.is(domains.filter((d) => !d.folder).length, 0, 'every domain names a folder');
    t.is(domains.filter((d) => !d.keywords || !d.keywords.length).length, 0,
      'every domain has at least one keyword');
    t.is(domains.filter((d) => d.keywords.some((k) => !String(k).trim())).length, 0,
      'no domain carries an empty keyword, which would match every row');

    // A keyword that is a prefix of an earlier domain's keyword can never fire.
    const unreachable = [];
    for (let i = 0; i < domains.length; i++) {
      for (const kw of domains[i].keywords) {
        for (let j = 0; j < i; j++) {
          if (domains[j].keywords.some((earlier) => kw.indexOf(earlier) !== -1)) {
            unreachable.push(`${domains[i].key}:"${kw}" is shadowed by ${domains[j].key}`);
          }
        }
      }
    }
    t.is(unreachable, [], 'no keyword is unreachable behind an earlier domain');
  }
};
