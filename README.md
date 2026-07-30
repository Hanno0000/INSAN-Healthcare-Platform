# INSAN Healthcare Platform

Egyptian Healthcare Ecosystem - Digital Identity & Marketing Infrastructure

> ## → Start at [`campaign-os/docs/START_HERE.md`](campaign-os/docs/START_HERE.md)
>
> That file is the entry point. It explains the business, the system and where the
> work currently stands, and it sets the order to read everything else in.
>
> **Do not start from this README.** It is a one-screen index and the links under
> "Quick Reference" below are older than the documents they point at.

## Project Structure

```
INSAN/
├── campaign-os/     ← Google Apps Script AI Operating System
├── website/         ← INSAN Website (specs + assets)
├── business/        ← Business Documentation & Strategy
├── assets/          ← Generated Visual Assets
└── archive/         ← Deprecated/Superseded Files
```

## Products

### 1. Campaign OS (Google Apps Script)
AI-powered content production system for social media campaigns.
- Source code, prompts, and system documentation
- Two-pipeline architecture: Content Pipeline + Visual Pipeline
- Workers: Strategy, Creation, Creative Director, Visual Planner, Visual QA
- Services: Media Generation, Publishing

### 2. INSAN Website
Corporate website for the healthcare ecosystem.
- Full specification suite (18 documents)
- Tech stack: Next.js + NestJS + PostgreSQL + Prisma
- Currently in documentation phase (no source code yet)

### 3. Business Documentation
Strategic and brand documentation.
- Master Brand Architecture
- AI Creative Constitution
- Platform Knowledge Base
- Project Roadmap & Decisions

## Quick Reference

- **Entry point:** `campaign-os/docs/START_HERE.md` ← read this first
- **Where the work stands:** `campaign-os/docs/START_HERE.md` §6
- **Brand Architecture:** `business/brand/MASTER_BRAND_ARCHITECTURE.md` *(governs everything)*
- **System Architecture:** `campaign-os/docs/SYSTEM_ARCHITECTURE.md`
- **Worker contracts:** `campaign-os/docs/architecture/WORKER_CONTRACTS_V2.md`
- **Knowledge base spec:** `business/knowledge/KNOWLEDGE_BASE_SPEC.md`
- **Website:** `website/Docs/CURRENT_STATE.md` *(separate project)*
- **Project Roadmap:** `business/strategy/PROJECT_ROADMAP.md`
