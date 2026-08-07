// EntityRegistry.parse — the single list of what the ecosystem contains.
//
// Three systems described the same business and agreed on 18% of it. The
// registry is the fix, and it is parsed by machine, which makes its table
// format load-bearing: a malformed row is a silently dropped entity, which is
// exactly the failure the file exists to prevent.
//
// Checked against the real ENTITY_REGISTRY.md, so a careless edit to the table
// fails here rather than in front of the operator.

module.exports = {
  name: 'entity registry',

  run(t, fx) {
    const content = fx.repoFile('business/brand/ENTITY_REGISTRY.md');
    const parsed = EntityRegistry.parse(content);
    const e = parsed.entities;

    t.is(parsed.malformed, [], 'no row in the registry fails to parse');
    t.is(e.length, 28, 'the registry lists 28 entities');

    // --- the levels, against MEDICAL_SERVICES_TAXONOMY §2 ---
    const byLevel = (level) => e.filter((x) => x.level === level).length;

    // ⚠️ SIXTEEN, and two brand documents still say twelve.
    //
    // The count has moved three times — twelve, then fourteen on 2026-08-06,
    // then sixteen on 2026-08-07 when Women's & Children's Health was split and
    // a fourth surgical centre registered. Both brand documents that state a
    // count have never been updated:
    //
    //   MASTER_BRAND_ARCHITECTURE.md:128   "Operates All 12 Medical Centers"
    //   MEDICAL_SERVICES_TAXONOMY.md:186   "One of the twelve Medical Centers"
    //
    // Every content worker loads MASTER_BRAND_ARCHITECTURE, so they are being
    // told twelve while the registry the website and receptionist read says
    // sixteen. Which number is right is the brand owner's answer, not this
    // file's — the count is pinned here so the disagreement is visible instead
    // of each side quietly believing itself.
    //
    // That it has drifted twice more since being pinned is the argument for
    // pinning it: each move was made in one system without the others.
    t.is(byLevel('CENTER'), 16,
      'sixteen Medical Centers in the registry — while the brand architecture ' +
      'and the taxonomy both still say twelve');
    t.is(byLevel('DEPARTMENT'), 6, 'six Departments');
    t.is(byLevel('HOSPITAL'), 2, 'two Hospitals');
    t.is(byLevel('PROGRAM'), 4, 'four Programs');

    // --- ids ---
    const ids = e.map((x) => x.id);
    t.is(ids.length, new Set(ids).size, 'every entity id is unique');
    t.ok(e.every((x) => /^(MED|CEN|HOSP|PROG)-\d{3}$/.test(x.id)),
      'every id follows the registry format');
    t.ok(e.every((x) => x.nameEn && x.nameAr),
      'every entity is named in both languages');
    t.ok(e.every((x) => x.line > 0), 'every entity knows which line it came from');

    // --- the join key ---
    const icu = e.filter((x) => x.id === 'MED-001')[0];
    t.is(icu.nameEn, 'Intensive Care Unit', 'MED-001 is the ICU');
    t.is(icu.level, 'DEPARTMENT', 'and it is a Department, not a Center');
    t.is(icu.campaignName, 'Critical Care Center',
      'while the campaign it is filed under is called Critical Care Center — ' +
      'both statements stand, which is the whole reason campaign_name exists');

    // The em dash means "registered and real, no campaign scheduled". It must
    // become an empty string, not the literal dash, or the checker will look
    // for a campaign called "—".
    const unscheduled = e.filter((x) => x.campaignName === '');
    t.ok(unscheduled.length > 0, 'some entities are registered with no campaign');
    t.is(e.filter((x) => x.campaignName === EntityRegistry.EMPTY).length, 0,
      'the empty marker never survives as a campaign name');

    const orRooms = e.filter((x) => x.id === 'MED-003')[0];
    t.is(orRooms.campaignName, '', 'Operating Rooms is registered with no campaign');

    // --- the knowledge base and the registry must agree on the join key ---
    // A knowledge file whose campaign_name is not in the registry is filed under
    // a name the business does not list.
    const registered = e.map((x) => x.campaignName).filter(Boolean);
    const icuFm = CardBuilder.parseFrontMatter(
      fx.repoFile('business/knowledge/departments/MEDICAL_DEPARTMENT_ICU.md'));

    // The join key, in the two places this repository owns.
    //
    // Renaming a campaign is a THREE-place change: the knowledge file, this
    // registry, and every existing Content Calendar row. The V2 rewrite on
    // 2026-08-06 did one of the three — the file said "Critical Care Center"
    // while the registry and nine live calendar rows said "ICU Center", which
    // orphans the card: every field correct, joined to nothing, and the twelve
    // strategy fields arriving blank. KNOWLEDGE_BASE_SPEC §4.1 is about exactly
    // this, and it is the defect that cost 67% of rows their strategy once.
    //
    // Two of the three are aligned here on 2026-08-07. The third is the live
    // sheet and only the operator can change it — which is why the sheet-side
    // check is `Check Knowledge File`, and why it reports slot counts.
    t.includes(registered, CardBuilder.campaignNameFor(icuFm),
      "the ICU knowledge file's campaign name is one the registry lists");

    const kabarona = CardBuilder.parseFrontMatter(
      fx.repoFile('business/knowledge/programs/PROGRAM_KABARONA.md'));
    t.includes(registered, CardBuilder.campaignNameFor(kabarona),
      "Kabarona's campaign name is one the registry lists");

    // --- parser robustness ---
    t.is(EntityRegistry.parse('').entities, [], 'empty content yields no entities');
    t.is(EntityRegistry.parse(null).entities, [], 'null content yields no entities');

    t.is(EntityRegistry.parse(
      '| ID | Entity (EN) | Entity (AR) | Level | Campaign Name | Hospitals |\n' +
      '|---|---|---|---|---|---|\n'
    ).entities, [], 'a header and separator alone are not entities');

    // A row that looks like a registry entry but carries no id is reported
    // rather than skipped — that is the silently-dropped-entity failure.
    const broken = EntityRegistry.parse(
      '| MED-01X | Something | شيء | DEPARTMENT | — | Future |\n'
    );
    t.is(broken.entities, [], 'a malformed id produces no entity');
    t.is(broken.malformed.length, 1, 'and is reported as malformed rather than ignored');

    // The divergence tables further down the file have a different column count
    // and must not be read as entities.
    t.is(EntityRegistry.parse('| a | b | c |\n').entities, [],
      'a three-column table is not an entity table');
  }
};
