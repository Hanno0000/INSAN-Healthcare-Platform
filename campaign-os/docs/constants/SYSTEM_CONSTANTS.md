
## Purpose
This file contains the controlled vocabulary and operating constants used by all AI Workers in the INSAN Content System.

Any AI Worker must use the exact approved values below.
No synonyms.
No alternate spellings.
No creative rewording inside controlled fields.

---

## Controlled Vocabulary

### Publishing Page
- INSAN
- Future
- Delta

### Content Objective
- Build Trust
- Educate
- Showcase Service
- Generate Awareness
- Humanize Brand
- Social Proof
- Drive Engagement
- Increase Bookings
- Promote Program
- Strengthen Brand

### Content Type
- Educational
- Promotional
- Storytelling
- Behind The Scenes
- Doctor Spotlight
- Patient Story
- Medical Service
- Myth vs Fact
- FAQ
- Health Tips
- Announcement
- Community
- Campaign

### Content Format
- Static
- Carousel
- Reel
- Video
- Story
- Motion Graphic
- Infographic

### Content Funnel Stage
- Awareness
- Interest
- Consideration
- Trust
- Decision
- Retention
- Advocacy

### Language Style
- Egyptian Medical Friendly
- Modern Professional
- Educational
- Formal Arabic

### Emoji Style
- Minimal
- Balanced
- Friendly
- Professional
- None

### Visual Focus
- Doctor
- Patient
- Family
- Medical Team
- Medical Procedure
- Medical Equipment
- Facility
- Service
- Emotion

### Visual Priority
- Doctor
- Patient
- Equipment
- Family
- Facility
- Procedure
- Brand

### Design Mood
- Trust
- Hope
- Comfort
- Professional
- Premium
- Urgent
- Calm
- Human
- Educational
- Inspirational

### Composition
- Portrait
- Landscape
- Close-up
- Wide
- Split Scene
- Lifestyle
- Infographic
- Carousel Layout
- Hero Shot

### AI Worker
- CONTENT_STRATEGY_WORKER
- CONTENT_CREATION_WORKER
- CREATIVE_DIRECTOR_WORKER
- VISUAL_PLANNER_WORKER
- VISUAL_QA_WORKER
- MEDIA_GENERATION_SERVICE

### Quality Score
- A+
- A
- B+
- B
- C
- Needs Rewrite

### CTA
- Book Now
- Contact Us
- Call Now
- Learn More
- Send Message
- Visit Hospital
- Read More
- Save Post
- Share Post

### Post Structure
- PAS
- AIDA
- Problem to Solution
- Question to Answer
- Storytelling
- Educational
- Listicle
- Before to After

### Production Mode
- PROJECT_ASSET
- AI_GENERATED

### Visual Language Style
- Stylized Realism
- Semi-Realistic Editorial Illustration
- 3D Matte Illustration

---

## Worker Ownership

### Content Strategy Worker writes (proposes first version):
- Publishing Date
- Publishing Page
- Calendar ID
- Campaign Group
- Campaign Name
- Hospital Brand
- Content Objective
- Content Angle
- Content Type
- Content Format
- Content Funnel Stage
- Hook
- Post Structure
- CTA
- Language Style
- Emoji Style
- Visual Concept
- Visual Focus
- Visual Priority
- Design Mood
- Composition
- Visual Elements
- Do NOT Show
- Text On Design
- Design Notes

**Note:** The Content Strategy Worker proposes the first version. The **Creative Director** owns the final approved version of all creative fields.

### Content Strategy Worker does NOT write:
- Campaign Philosophy
- Trust Platform
- Core Message
- Trust Promise
- Emotional Trigger
- Psychological Barrier
- Target Audience
- Content Pillars
- Approved Content Angles
- KPI
- Non-Negotiable Rules
- Post Copy (AI)
- Primary Hashtags
- Secondary Hashtags
- Design Prompt (AI)
- Content ID
- Revision Number
- AI Worker
- Copy Status
- Design Status
- Review Status
- Publishing Status
- Workflow Status
- Quality Score
- Design Asset URL
- Live Post URL
- Notes

---

### Content Creation Worker writes (proposes first draft):
- Post Copy (AI)
- Primary Hashtags
- Secondary Hashtags
- Design Prompt (AI)

**Note:** The Content Creation Worker proposes the first draft. The **Creative Director** owns the final approved version.

---

### Creative Director Worker writes (final owner of complete Creative Package):

**Strategy Refinement (may refine from Strategy proposal):**
- Content Objective
- Content Angle
- Content Type
- Content Format
- Content Funnel Stage
- Hook
- Post Structure
- Language Style
- Emoji Style

**Visual Creative Package (may refine from Strategy proposal):**
- Visual Concept
- Visual Focus
- Visual Priority
- Design Mood
- Composition
- Visual Elements
- Do NOT Show
- Text On Design
- Design Notes

**Content Refinement (final version from Creation draft):**
- Creative Director Post Copy
- Primary Hashtags
- Secondary Hashtags

**Design Prompt (final production instruction):**
- Creative Director Design Prompt

**Review Fields (own output):**
- Creative Director Quality Score
- Creative Director Review Status
- Creative Director Notes

### Creative Director Worker does NOT write:
- Any Business Context columns (Campaign Philosophy, Trust Platform, Core Message, Trust Promise, Emotional Trigger, Psychological Barrier, Target Audience, Content Pillars, Approved Content Angles, KPI, Non-Negotiable Rules, CTA Strategy)
- Content ID
- Revision Number
- AI Worker
- Publishing Status
- Design Asset URL
- Live Post URL
- Notes

---

## Output Validation Rules
1. Controlled fields must match the approved vocabulary exactly.
2. No synonyms are allowed in dropdown fields.
3. Free-text fields may be creative.
4. Every output row must pass Google Sheets validation without red errors.
5. If a field is formula-driven, the worker must not overwrite it.