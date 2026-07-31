# Facility Photo Inventory

> **Date:** 2026-07-31
> **Source:** `Services/Pics/WhatsApp Unknown 2026-07-29 at 09.33.40.zip` — 95 files
> **Status:** Current. The zip is left in place unchanged; everything below is a copy.

---

## What happened

The archive held **95 files, of which 15 are byte-identical duplicates** — 80 distinct
photographs. Every one was viewed and classified by what it shows, not by its filename
(the originals are all `WhatsApp Image 2026-07-27 at 19.07.18 (3).jpeg` and carry no
information).

All photographs appear to be **Future Specialized Hospital** — the five exterior shots
carry its signage, and a CT console screen reads `FUTURE HOSPITAL`. **No Delta
International Hospital photograph is present.**

Eleven domains were added to `CONFIG.PROJECT_ASSETS.DOMAINS` on the same day so that
the 44 photographs with nowhere to go became reachable. **78 of the 80 are now filed in
a folder the loader resolves; 2 are deliberately withheld (§3).**

---

## 1. Where the photographs are

### `Services/` — clinical

| Folder | Photos | What they show |
|---|---|---|
| **Inpatient Rooms** *(new)* | **19** | Patient rooms and suites, with and without bedside monitors — the largest group |
| Operating Room | 8 | Two theatres, laparoscopy tower, C-arm, anaesthesia machines, scrub area, suite entrance |
| Radiology Department | 7 | GE CT scanner, control console, unit signage |
| Outpatient Clinic | 9 | Consultation rooms, clinic door signs (Neurology, ENT), ENT treatment unit |
| Emergency Department | 3 | Curtained exam bays, treatment room with oxygen and emergency trolley |
| Neonatal Intensive Care Unit | 3 | Entrance signage, preparation and equipment areas |
| **Dental Center** *(new)* | 3 | Two dental operatories |
| Intensive Care Unit | 2 | Isolation-room door sign, ICU bay with numbered beds and ventilator |
| **Sterilization** *(new)* | 1 | Disinfection room with labelled soaking boxes |
| **Intermediate Care Unit** *(new)* | 1 | `الرعاية المتوسطة` signage |
| **Dialysis Unit** *(new)* | 1 | Haemodialysis machine and RO water unit |
| **Diagnostics** *(new)* | 1 | Ultrasound and ECG units |
| Laboratory | **0** | ⚠️ nothing in the archive |
| Physiotherapy | **0** | ⚠️ nothing in the archive |
| Pharmacy | — | ⚠️ folder does not exist; nothing in the archive |

### `Facility/` — non-clinical *(new top-level folder)*

| Folder | Photos | What they show |
|---|---|---|
| Hospital Exterior | 5 | Future Hospital facade and main entrance |
| Reception & Waiting | 4 | Ground-floor lobby and counter, family lounge, clinic waiting bench |
| Support Services | 4 | Industrial laundry, oxygen manifold and compressor plant rooms |
| Administration | 4 | Chairman's corridor, meeting room, office |
| Nursing Stations | 3 | Staff desks facing curtained bays |

⚠️ **Laboratory, Physiotherapy and Pharmacy remain without a single reference
photograph.** A brief naming any of them falls back to AI generation silently. They are
the next thing worth photographing.

---

## 2. The keyword rules these folders depend on

`DriveLoader.resolveAssetDomain` matches by **plain substring, with no word boundary**,
and the first domain in the list that hits wins. That makes a badly chosen keyword
actively harmful rather than merely useless. Four traps were found and avoided:

| Keyword that looks reasonable | What it would also match |
|---|---|
| `ward` | "a**ward**-winning" |
| `dental` | "acci**dental**" |
| `management` | "Pain **Management** Center" |
| `building` | "**building** trust" — a phrase this brand uses constantly |
| `غسيل` | "**غسيل** الكلى" — dialysis, not laundry |

Each is written as a compound phrase instead. Order also matters: `dialysis` sits ahead
of `support-services`, `diagnostics` ahead of `radiology` (which claims the generic word
"imaging"), and `reception-waiting` ahead of `outpatient-clinic` — `reception` was moved
off the outpatient domain, because "clinic reception" should resolve to the lobby, not a
consulting room.

The resolver was exercised against all of the above and 22 cases pass. **That check is
not committed anywhere** — see the note in `START_HERE.md` about test coverage.

---

## 3. Withheld — 2 photographs

`_Unmapped/RESTRICTED-patients-visible/` holds two NICU photographs in which
**newborn patients are identifiable**.

They are kept outside every folder the loader can reach, on purpose. A reference image
feeds image generation, and a generated image derived from a real patient photograph is
not something that can be withdrawn after publication. Using them needs documented
consent from the families — a decision for the operator, and not one the system should
be able to make by accident.

---

## 4. Two questions for the entity registry

**Dialysis.** `Services/Dialysis Unit` shows a working haemodialysis station. Dialysis
appears nowhere in `ENTITY_REGISTRY.md` — not among the twelve Medical Centers, not
among the registered Departments. The registry's own rule is that an entity not in the
file does not exist, so either the registry is missing a real service or these photos
belong to another entity.

**Intermediate care.** `الرعاية المتوسطة` is signposted as its own unit. It is neither
ICU (MED-001) nor a general ward. Same question.

Both are brand-owner decisions, listed alongside the other divergences in
`ENTITY_REGISTRY.md` §Divergences.

---

## Maintenance

Add new photographs to the folder whose domain matches, and name them for what they
show. If no domain matches, **add the domain to `CONFIG.gs` first** — a folder that is
not in `PROJECT_ASSETS.DOMAINS` is invisible to the system no matter what it contains,
and that invisibility is silent.

After editing `CONFIG.gs`, the file has to be pasted into the Apps Script editor before
any of this takes effect.

*End of Photo Inventory.*
