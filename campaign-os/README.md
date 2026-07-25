# Campaign OS

Google Apps Script AI Operating System for INSAN Healthcare

## Overview

Automated content production system that transforms strategic content into publishable social media assets using AI Workers.

## Architecture

Two-Pipeline System:
1. **Content Pipeline** - Editorial: Strategy → Creation → Creative Direction
2. **Visual Pipeline** - Production: Planning → Generation → QA → Publishing

## Structure

```
campaign-os/
├── src/                    ← Google Apps Script source code
│   ├── CONFIG.gs           ← Central configuration
│   ├── WorkerRunner.gs     ← Menu & batch execution
│   ├── ServiceRunner.gs    ← Media Generation service
│   ├── ControlCenter.*     ← Production Control Center UI
│   └── ...                 ← Other modules
├── prompts/
│   ├── content/            ← Content pipeline prompts
│   └── visual/             ← Visual pipeline prompts
├── visual-assets/          ← Generated assets (Google Drive)
│   ├── Generated/
│   ├── Approved/
│   ├── Rejected/
│   ├── Published/
│   └── Archive/
└── docs/
    ├── architecture/       ← System design documents
    ├── constants/          ← Controlled vocabulary
    ├── roadmap/            ← Implementation plan
    └── tasks/              ← Engineering tasks
```

## Workers

| Worker | Pipeline | Purpose |
|--------|----------|---------|
| Content Strategy | Content | Editorial planning |
| Content Creation | Content | Copy writing |
| Creative Director | Content | Quality review & approval |
| Visual Planner | Visual | Production readiness validation |
| Visual QA | Visual | Asset quality validation |

## Services

| Service | Purpose |
|---------|---------|
| Media Generation | AI image generation via Gemini API |
| Publishing | Facebook page publishing (reserved) |

## Configuration

All configuration is in `src/CONFIG.gs`:
- Spreadsheet tab names
- Google Drive folder IDs
- AI model settings
- Worker configurations
- Controlled vocabulary
