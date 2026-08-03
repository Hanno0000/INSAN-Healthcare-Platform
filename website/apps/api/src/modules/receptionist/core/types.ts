/**
 * Healthcare AI Layer — core contracts.
 *
 * Everything in `core/` is channel-agnostic. Nothing here, and nothing in any
 * file under `core/`, may reference Messenger, WhatsApp, a PSID, a page id, or
 * an HTTP request. Channel identity stops at the adapter boundary.
 *
 * Enforced by: `node receptionist/scripts/check-boundary.js`
 * Design: receptionist/docs/ARCHITECTURE.md
 *
 * Note on style: unions here are flat objects with optional fields rather than
 * discriminated unions. This project compiles with `strictNullChecks: false`,
 * which degrades literal-type narrowing — `if (!v.allowed) v.reason` does not
 * type-check under it.
 */

import { ChatChannel, ConversationScopeState, LeadStatus, SafetyFlag } from '@prisma/client';

// ───────────────────────── Inbound / outbound ─────────────────────────

/**
 * What a channel is like, declared by its own adapter.
 *
 * Core branches on these traits, never on the channel's name. An adapter knows
 * what it is; core does not need to hold a list. Adding voice later means
 * writing a VoiceAdapter that declares its traits — no edit to core, and no way
 * to forget to add it to some enumeration and silently bypass a gate.
 */
export interface SurfaceTraits {
  /** Reachable by the general public. Gated by data mode — see DataMode below. */
  isPublic: boolean;
  /**
   * Whether the person can be messaged again after they leave. False on the
   * web widget: an anonymous visitor who closes the tab is unreachable, which
   * is why the phone slot is promoted for those surfaces.
   */
  canReplyLater: boolean;
}

/** What an adapter hands the core. Already normalised; no channel types leak. */
export interface InboundMessage {
  /** Declared by the adapter. Core reads traits, never the channel name. */
  surface: SurfaceTraits;
  /** Brand the surface belongs to, resolved by the adapter from its own key. */
  brandId: string;
  channel: ChatChannel;
  /**
   * Stable per-channel identity for the person, when the channel has one.
   * Null on WEB: an anonymous visitor cannot be messaged back, which is why
   * the phone slot is collected earlier there.
   */
  externalId: string | null;
  /** Adapter-generated, stable for the life of a browser session or thread. */
  visitorId: string;
  text: string;
  locale: string;
  /**
   * Free-form hints the adapter can supply without the core knowing what they
   * mean — e.g. the page a web visitor is reading. Never trusted for scope.
   */
  hints?: Record<string, string>;
}

export interface OutboundReply {
  text: string;
  /** Record ids backing every factual claim. Empty when no fact was asserted. */
  citedRecordIds: string[];
  safetyFlag: SafetyFlag | null;
  /** Set when the turn should stop the normal flow (emergency, abuse, handoff). */
  terminal: boolean;
}

// ───────────────────────── Scope ─────────────────────────

/**
 * The knowledge scope for a conversation. `hospitalId` is the filter applied to
 * every retrieval query — scope is enforced in the query, never in the prompt.
 * See ARCHITECTURE.md §3.
 */
export interface ConversationScope {
  state: ConversationScopeState;
  hospitalId: string | null;
  /** Populated only in AMBIGUOUS, so the reply can name the real options. */
  candidateHospitalIds: string[];
}

export interface GeographyMatch {
  hospitalId: string;
  governorate: string;
  district: string;
  priority: number;
}

// ───────────────────────── Slots ─────────────────────────

/**
 * What the receptionist is trying to learn, in the order it should ask.
 * Asking is driven by this table, not by prompt prose, so "what do I ask next"
 * is answerable in code and testable without a model call.
 */
export const SLOT_ORDER = [
  'reasonSummary',
  'visitType',
  'specialty',
  'branch',
  'doctorPreference',
  'preferredDate',
  'preferredTime',
  'patientName',
  'phone',
] as const;

export type SlotName = (typeof SLOT_ORDER)[number];

export type Slots = Partial<Record<SlotName, string>>;

/** Slots that must be present before a lead may be handed to a human. */
export const REQUIRED_FOR_HANDOFF: SlotName[] = ['patientName', 'phone', 'specialty'];

// ───────────────────────── Retrieval ─────────────────────────

/**
 * Two source kinds with deliberately different guarantees.
 *
 *  DETERMINISTIC — exactly one correct answer (a clinic's hours, a branch
 *    address). Returns the record or nothing. Never "the nearest".
 *  SEMANTIC — prose with no single right answer (a policy, an FAQ). Returns
 *    matches above a threshold; below it, the turn escalates.
 *
 * Doctor schedules must never go through the semantic path. "Nearest match"
 * on a schedule is a confidently wrong appointment time.
 */
export type SourceKind = 'DETERMINISTIC' | 'SEMANTIC';

/**
 * Confidence travels with the fact all the way to the reply. A fact that is not
 * `stated` is withheld from patients — see receptionist/data/hospitals.json,
 * where six source conflicts are already recorded.
 */
export type FactConfidence = 'stated' | 'derived' | 'provisional' | 'conflict';

export interface RetrievedRecord {
  /** Cited by the model and verified by the grounding check. Must be stable. */
  id: string;
  kind: SourceKind;
  /** Short label for the reply to reference, e.g. "عيادة العظام". */
  label: string;
  /** The fact itself, already scoped and safe to render. */
  content: string;
  confidence: FactConfidence;
  /** Provenance, for the admin timeline and for debugging a bad answer. */
  sourceRef: string;
  /** Semantic sources only. Null on deterministic records. */
  similarity: number | null;
}

export interface RetrievalQuery {
  /** Null only while scope is UNRESOLVED or ECOSYSTEM. */
  hospitalId: string | null;
  scopeState: ConversationScopeState;
  text: string;
  locale: string;
}

export interface RetrievalSource {
  readonly kind: SourceKind;
  retrieve(query: RetrievalQuery): Promise<RetrievedRecord[]>;
}

// ───────────────────────── Prompt assembly ─────────────────────────

/**
 * Prompt layers, ordered by rate of change so the cache prefix stays stable.
 * Breakpoints go on layers 1–3; layer 4 is volatile and never cached.
 * ARCHITECTURE.md §5.
 */
export interface PromptLayers {
  /** Constitution, conversation rules, safety floor. Shared by all surfaces. */
  shared: string;
  /** Brand persona + that brand's business rules. */
  brand: string;
  /** Scoped knowledge for the resolved hospital. */
  knowledge: string;
  /** This turn's retrieval + history. Never cached. */
  volatile: string;
}

// ───────────────────────── Turn result ─────────────────────────

export interface TurnContext {
  conversationId: string;
  brandId: string;
  channel: ChatChannel;
  scope: ConversationScope;
  slots: Slots;
  leadStatus: LeadStatus;
  history: Array<{ role: 'user' | 'assistant'; content: string }>;
  /**
   * From the adapter's SurfaceTraits. Drives slot ordering: where the person
   * cannot be reached again, the phone is asked for earlier.
   */
  channelCanReplyLater: boolean;
  /** Already handed to a human — prevents a second lead for one conversation. */
  handedOff: boolean;
}

export interface TurnMetrics {
  modelUsed: string;
  inputTokens: number;
  outputTokens: number;
  /**
   * Cache reads. ARCHITECTURE.md §10 gates progress on this staying above 70%
   * of input tokens — a zero here means a silent invalidator in the prefix.
   */
  cachedTokens: number;
  latencyMs: number;
}

// ───────────────────────── Data mode ─────────────────────────

/**
 * PROVISIONAL — the knowledge base still contains unverified or conflicting
 *   facts. Development and testing are fine; publishing to a live public
 *   channel is refused. Same shape as Campaign OS's DRY_RUN: it makes the
 *   unsafe state visible and hard to reach by accident.
 * VERIFIED — the operator has signed off. Live channels are permitted.
 */
export type DataMode = 'PROVISIONAL' | 'VERIFIED';

export class ProvisionalDataError extends Error {
  constructor(label: string) {
    super(
      `Refusing to serve ${label}: receptionist data mode is PROVISIONAL. ` +
        `Resolve the open conflicts in receptionist/data/hospitals.json and set ` +
        `RECEPTIONIST_DATA_MODE=VERIFIED.`,
    );
    this.name = 'ProvisionalDataError';
  }
}
