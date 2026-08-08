# Contact Directory

> **Status:** **Source of Truth** — the contact details every worker, page, ad,
> artwork and reply must use.
> **Version:** 1.0
> **Date:** 2026-08-05
> **Confirmed by:** the operator, 2026-08-05.

---

## Why this file exists

Contact details were held in two places that **did not agree**, and both were
being read by something that talks to patients:

| | Delta | Future |
|---|---|---|
| `campaign-os/src/Core.gs` — footers and artwork | 01217778869 / 01500668657 | 01122224352 / 01151001177 |
| `receptionist/data/hospitals.json` — patient replies | 040 331 5000–3, 040 332 1774 | *withheld — OCR conflict* |

A patient could read one number in an ad and be given a different one by the
receptionist, on the same day, for the same hospital. Neither source was wrong
about itself; there was simply no answer to *"what is the number?"*

**This file is that answer.** Code and data files may hold copies for runtime
reasons — but this document is what they are copies *of*, and
`campaign-os/tests/cases/contact-directory.js` fails if `Core.gs` drifts from it.

---

## 1. The numbers

### INSAN — the platform

| | |
|---|---|
| **Hotline** | `01500668657` · `01100755556` |
| **WhatsApp** | `01500668657` |
| **WhatsApp link** | https://wa.me/201500668657 |
| **Email** | `info@insan-eg.com` |
| **Website** | https://insan-eg.com |

⚠️ **The email and domain were confirmed by the operator on 2026-08-08**, when
the domain was registered and pointed at the server.

Until that day the website was publishing **`info@lavenir-medical.com`** — the
management company's address, not the platform's — and a Tanta landline this
file had explicitly *not* cleared for publication. Both were live on the
production site. If you find either in any file, it is stale: replace it with
the row above rather than treating it as a second opinion.

### Future Specialized Hospital

| | |
|---|---|
| **Hotline** | `01122224352` · `01151001177` |
| **WhatsApp** | `01151001177` |
| **WhatsApp link** | https://wa.me/201151001177 |

### Delta International Hospital

| | |
|---|---|
| **Hotline** | `01217778869` · `01500668657` |
| **WhatsApp** | `01217778869` |
| **WhatsApp link** | https://wa.me/201217778869 |

---

## 2. ⚠️ How to write a wa.me link

**A wa.me link is not the phone number with the country code glued onto the
front.** The international format **drops the leading zero**:

```
01500668657   →   201500668657      ✅  correct
01500668657   →   2001500668657     ❌  dead link
```

Two of the three links as first supplied carried the extra zero and would have
been dead on **every post they appeared on** — a failure that looks like nothing
at all, because the post publishes normally and only the reader who taps it finds
out.

`Branding.whatsappLink()` derives these from the phone number in code, so the
mistake cannot recur by hand. **Do not hand-write a wa.me link. Derive it.**

---

## 3. Labels, as they appear to a reader

| Element | Arabic |
|---|---|
| Hotline label | `الخط الساخن` |
| WhatsApp label | `للتواصل واتس دوس عاللينك` |
| Separator between two numbers | ` - ` |

---

## 4. Open question for the operator

`01500668657` is listed for **both INSAN and Delta**.

If that is deliberate — one platform line answering for both — nothing needs to
change and this note can be deleted. If it is a copy-and-paste from when the
platform line was the only line, Delta's second number needs correcting.

<!-- NEEDS-OPERATOR: confirm whether 01500668657 serving both INSAN and Delta is intended. -->

**The 040 landlines** in `receptionist/data/hospitals.json` (Delta: 040 331 5000
through 5003, and 040 332 1774) are a Tanta area code and were read from the
hospital's own building document. They are plausibly real, and plausibly the
switchboard rather than the marketing hotline. They are **not** listed above
because the operator confirmed the mobile hotlines, not these.

<!-- NEEDS-OPERATOR: are the 040 landlines a public switchboard the receptionist may give out, or internal? -->

---

## 5. Who reads this

| Consumer | What it takes |
|---|---|
| **Campaign posts** — `PostFooter` | The hotline line and the WhatsApp line, appended to published copy |
| **Artwork** — `Branding` / `TextOverlay` | The contact band drawn onto the image |
| **Paid ads** — W10 | The destination a click resolves to |
| **The receptionist** | What it gives a patient who asks how to reach the hospital |
| **The website** | Contact pages, headers, footers |

A change here is a change to all five. That is the point of having one file.
