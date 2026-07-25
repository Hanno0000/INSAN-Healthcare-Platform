# INSAN Visual Language Specification

Campaign OS — Canonical Visual Identity Reference

Version: 1.0
Status: Active
Date: July 2026

---

## Purpose

This document defines the official visual identity for all AI-generated media in the INSAN Healthcare ecosystem. Every generated asset must conform to this standard. No exceptions.

---

## Visual Identity

### Philosophy

INSAN visual content is **designed artwork**, not fake photography.

The visual identity aims for a premium editorial aesthetic that communicates human warmth, healthcare professionalism, and Egyptian healthcare environment.

### Goals

- Human warmth
- Premium healthcare branding
- Egyptian healthcare environment
- Modern composition
- Soft realistic rendering
- Social-media friendly
- Clearly designed artwork rather than fake photography

---

## Style Ratio

All generated media must follow this approximate style distribution:

| Style | Ratio | Description |
|---|---|---|
| Stylized Realism | 70% | Realistic forms with artistic interpretation. Not photorealistic. |
| Semi-Realistic Editorial Illustration | 20% | Illustrated editorial style with realistic proportions. |
| 3D Matte Illustration | 10% | Soft 3D rendered elements for depth and premium feel. |

### How to Apply the Ratio

- The dominant style (70%) should be **stylized realism** — forms that look real but are clearly artwork.
- Supporting elements (20%) may use **editorial illustration** — illustrated style common in premium healthcare branding.
- Accent elements (10%) may use **3D matte** — soft rendered depth for premium feel.
- The overall composition should feel like a **single unified artwork**, not a collage of styles.

---

## Style Guidelines

Every generated image must embody these characteristics:

| Guideline | Description |
|---|---|
| Modern composition | Clean layouts, balanced negative space, contemporary design |
| Soft realistic rendering | Smooth gradients, natural lighting, gentle shadows |
| Social-media friendly | Optimized for feed visibility, thumb-stopping quality |
| Clearly designed artwork | Obvious artistic intention, not accidental realism |
| Premium healthcare branding | Elevated aesthetic, trustworthy, professional |
| Egyptian healthcare environment | Authentic cultural context, local relevance |
| Human warmth | Emotional connection, empathy, care |

---

## Strictly Prohibited Styles

The following styles are **never acceptable** for INSAN visual content:

| Prohibited Style | Reason |
|---|---|
| Cartoon style | Undermines healthcare credibility |
| Anime | Inconsistent with premium branding |
| Pixar | Inconsistent with professional healthcare tone |
| Comic-book style | Undermines medical seriousness |
| Hyper-realistic AI photography | Creates uncanny valley, damages trust |
| Uncanny faces | Destroys human connection |
| Plastic skin | Signals artificiality, reduces authenticity |
| Obvious AI artifacts | Damages brand credibility |

---

## Application by Content Type

### Static Image

Apply the full style ratio. Single composition must balance all three style elements.

### Carousel

Each slide must maintain visual consistency across the set. Style ratio applies to the overall series, not per-slide.

### Story

Vertical format (9:16). Style ratio applies. Prioritize mobile readability and thumb-stopping quality.

### Reel

Vertical format (9:16). Style ratio applies. Prioritize motion-friendly compositions.

### Infographic

Data visualization style. May lean more toward editorial illustration (20%) for clarity.

---

## Quality Criteria

Every generated image must satisfy:

1. **Style compliance** — Matches the 70/20/10 style ratio
2. **No prohibited elements** — Zero instances of forbidden styles
3. **Human warmth** — Emotional connection is present
4. **Healthcare credibility** — Professional, trustworthy appearance
5. **Cultural authenticity** — Egyptian healthcare environment
6. **Technical quality** — Correct resolution, aspect ratio, format
7. **Brand consistency** — Aligns with INSAN visual identity

---

## Integration Points

This specification is referenced by:

- **Visual Planner Worker** — Uses style guidelines when preparing generation briefs
- **Media Generation Service** — Applies style guidelines during image generation
- **Visual QA Worker** — Validates generated images against style criteria
- **CONFIG.gs** — `VISUAL_LANGUAGE` object contains machine-readable version

---

## Version History

| Version | Date | Change |
|---|---|---|
| 1.0 | July 2026 | Initial visual language definition |

---

End of INSAN Visual Language Specification.
