# Validation Run #002 — Evaluation Checklist

> **Purpose:** Turn one paid run into a decision, not an impression.
> **Date created:** 2026-07-27
> **Closes:** TD-005 (End-to-End Validation Checklist)
> **Status:** **Historical** — the run it was written for has not happened.
> Superseded by START_HERE.md §6.4. See docs/DOCUMENT_STATUS.md.

---

## Why this exists

Validation Run #001 reviewed two rows and produced twenty findings, all handled
by editing prompts. Several of those defects were still reaching production
afterwards, because they lived in code, not in prompt text — and because the
worker meant to catch them could not see what it was judging.

This run answers one question:

> **Did the Sprint 3 fixes work?**

Not "is the output good". That question is too broad to answer from five rows and
will pull the review toward taste. The fixes were specific and their effects are
observable. Check those first; judge quality second.

---

## Before Running

| # | Step | Done |
|---|---|---|
| 1 | All 9 `.gs` files copied to Apps Script | ☐ |
| 2 | `Maintenance → Unblock Dropdowns` executed once | ☐ |
| 3 | `Maintenance → Preflight Check` reports no problems | ☐ |
| 4 | `Refresh Cache` executed — **required**, prompts cache for 6 hours | ☐ |
| 5 | 3–5 rows selected, mixing at least one Static and one Carousel | ☐ |
| 6 | At least one row with `Language Style = Egyptian Medical Friendly` | ☐ |
| 7 | At least one row with a non-empty `Text On Design` | ☐ |

Row diversity matters. A run of five Carousels tests one path.

---

## Part A — Did the specific fixes hold?

Each line is a defect that was confirmed present before this sprint. Any ✗ means
the fix did not take.

### Generation

| # | Check | Where to look | Pass |
|---|---|---|---|
| A1 | No image contains `Slide`, `شريحة`, `Card`, or a bare card number | The artwork | ☐ |
| A2 | Cards in a carousel show **different scenes**, not variations of one | Compare assets side by side | ☐ |
| A3 | Each card's visible text differs and matches its position in `Text On Design` | Artwork vs sheet | ☐ |
| A4 | No `INSAN` / hospital name / invented logo rendered anywhere | The artwork | ☐ |
| A5 | Rendered text matches `Text On Design` **word for word** | Artwork vs sheet | ☐ |
| A6 | No text appears twice in one image | The artwork | ☐ |
| A7 | Arabic letterforms connected, correctly shaped, not mirrored | The artwork | ☐ |
| A8 | Output is final artwork — no mockup, device frame, or presentation board | The artwork | ☐ |
| A9 | Setting reads as Egyptian, without relying on a flag or landmark | The artwork | ☐ |
| A10 | A human moment is visible — not people standing in a room | The artwork | ☐ |

### Visual QA

| # | Check | Where to look | Pass |
|---|---|---|---|
| A11 | Notes open with a literal description of the artwork | `Visual QA Notes` | ☐ |
| A12 | Notes transcribe the rendered text in quotation marks | `Visual QA Notes` | ☐ |
| A13 | Notes are **not** a paraphrase of the Design Prompt | Compare notes to prompt | ☐ |
| A14 | `Visual QA Decision` is exactly `Approved` / `Revision Required` / `Rejected` | The cell | ☐ |
| A15 | Scores are not uniformly A+ | `Visual QA Score` across rows | ☐ |
| A16 | Where a defect exists, QA found it | Your own read vs QA verdict | ☐ |

> **A16 is the most important line in this document.** Look at each asset
> yourself first, write down what is wrong with it, and only then read the QA
> notes. If QA missed something you spotted in seconds, the model — not the
> prompt — is the constraint, and Claude for Visual QA moves to the top of the
> list.

### Pipeline

| # | Check | Where to look | Pass |
|---|---|---|---|
| A17 | No row halted on a data validation error | `Execution Log` | ☐ |
| A18 | `Reference Asset Package` contains scene direction, not status lines | The cell | ☐ |
| A19 | No row exceeded 3 revision cycles | `Execution Log` | ☐ |
| A20 | Partial generations recorded as `PARTIAL (n/m)`, not `SUCCESS` | `Generation Status` | ☐ |

### Content

| # | Check | Where to look | Pass |
|---|---|---|---|
| A21 | Copy opens on a scene, not a claim or rhetorical question | First two lines | ☐ |
| A22 | No MSA markers: `الذي` `هذا` `ليس` `سوف` `يتم` `حيث` `لماذا` `الآن` | The copy | ☐ |
| A23 | `Modern Professional` rows are still Egyptian, not formal Arabic | The copy | ☐ |
| A24 | Brand appears once, in the second half | The copy | ☐ |
| A25 | Copy serves the row's own `Target Audience`, not a generic reader | Copy vs the field | ☐ |
| A26 | Visual fields are in English; `Text On Design` is in the campaign language | The sheet | ☐ |

---

## Part B — Is it good?

Only after Part A. If Part A is failing, Part B measures the wrong thing.

For each asset, one line each:

- Would you publish this without edits? **Yes / Minor fix / No**
- Would this stop your thumb in a feed?
- Does it look designed, or does it look generated?
- Is it noticeably better than the run before?

For each post:

- Would an Egyptian read this aloud without stumbling?
- Does it sound like a person or like a brand?
- Does the primary audience get what they came for?

---

## Part C — The decision

Count Part A.

**18+ of 26 pass** — the fixes worked. Remaining problems are quality, not
integrity. Next lever is model selection: Claude for Creative Director and
Visual QA, and only then a different image model.

**10–17 pass** — mixed. Identify which specific checks failed and address those
before spending another run. Do not change models yet; you would be tuning on
top of a defect.

**Under 10** — something did not deploy. Confirm the `.gs` files reached Apps
Script and that `Refresh Cache` actually ran before concluding anything about
quality.

**Any Part A failure that is also a Production Hard Gate** — A1, A4, A5, A6, A7,
A8 — is a blocker regardless of the total. Those are the defects that reach the
public.

---

## After the run

1. Record every Part A ✗ as a numbered finding with the asset it came from.
2. `Maintenance → Review Vocabulary Gaps` → update `SYSTEM_CONSTANTS.md` and
   `CONFIG.CONTROLLED_VOCABULARY` from real evidence.
3. Update `CURRENT_STATE.md` with the outcome — **including what still fails.**
4. Only then decide on model changes.

Close this sprint on evidence from output. Not on a review of instructions.
