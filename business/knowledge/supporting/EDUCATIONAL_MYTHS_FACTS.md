---
entity_id:      EDU-001
entity_name_en: Medical Myths & Facts
entity_name_ar: خرافات وحقائق طبية
service_level:  SUPPORTING
campaign_type:  Educational
parent:         null
hospitals:      [Future, Delta]
status:         Active
version:        1.0
last_updated:   2026-07-31
---

# EDUCATIONAL_MYTHS_FACTS.md

> INSAN Healthcare Ecosystem
>
> Source of Truth — Medical Myths & Facts campaign
>
> Version: 1.0
>
> Status: Living Knowledge Base

---

# Purpose

This document is the Source of Truth for the **Medical Myths & Facts** campaign.

It describes a campaign, not a medical entity. Where a medical service file answers
*what is this department*, this file answers *what is this campaign, what belongs
inside it, and what must never appear in it.*

Three scheduled posts depend on it — and **the other three educational campaigns depend
on the boundary it sets.** This file is the anchor of the educational cluster.

⚠️ The calendar currently schedules this campaign under **two names** —
`Medical Myths & Facts` (1 slot) and `Myth vs Fact` (2 slots). The operator confirmed
on 2026-07-30 that they are one campaign. Until the two `Myth vs Fact` rows are
renamed, this file's card serves only one of the three slots.

# Document Philosophy

Written for a worker that has never seen INSAN and cannot ask. Everything here is
derived from `MASTER_BRAND_ARCHITECTURE.md`, `PLATFORM_KNOWLEDGE_BASE.md`,
`AI_CREATIVE_CONSTITUTION.md` and `PROJECT_DECISIONS.md`.

**This campaign can make things worse.** Correction is not a neutral act, and the
obvious way to run a myth-busting campaign is the way that entrenches the myth. Read
*Human Insight* before writing anything.

---

# ═══════════ FOUNDATION ═══════════

## Overview

Medical Myths & Facts addresses widely held health beliefs that are wrong, and replaces
them with something better.

It is the ecosystem's clearest expression of *Education Before Promotion*
(`PLATFORM_KNOWLEDGE_BASE.md` §5): it asks nothing, sells nothing, and exists to make
the audience better informed than they were.

## Definition

An educational campaign that corrects a specific, widely held health belief — carefully,
without humiliating anyone, and by replacing what the belief was doing rather than
merely denying it.

**What is inside it:** common health beliefs that are factually wrong and consequential;
folk remedies that delay treatment; misunderstandings about how medicine or hospitals
work; confusions about medication, prevention and diagnosis.

**What is outside it:**

- **Health knowledge with no false belief attached.** *How the heart works*, *what
  blood pressure means* — that is *Health Awareness*.
- **Advice on what to do.** *Walk thirty minutes a day* — that is *Prevention Tips*.
- **Seasonal or occasion-linked content** — Ramadan, summer heat, awareness days. That
  is *Seasonal Campaigns*, even when it contains a correction.
- **Practical questions about using the ecosystem.** That is *FAQ*.
- **Anything about a specific patient, or advice on an individual case.** Never.
- Religious, cultural or traditional practices as such. A practice that delays care may
  be addressed on the health point only, never as a belief system.

### The educational routing test

Four educational campaigns all convey health information. Each has a different job:

| If the reader's state is… | It belongs to |
|---|---|
| **they believe something that is wrong** | **Medical Myths & Facts** |
| they do not know something | Health Awareness |
| they know but do not act | Prevention Tips |
| the moment makes it relevant now | Seasonal Campaigns |

A post can touch several. File it by the reader's starting state. **If nobody actually
believes the myth, there is no post** — inventing a myth to correct is the laziest
available failure and it insults the reader.

## Vision

That the ecosystem becomes a place people check things against — the account that
settles an argument in a family group chat.

## Mission

Correct a costly belief without making anyone feel stupid for having held it.

## Why This Service Exists

**Wrong health beliefs delay treatment, and delay is the most treatable cause of bad
outcomes in this market.**

A parent who believes antibiotics cure flu gives them and waits. A man who believes
chest pain that passes is not serious waits. A woman who believes a lump that does not
hurt is nothing waits. None of these people are careless; every one of them is acting
correctly *given what they believe*.

That makes the belief a clinical target. It is also one of the few clinical targets a
communication campaign can actually move.

There is a second reason, and it is strategic.
`PLATFORM_KNOWLEDGE_BASE.md` §5 lists *Education Before Promotion* as a permanent
differentiator: educate and build awareness before asking for a booking. This campaign
is the purest form of that. It asks for nothing, which is precisely what makes it
credible — and an institution that is useful when it wants nothing is trusted when it
does.

## Business Objectives

- Reduce the delay that turns treatable presentations into serious ones.
- Build reach and following through genuinely useful content, which no promotional
  campaign achieves.
- Establish medical authority without claiming it.
- Support the ecosystem's positioning as an educator rather than an advertiser.
- Create the most shareable content the plan produces — corrections travel.

## Marketing Objectives

- Change one belief per post, measurably enough that the reader could restate it.
- Do it without humiliation, which is what determines whether the correction survives.
- Reach the audiences that avoid healthcare content — this campaign is read by people
  who scroll past everything else the ecosystem publishes.
- Build the habit of checking with us.

## Positioning

For anyone who has heard the same health advice from a relative, a pharmacist and the
internet and cannot tell which is right, Medical Myths & Facts settles it — where
competing health content lectures or alarms, this one explains why the belief exists,
what it was getting right, and what is actually true.

> *Test applied:* a competitor can publish "myth" and "fact" in two colours. Explaining
> *why* a belief persists — what job it does for the person holding it — requires
> taking the reader seriously, and it is not a format that can be copied without the
> underlying respect.

## Brand Philosophy

**Education before promotion, and never through fear.**

`PLATFORM_KNOWLEDGE_BASE.md` §5 supplies the first half.
`AI_CREATIVE_CONSTITUTION.md` §21 supplies the second: no fear marketing, no clickbait,
no unproven claims. Both constraints bite hard here, because the two easiest ways to
make a myth post perform are to alarm the reader and to mock the belief.

The philosophy that follows: **the reader is not the problem.** The belief is, and the
belief usually came from someone the reader loves.

## Core Promise

**Everything we correct is medically accurate, uncontroversial among clinicians, and
explained rather than asserted — and we will tell you when the honest answer is "it
depends".**

The promise is about the quality of the correction. It makes no claim about outcomes,
and it deliberately includes the cases where the myth is partly right.

---

# ═══════════ HUMAN UNDERSTANDING ═══════════

## Human Problem

What the person is actually living through:

- *"My mother says one thing, the internet says another, the pharmacist says a third."*
- *"I gave him antibiotics because that's what you do."*
- *"It stopped hurting, so it was nothing."*
- *"Everyone in my family does this. Are you telling me they're all wrong?"*
- *"I looked it up and now I'm terrified. Or I'm fine. I can't tell which."*
- *"I don't want to go to a hospital and be told it was nothing and I wasted their
  time."*

Beneath these: **people are surrounded by confident health information from sources
they trust, and have no way to rank it.** The belief they hold usually arrived from a
parent or a neighbour, which means correcting it is not an intellectual transaction —
it carries a social cost.

## Human Insight

**A myth survives because it does a job. Remove it without replacing the job and it
comes back.**

*"Antibiotics cure flu"* persists because it gives a frightened parent something to do
at 2am. *"If the pain stopped, it was nothing"* persists because it makes it possible
to go back to work. *"A lump that does not hurt is fine"* persists because the
alternative is unbearable to think about.

Every durable health myth is doing something for the person holding it — supplying
agency, permission, or relief. A correction that only removes the belief leaves the
need exposed and the person more anxious than before, which is why they reject it.

The second half, which is the one that changes how posts are written: **telling someone
they are wrong makes them defend the belief.** Correction is experienced as an attack
on judgement, and on the relative who supplied it. The reader does not update; they
argue, or they leave.

> Would a reader think *"how did they know that?"* — yes. Everyone has been corrected
> about a health belief and felt defensive rather than grateful, and nobody has ever
> written a myth-busting post that acknowledged why the belief was there.

The operating method that follows: **name what the belief gets right, then give the
better version of the same job.** Not *"antibiotics do not work on viruses"* but
*"you're right that you shouldn't just wait — here is what actually helps at 2am, and
here is when to come in."* The reader keeps their agency and updates the belief,
because nothing was taken away.

## Invisible Product

The visible product is a corrected fact.

What the reader is really buying:

- **A settled argument.** Something to send to the relative who told them the myth.
- **Permission to stop worrying, or a reason to act.** Either is relief.
- **Agency.** Something they can do, which is what the myth was supplying.
- **Not being made a fool of.** The single largest factor in whether a correction is
  accepted.
- **A reliable source.** Somewhere to check the next thing.

## Psychological Transformation

**Before:**
> *"Everyone says something different and they all sound sure. I go with what my mother
> said, because at least she cared."*

**After:**
> *"Now I know why people say that, and what's actually true. And there's somewhere I
> can check the next one."*

The movement is from **inherited certainty to reliable checking** — and the second
sentence matters more than the first, because a single corrected fact is worth far less
than a habit of verification.

## Emotional Strategy

**Primary emotion: relief** — the release of an uncertainty the reader has been
carrying between conflicting sources.

Supporting: curiosity, recognition, respect, confidence, mild surprise.

Never: fear, alarm, superiority, mockery, or the triumphant tone of a correction. And
never guilt — a parent who gave the wrong medicine to a sick child must not be made to
feel worse by a post; they were doing their best with what they had.

The register is a knowledgeable friend explaining something interesting, not an
authority issuing a correction.

## Audience

**Primary — the household health decision-maker.**
Usually a woman, usually managing care for children and ageing parents at once. She
receives the most health advice, is asked to arbitrate between sources, and is the
single most valuable audience this campaign has.

**Primary — people who avoid healthcare content.**
This campaign reaches people no other campaign does, because a myth post is interesting
before it is medical.

**Secondary — younger adults.**
Fluent in searching, poor at ranking sources, frequently frightened by what they find.

**Secondary — the relative who supplied the myth.**
Rarely considered and it matters. A post that mocks the belief mocks them, and they may
be reading. Their acceptance is what makes the correction stick inside a family.

**Supporting — physicians.**
They read this campaign as a test of medical seriousness. A single inaccurate
correction costs more credibility with them than ten good posts earn.

**Who decides, who influences, who pays:** the household decision-maker decides; the
older relative influences most; nobody pays, which is why this campaign is trusted.

## Audience Decision

**What they compare:** what their family says, what the pharmacist says, what search
results say. This campaign is competing for the position of tie-breaker.

**What they fear:** being wrong in a way that harms someone they are responsible for;
being told they wasted a doctor's time; being made to look ignorant.

**Where they look:** family first, then search, then whoever answers a message.

**What actually moves them:** an explanation of *why* the belief exists. A correction
with a reason is remembered and repeated; a correction without one is disputed at the
next family gathering and lost.

---

# ═══════════ MEDICAL FOUNDATION ═══════════

## Service Boundaries

- This campaign does **not** diagnose, assess symptoms, or tell anyone whether their
  situation is serious.
- It does **not** recommend, name or discourage a specific medication, dose or brand.
- It does **not** address a contested or evolving clinical question. Only settled,
  uncontroversial medicine.
- It does **not** correct religious or cultural practice. Where a practice affects
  health, the health point is addressed and nothing else is.
- It does **not** use fear, alarm or worst-case framing.
- It does **not** mock a belief, a source, or the people who hold it.
- It does **not** invent a myth in order to correct it.
- It does **not** cite a statistic, study or figure the operator has not approved.

## Medical Philosophy

Health literacy is part of care, and misinformation is a modifiable risk factor.

The clinical discipline this campaign requires is unusual: **every correction must be
reviewed by a clinician before publication.** Not because the writer is careless, but
because medical content that is 90% right is more dangerous than none — it is
authoritative, memorable and shared, and its errors travel with it.

The second discipline: **only settled medicine.** Anything where competent clinicians
disagree is not a myth, it is an open question, and treating it as a myth is a false
claim in the campaign that can least afford one.

## Core Principles

**Never make the reader wrong.** Make the belief understandable and the correction
useful. Nobody updates a belief while defending themselves.

**Say what the myth gets right.** Almost every durable one contains something true.
Naming it buys the credibility to correct the rest.

**Replace the job.** Give the reader something to do that serves what the belief was
serving.

**Clinical review, every post, without exception.** The rule that keeps this campaign
an asset instead of a liability.

**Settled medicine only.** If clinicians would argue, it is not for this campaign.

**Never fear.** The correction must reduce anxiety. If a post makes the reader more
frightened than before, it has failed regardless of accuracy.

**Never mock.** Not the belief, not the grandmother who supplied it, not the pharmacist.
The person who told the reader the myth loved them.

**No individual advice.** Every post ends where personal circumstances begin.

## Core Features

The territories available to this campaign. Specific corrections must be selected and
verified with a clinician; these are the categories that recur.

**Medication beliefs**
- What antibiotics do and do not treat, and what to do instead at 2am.
- Why a course is finished as prescribed.
- Stopping medication because the symptom stopped.
- Sharing prescribed medication within a family.
- The belief that an injection works better than a tablet.

**"It stopped, so it was nothing"**
- Symptoms that resolve and matter — the single most consequential category in this
  campaign, and the one closest to the Emergency and Cardiac campaigns.
- Pain that passes; a lump that does not hurt; a symptom that comes and goes.

**Prevention and screening beliefs**
- Screening is for people with symptoms.
- Feeling well means being well.
- Family history as destiny, in both directions.

**Hospital and treatment beliefs**
- That going to hospital makes things worse.
- That surgery is always the last resort, or always the first.
- That a second opinion is an insult to the first doctor.
- That the ICU is where people go to die — addressed with the framing in
  `MEDICAL_SERVICE_ICU.md`, never with fear.

**Everyday health beliefs**
- Common folk remedies that are harmless, and the few that delay treatment.
- Beliefs about food, temperature, weather and illness.
- Beliefs about children's fevers — high-frequency, high-anxiety, and requiring the
  most careful handling in the campaign.

**Beliefs about the body**
- Blood pressure and diabetes as things you can feel.
- The belief that a normal test result last year settles this year.

## Differentiators

**It explains why the belief exists.** Standard myth-busting asserts and moves on. This
one takes the belief seriously, which is the only method that changes anything.

**It replaces rather than removes.** The reader leaves with something to do.

**It never mocks.** The category norm is gentle superiority, which entrenches beliefs
and offends the relative who supplied them.

**It is clinically reviewed.** Most health content in this market is not, and the
difference is visible to the physician audience within one post.

**It asks for nothing.** No booking, no service, no ask — which is what makes the
authority credible and what distinguishes education from promotion.

## Service Journey

How a belief is actually changed — and therefore the shape of a post:

1. **The belief is stated**, in the reader's own words, without judgement.
2. **Its origin is acknowledged** — who says it, and why it sounds right.
3. **What it gets right** is named.
4. **What is actually true** is explained, with a reason.
5. **The job is replaced** — what to do instead, which serves the same need.
6. **The boundary** — when this stops being general and needs a clinician.

Steps 3 and 5 are what almost no myth-busting content does, and they are the whole
method.

## What Makes This Different

For a worker reading nothing else: **state the belief kindly, say what it gets right,
explain what is true and why, and give the reader something to do instead.** Never mock,
never frighten, and never publish without a clinician reading it.

---

# ═══════════ MARKETING INTELLIGENCE ═══════════

## Communication Objective

To change one belief, durably.

Not to inform and not to impress. The objective is that the reader could restate the
correction accurately a week later — and would repeat it to the relative who told them
the myth without starting an argument.

## What We Are Really Selling

**Reliable checking.**

The visible content is a corrected fact. What is being sold is a relationship: **this is
where you find out what is true.** Any single correction has limited value; being the
place people check has compounding value, and it is the only durable outcome this
campaign can produce.

Restated for a worker: we are not selling medical authority or expertise. We are selling
**a source you can trust when your family disagrees.**

## Human Truth

**People do not change beliefs when they are corrected. They change them when they are
given a better explanation and allowed to keep their dignity.**

A second truth, specific to this market: **health beliefs are inherited from people who
love you.** Correcting one is never only a factual matter, and any content that ignores
the social cost of the correction will be resisted for reasons that have nothing to do
with the medicine.

## Audience Psychology

How the audience thinks before anything is said:

- **Everyone sounds equally certain.** So certainty is not a signal, and explanation is.
- **Doctors dismiss things I know work.** A real experience, and it makes clinical
  correction feel adversarial.
- **If I'm wrong about this, what else am I wrong about?** The anxiety that makes
  correction threatening.
- **My mother would not have given me something harmful.** Which is why the source
  matters more than the fact.
- **Health content online is trying to frighten me into something.** Which is why the
  absence of an ask is so unusual and so persuasive.

## Emotional Triggers

**Primary:** relief.

**Supporting:** curiosity, recognition, respect, confidence.

Deliberately excluded: fear, alarm, guilt, superiority and urgency.
`AI_CREATIVE_CONSTITUTION.md` §21 bans fear marketing and clickbait, and both are the
default instincts of the myth-busting format — *"the mistake that could cost you your
life"* is the standard headline in this category and it is closed to this campaign.

## Psychological Barriers

**Barrier 1 — "You're calling my family ignorant."**
The strongest barrier and the reason most corrections fail. Corrected by naming what the
belief gets right and by never characterising the people who hold it.

**Barrier 2 — "But it worked for me."**
Personal experience outranks evidence for almost everyone. Corrected by explaining the
mechanism — why the thing that happened would have happened anyway — rather than denying
the experience.

**Barrier 3 — "Doctors just want me to come in."**
Suspicion of commercial motive. Corrected by asking for nothing, ever, in this campaign.
The absence of a CTA is a strategic asset, not an omission.

**Barrier 4 — "Now I'm frightened."**
A correction that removes a comforting belief and supplies nothing leaves the reader
worse off, and they will avoid the source that did it. Corrected by always replacing the
job the belief was doing.

**Barrier 5 — "Everything is a myth now."**
Correction fatigue. Corrected by choosing only beliefs that matter — ones where the
belief changes what someone does.

## Core Messaging Framework

Consistently reinforced:

- The belief exists for a reason, and the reason is usually sensible.
- Here is what is actually true, and why.
- Here is what to do instead.
- You were not being careless.
- If it is about you specifically, that needs a doctor, not a post.
- You can check things here.

## Messaging Hierarchy

1. **The belief**, in the reader's own words.
2. **Why it sounds right** — its origin, and what it gets right.
3. **What is true**, with the reason.
4. **What to do instead.**
5. **The boundary** — where a clinician is needed.

Never open with the correction. *"Wrong!"* closes the reader before the explanation
arrives, and the explanation is the entire product.

If there is only one line, it is the belief — stated fairly enough that someone who
holds it would recognise it as their own.

## Narrative Themes

- **What your grandmother got right.** The campaign's warmest and most effective frame.
- **Why everyone believes this.** The origin of a myth, told as something interesting.
- **It stopped hurting.** The most consequential belief category available.
- **What to do at 2am.** Replacing the job a myth was doing, directly.
- **It depends.** Beliefs where the honest answer is conditional — an unusually
  trust-building post.
- **Two things that are both true.** Where a myth and a fact coexist and the distinction
  is the content.
- **The test you passed last year.** Beliefs about time and reassurance.
- **When we were wrong too.** Medicine that has changed, told without defensiveness —
  the most credible post this campaign can publish.

## Content Pillars

**1. Medication** — what it does, and what it does not.
**2. Symptoms That Pass** — the beliefs that produce delay.
**3. Prevention And Screening** — feeling well, and what it does not prove.
**4. Hospitals And Treatment** — beliefs about care itself.
**5. Everyday Remedies** — what is harmless, and the few things that are not.
**6. It Depends** — the honest conditionals.

## Storytelling Opportunities

Framings, not topics — each one a specific belief with its own reason for existing:

- *"He had a temperature so I gave him antibiotics"* — the 2am problem, and what
  actually helps.
- *"The pain went away on its own"* — and what that does and does not rule out.
- *"It doesn't hurt, so it's nothing."*
- *"I feel fine, so my blood pressure is fine."*
- *"I stopped the tablets when I got better."*
- *"A second opinion would insult the doctor."*
- *"My tests were normal last year."*
- *"They only go to the ICU when there's no hope."*
- *"My grandmother did this for sixty years"* — the harmless remedy, granted, with the
  one thing to watch.
- *"Doctors used to say the opposite"* — how medicine changes, said plainly.

## Communication Style

Always: warm, plain, curious, respectful, specific, unhurried.

Never: superior, alarming, triumphant, sarcastic, or written as a correction being
issued.

Egyptian colloquial for the belief itself — the myth must be stated the way people
actually say it, or the reader will not recognise their own belief and the post is about
somebody else.

## Tone of Voice

Write as a doctor in the family — the relative everyone calls, who explains things
without making anyone feel foolish and never says "who told you that?"

Explain mechanisms simply. *Why* is the whole product; a fact without a reason is
another confident voice among many.

Never use: *shocking*, *dangerous mistake*, *what nobody tells you*, *stop doing this
immediately*, *the truth about*. That is the vocabulary of the format this campaign is
deliberately not.

## Messaging Rules

- Always state the belief fairly, in the reader's words.
- Always say what it gets right.
- Always explain why the truth is true.
- Always give something to do instead.
- Always end at the boundary of individual advice.
- Always have a clinician review the post before publication.
- Never mock a belief, a source or a family.
- Never use fear, alarm or urgency.
- Never correct a contested clinical question.
- Never name a medication, dose or brand.
- Never diagnose, assess a symptom or imply seriousness.
- Never invent a myth to correct.
- Never attach a booking ask to a correction.

---

# ═══════════ OFFERS ═══════════

## Current Offers

**No offers.** The absence of an ask is what makes this campaign credible. An offer
attached to a correction reveals a commercial motive and confirms the exact suspicion —
*"they just want me to come in"* — that the campaign is built to disarm.

## Offer Rules

- No promotional offer, price, discount or package may appear in this campaign.
- No service may be recommended as the resolution of a myth. Where care is genuinely
  needed, the post says *see a doctor* — not *see us*.
- Screening and check-up campaigns exist separately. A correction must never be a
  vehicle for one.

## Call To Action

In priority order:

1. **None.** The correct default. The post is the deliverable.
2. **Send this to whoever told you** — the only ask that serves the campaign, and the
   one that spreads it.
3. **Ask us about another one** — invites the next belief, and builds the checking
   habit.
4. **See a doctor if it applies to you** — a boundary statement rather than a CTA, and
   never naming a specific service.

Never a booking CTA, under any circumstances.

## Primary KPI

**Shares.**

Corrections travel between family members, and a share is the only evidence that the
correction was accepted rather than merely read. Saves are secondary; comments
disputing the correction are useful data and should be answered patiently rather than
avoided.

Reach is explicitly not the measure. A myth post reaching a large indifferent audience
has changed nothing.

---

# ═══════════ STRATEGIC GOVERNANCE ═══════════

## Strategic Reminder

Before publishing, ask two questions.

**Would someone who holds this belief recognise it as fairly stated, and finish the post
without feeling foolish?** If not, it will be rejected regardless of accuracy.

**Is the reader less anxious than before?** If a correction leaves them more frightened,
it has failed — and it has taught them to avoid this source.

## Strategic Constraints

- Never use fear, and never imply that not knowing this was dangerous.
- Never mock, and never characterise the people who hold the belief.
- Never publish without clinical review.
- Never address a contested clinical question.
- Never correct religious or cultural practice as such.
- Never attach a commercial ask.
- Professional ethics and clinical accuracy outrank campaign performance absolutely.
- Long-term brand value outranks short-term engagement
  (`AI_CREATIVE_CONSTITUTION.md` §20.5) — and this is the campaign where the
  high-performing version is most often the damaging one.

## Medical Communication Principles

- Every correction must be reviewed by a clinician before publication. No exceptions.
- Only settled, uncontroversial medicine.
- No diagnosis, symptom assessment or judgement of seriousness.
- No medication, dose or brand named.
- Every post ends at the boundary where individual circumstances begin.
- Where the honest answer is conditional, say so. *"It depends"* is a complete and
  trust-building answer.
- Where medicine has changed its own position, say that plainly rather than presenting
  current advice as though it were always known.

## Never Promise

The campaign must never promise:

- That knowing this prevents, cures or protects against anything.
- That a symptom is or is not serious.
- Any outcome from following the guidance.
- That the information applies to the reader's specific case.
- That any remedy, food or practice has a therapeutic effect.
- Any statistic, rate or study finding not approved by the operator.
- That medical advice will not change.

## Can Promise

The campaign can confidently state:

- That the correction is accurate, settled and clinically reviewed.
- That it explains the reasoning rather than asserting the conclusion.
- That it asks for nothing.
- That education precedes promotion in this ecosystem
  (`PLATFORM_KNOWLEDGE_BASE.md` §5).
- That where an answer is conditional, the condition will be stated.
- That a question about a specific person needs a clinician, and saying so is part of
  the answer.

## Brand Perception

After sustained exposure, the audience should believe:

**"They explain things properly and they don't try to scare me or sell me anything.
That's where I check."**

Physicians should believe: *"The medicine is right, and they know where the line is."*

## Long-Term Brand Contribution

This campaign builds authority without claiming any, which is the only way authority is
actually built.

It also produces the ecosystem's widest reach at the lowest cost. Corrections are the
most shared health content that exists, and this campaign reaches people who scroll past
every other thing the ecosystem publishes — which makes it the top of a funnel that no
promotional campaign could fill.

Its most durable output is a habit: being the place people check. That habit is worth
more than any individual correction and cannot be bought.

## Relationship With INSAN

**Trust platform: Expertise.**

This is the ecosystem's clearest demonstration of *Education Before Promotion*, and the
platform connection is subtle but real: a shared standard for what may be published as
medical fact, applied identically across both hospitals' pages, is exactly what a
platform layer is for.

Per `AI_CREATIVE_CONSTITUTION.md` §16, this campaign runs naturally on all three pages
with no adaptation — the medicine does not change by page. It should carry the lightest
possible branding: a correction wearing a logo reads as an advertisement, and the
absence of an ask is the campaign's entire credibility.

---

# ═══════════ INSTITUTIONAL KNOWLEDGE ═══════════

## Institutional Knowledge Extensions

**The clinical review requirement is not procedural caution; it is the campaign's
survival condition.** Medical content that is nearly right is more dangerous than none,
because it is authoritative, memorable and shared. One inaccurate correction costs more
credibility with physicians than a year of good ones earns — and physicians are 30% of
audience priority. Whoever runs this campaign must have a named clinician who reads
every post, and the campaign should not run at all until that person exists.

**Children's fever is the highest-risk territory available.** It is the most searched,
most anxious and most myth-laden area in family health, and the potential for harm from
a nearly-right post is greatest. Handle it with the most conservative version of every
rule here, or leave it to a clinician-authored post.

**Why cultural and religious practice is excluded, recorded so it is not
re-litigated.** A hospital correcting a traditional or religious practice acquires a
position it has no authority for and cannot defend, and it will be received as an
institution telling a community it is backward. Where a practice genuinely delays care,
the health point can be addressed without characterising the practice — and if the post
cannot be written that way, it is not written.

**The two-name problem.** The calendar schedules this campaign under both *Medical Myths
& Facts* and *Myth vs Fact*. Confirmed as one campaign by the operator on 2026-07-30;
until two calendar rows are renamed, this file's card serves one slot instead of three.
Listed with the other pending renames in `START_HERE.md` §6.3.

**What this file cannot supply.** The corrections themselves. Which myths are prevalent
in this catchment, which are causing measurable delay, and what the accurate correction
is for each — those require a clinician and local knowledge. This file supplies the
method, the boundaries and the territories; the medicine comes from someone qualified to
give it.

---

# ═══════════ AI & DOCUMENTATION ═══════════

## Knowledge Scope

This file covers the Medical Myths & Facts campaign: purpose, boundaries, audiences,
method, tone, constraints — and the routing test that separates the four educational
campaigns.

It does not cover: any specific medical fact or correction. Those require clinical
authorship and review.

## AI Worker Guidance

**Apply the educational routing test before writing.** Ignorance is Health Awareness;
inaction is Prevention Tips; timing is Seasonal.

**Common mistakes with this entity:**

- Opening with the correction. It closes the reader before the explanation.
- Mocking the belief, however gently. It is the category norm and it entrenches the
  myth.
- Using fear. The standard headline in this format, and a red-line breach.
- Removing the belief without replacing what it was doing. The reader leaves more
  anxious and avoids the source.
- Inventing a myth nobody holds.
- Correcting something clinicians actually argue about.
- Naming a medication or implying a diagnosis.
- Publishing without clinical review. The one error that cannot be recovered.
- Attaching a booking CTA. It confirms the suspicion the campaign exists to disarm.

**When the strategy fields are blank**, refuse the row. And refuse the row when no
clinician has reviewed the correction — this is the campaign where a plausible
invention is most directly harmful to a real person.

## Intended Consumers

- **W1 Campaign Card Builder** — builds the Medical Myths & Facts card from this file.
- **W3 Content Strategy** — angle and format. This campaign suits static and carousel
  formats where the belief and the explanation can be separated visually.
- **W4 Content Creation** — the copy. Note the five-step method and the banned
  vocabulary.
- **W5 Creative Director** — final version and the approval gate. The specific review
  duty: has the belief been stated fairly, has the job been replaced, and is the reader
  less anxious than before.
- **W6–W8 Visual team** — the brief, the image, the check. Avoid the red-cross /
  green-tick treatment; it is the visual form of mockery.
- **W10 Paid Ads** — audience and objective. This campaign is the ecosystem's best
  broad-reach content and should be promoted for reach in the catchment, never for
  conversion.
- The reviewing clinician, who is a required consumer rather than an optional one.

## Relationship With Campaign Cards

This file builds the **Medical Myths & Facts** card in `Campaign Cards`.

`campaign_name` is not set, because the calendar schedules this campaign under exactly
the entity name — for one of its three slots. The other two are pending a rename.

Fields needing care:

- `CTA Strategy` is *none*, and the card must say so explicitly. This is the campaign
  where a default CTA does the most damage.
- `Primary KPI` is shares, not reach.
- `Non-Negotiable Rules` must carry the clinical-review rule, the no-fear rule and the
  no-mockery rule.
- `Emotional Trigger` is relief, and it must not drift to urgency — which is where every
  worker will take a health-correction brief unless the card prevents it.

## Relationship With Other Documentation

- `MASTER_BRAND_ARCHITECTURE.md` — governs.
- `PLATFORM_KNOWLEDGE_BASE.md` — §5 Education Before Promotion, §7 brand promises,
  §8 marketing strict rules.
- `AI_CREATIVE_CONSTITUTION.md` — §7 personality, §8 tone, §16 cross-platform
  reinforcement, §21 red lines.
- `PROJECT_DECISIONS.md` — §4 audience priority and publishing limits.
- `departments/MEDICAL_SERVICE_ICU.md` — the framing for any correction touching
  critical care, and the rule that fear is never the communication strategy.
- `supporting/SUPPORTING_FAQ.md` — the adjacent practical campaign. A question is FAQ;
  a wrong belief is this.
- The three other educational files, as they are written. All inherit the routing test
  above.

Reference; never restate. A copied fact is a fact that will drift.

## Maintenance Policy

Update when: a correction is found to be inaccurate — urgent — when medical consensus
changes, or when a new belief category proves prevalent enough to add.

Do not update for: individual post performance.

Owner: INSAN Marketing & Brand Team, with a named clinician as the required reviewer for
every post and for this file's medical territories.

## Versioning Philosophy

Expand rather than replace. Record each verified correction and its reviewer here as it
is published, so the campaign accumulates a checked library rather than re-verifying.

## Future Expansion Areas

- The verified corrections themselves, with their reviewers.
- Prevalence knowledge: which beliefs actually cause delay in this catchment.
- A standing clinical review process.
- The three remaining educational files.

## Final Strategic Reminder

**A myth survives because it does a job. Replace the job, or the myth comes back.**

Everything else in this campaign is format. That one move is what makes a correction
last past the moment of reading.

## Document Metadata

**Document Type** — Business Knowledge Base
**Knowledge Domain** — Educational Campaign
**Campaign** — Medical Myths & Facts
**Project** — INSAN Healthcare Ecosystem
**Status** — Living Document
**Authority Level** — Primary Source of Truth for this campaign, and for the educational
routing test
**Scheduled slots** — 3 (1 reachable until the calendar rename)
**Maintained By** — INSAN Marketing & Brand Team, with clinical review
