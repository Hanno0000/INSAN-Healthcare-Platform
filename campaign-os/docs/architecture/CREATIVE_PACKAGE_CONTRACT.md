# Creative Package Contract

INSAN Healthcare AI Operating System

Version: 2.0
Status: Sprint 1 — Step 2 Complete
Date: July 2026

---

## Purpose

This contract defines the Creative Director as the Final Creative Authority and the Creative Package Owner. It removes ambiguity about who owns every creative decision before visual production begins.

## Governing Rule

The **Creative Director is the sole final creative authority and the Creative Package Owner**.

No downstream Visual Pipeline component may create, reinterpret, improve, rewrite, or expand the approved Creative Package. It may only validate readiness, execute production, validate fidelity, and publish.

## Lifecycle and Authority

| Stage | Component | Authority |
|---|---|---|
| Strategic proposal | Content Strategy Worker | Proposes strategy and initial visual direction (first draft) |
| Draft production | Content Creation Worker | Produces draft copy, hashtags, and draft design prompt |
| Final creative approval | Creative Director Worker | Owns the final approved version of the complete Creative Package |
| Production readiness | Visual Planner | Validates completeness and prepares execution plan |
| Asset execution | Media Generation Service | Executes the approved package only |
| Fidelity validation | Visual QA | Approves, rejects, or requests a new production attempt against the approved package |

## Canonical Creative Package

When the Creative Director sets `Creative Director Review Status` to `Approved`, these are the final source-of-truth fields for visual production:

### Strategy Refinement (may be refined from Content Strategy proposal)

- Content Objective
- Content Angle
- Content Type
- Content Format
- Content Funnel Stage
- Hook
- Post Structure
- Language Style
- Emoji Style

### Visual Creative Package (may be refined from Content Strategy proposal)

- Visual Concept
- Visual Focus
- Visual Priority
- Design Mood
- Composition
- Visual Elements
- Do NOT Show
- Text On Design
- Design Notes

### Content Refinement (final version from Content Creation draft)

- Creative Director Post Copy (final post copy)
- Primary Hashtags
- Secondary Hashtags

### Design Prompt (final production instruction)

- Creative Director Design Prompt

The Content Strategy and Content Creation outputs remain drafts until the Creative Director approves the row. They are not an independent creative authority after that point.

## Transfer Rule

Only rows with an approved Creative Director decision may transfer to Visual Pipeline Section A.

The transfer must use the final Creative Director outputs for all creative fields. Section A remains read-only to every visual component.

## Non-Negotiable Boundaries

1. The Visual Planner can report a missing or contradictory field but cannot fill it creatively.
2. The Media Generation Service cannot alter the supplied creative direction to improve an asset.
3. Visual QA evaluates fidelity; it cannot redesign an asset or replace the Creative Package.
4. Any creative correction after approval returns to the Creative Director; it never happens inside the Visual Pipeline.

## Implementation Status

1. Creative Director prompt aligned with this contract — COMPLETE (V2)
2. Worker configuration and transfer mapping aligned — COMPLETE
3. Visual worker prompts aligned — COMPLETE (V9.0)
