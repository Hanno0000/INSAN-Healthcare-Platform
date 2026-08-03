import { Injectable, Logger } from '@nestjs/common';
import { ChatSender, ConversationScopeState, LeadStatus, SafetyFlag } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { ContextBuilderService } from '../context/context-builder.service';
import { HandoffService } from '../handoff/handoff.service';
import { ClaudeProvider } from '../model/claude.provider';
import { QualifierService } from '../qualify/qualifier.service';
import { RetrieverService } from '../retrieval/retriever.service';
import { BudgetGuardService } from '../budget-guard.service';
import { ReceptionistConfigService } from '../receptionist-config.service';
import { SafetyGateService, SafetyVerdict } from '../safety/safety-gate.service';
import { ScopeResolverService } from '../scope/scope-resolver.service';
import { InboundMessage, OutboundReply, Slots, TurnContext } from '../types';
import { GroundingService } from './grounding.service';
import { SlotFillerService } from './slot-filler.service';

/**
 * One turn, end to end.
 *
 * Order is the design. Safety runs before anything can cost money or say
 * anything; grounding runs after the model and can still replace what it said.
 * The model sits in the middle, between two deterministic gates.
 */
@Injectable()
export class ConversationEngineService {
  private readonly logger = new Logger(ConversationEngineService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ReceptionistConfigService,
    private readonly safety: SafetyGateService,
    private readonly scopeResolver: ScopeResolverService,
    private readonly retriever: RetrieverService,
    private readonly contextBuilder: ContextBuilderService,
    private readonly claude: ClaudeProvider,
    private readonly grounding: GroundingService,
    private readonly slotFiller: SlotFillerService,
    private readonly qualifier: QualifierService,
    private readonly handoff: HandoffService,
    private readonly budget: BudgetGuardService,
  ) {}

  async handle(message: InboundMessage): Promise<OutboundReply> {
    // Provisional data must not reach a public audience. Throws — a gate whose
    // result can be ignored is not a gate.
    this.config.assertMayServe(message.surface, message.channel);

    const ctx = await this.loadContext(message);
    await this.persistUser(ctx.conversationId, message.text);

    // ─── Gate 1: safety, before any spend and any generated text ───
    const recent = ctx.history.filter((h) => h.role === 'user').map((h) => h.content);
    const verdict = this.safety.evaluate(message.text, recent);

    if (verdict.action !== 'PROCEED') {
      return this.handleSafety(ctx, verdict);
    }

    // ─── Gate 1b: budget. After safety, before anything that costs money ───
    // Deliberately after safety: a conversation that has hit its cap and then
    // describes chest pain must still get the emergency path, not a budget
    // message.
    const budget = await this.budget.check(ctx.conversationId);
    if (!budget.allowed) {
      await this.handoff.execute(ctx, LeadStatus.NEEDS_HUMAN, `تجاوز الحد (${budget.reason})`);
      return this.finish(
        ctx,
        { text: budget.message, citedRecordIds: [], safetyFlag: null, terminal: true },
        LeadStatus.NEEDS_HUMAN,
        null,
      );
    }

    // ─── Scope ───
    // A surface hint resolves without asking: a visitor already reading a
    // hospital's page has told us which one they mean.
    const before = ctx.scope.state;
    ctx.scope = await this.scopeResolver.resolveFromHint(ctx.scope, message.hints?.hospitalSlug);

    // Otherwise resolution stays lazy — only once the turn actually needs a
    // hospital. Opening with "where do you live?" is the failure this avoids.
    if (ctx.scope.state !== ConversationScopeState.RESOLVED && this.scopeResolver.needsScope(message.text)) {
      ctx.scope = await this.scopeResolver.resolveFromText(ctx.scope, message.text);
    }
    if (ctx.scope.state !== before || ctx.scope.hospitalId) {
      await this.persistScope(ctx);
    }

    // ─── Slots: deterministic pass first; it cannot fail ───
    ctx.slots = this.slotFiller.extractDeterministic(message.text, ctx.slots);

    // ─── Retrieval, then the prompt, then the model ───
    const records = await this.retriever.retrieve({
      hospitalId: ctx.scope.hospitalId,
      scopeState: ctx.scope.state,
      text: message.text,
      locale: message.locale,
    });

    const layers = await this.contextBuilder.build(ctx, records);

    let replyText: string;
    let metrics;
    try {
      const result = await this.claude.complete(layers, ctx.history, message.text);
      replyText = result.text;
      metrics = result.metrics;
      if (result.stopReason === 'refusal' || !replyText) {
        replyText = 'المعلومة دي مش متأكد منها، هراجعها مع الفريق وأرد عليك.';
      }
    } catch (e) {
      this.logger.error(`Model call failed: ${(e as Error).message}`);
      return this.finish(ctx, {
        text: 'حصلت مشكلة تقنية بسيطة. زميل من الفريق هيتواصل معاك.',
        citedRecordIds: [],
        safetyFlag: null,
        terminal: true,
      }, LeadStatus.NEEDS_HUMAN, null);
    }

    // ─── Gate 2: grounding. Can still replace what the model said ───
    const grounded = this.grounding.verify(replyText, records);
    if (!grounded.ok) {
      this.logger.warn(`Grounding failed (${grounded.reason}) — replaced with the escalation reply.`);
    }

    // ─── Slots: model pass, best-effort ───
    ctx.slots = await this.slotFiller.extractWithModel(
      `${message.text}\n${grounded.cleanText}`,
      ctx.slots,
    );

    // ─── Qualification, then handoff if the deterministic trigger fires ───
    const leadStatus = this.qualifier.classify({
      text: message.text,
      slots: ctx.slots,
      safety: verdict,
      groundingFailed: !grounded.ok,
      current: ctx.leadStatus,
    });

    let finalText = grounded.cleanText;
    if (this.handoff.shouldHandOff(ctx, leadStatus)) {
      const summary = this.summarise(ctx, message.text);
      const result = await this.handoff.execute(ctx, leadStatus, summary);
      if (result.handedOff) {
        finalText += '\n\nسجّلت طلبك، وزميل من الفريق هيتواصل معاك يأكد الميعاد.';
      }
    }

    return this.finish(
      ctx,
      {
        text: finalText,
        citedRecordIds: grounded.validCitations,
        safetyFlag: grounded.ok ? null : SafetyFlag.GROUNDING_FAILURE,
        terminal: false,
      },
      leadStatus,
      metrics,
    );
  }

  // ───────────────────────── safety paths ─────────────────────────

  private async handleSafety(ctx: TurnContext, verdict: SafetyVerdict): Promise<OutboundReply> {
    // Self-harm is handled BEFORE and SEPARATELY from medical emergencies.
    //
    // These two branches used to share one path, which was a defect: the
    // medical reply tells someone to go to an emergency department, and that is
    // the wrong thing — potentially a harmful thing — to say to a person in a
    // mental-health crisis. The lexicon said they must be separate; the code
    // did not honour it.
    if (verdict.action === 'SELF_HARM_STOP') {
      await this.handoff.execute(
        ctx,
        LeadStatus.EMERGENCY,
        `⚠️ إيذاء نفس — "${verdict.matchedTerm}" — أولوية قصوى`,
      );

      // No qualification, no slot chasing, no booking. Silence from the model
      // entirely: this reply is written by a clinician or it is not written.
      const text =
        this.safety.selfHarmReply() ??
        'أنا سامعك، وإنت مش لوحدك. زميل من الفريق هيتواصل معاك حالاً.';

      return this.finish(
        ctx,
        { text, citedRecordIds: [], safetyFlag: SafetyFlag.EMERGENCY, terminal: true },
        LeadStatus.EMERGENCY,
        null,
      );
    }

    if (verdict.action === 'EMERGENCY_STOP') {
      await this.handoff.execute(ctx, LeadStatus.EMERGENCY, `⚠️ ${verdict.categoryId} — "${verdict.matchedTerm}"`);

      // The reply comes from the lexicon, with this hospital's number
      // substituted — so filling the operator's template actually changes what
      // a patient is told. It previously did not: the text was hardcoded here
      // and the template was never read.
      const hospitalSlug = await this.hospitalSlug(ctx.scope.hospitalId);
      const text = this.safety.emergencyReply(hospitalSlug) ?? 'زميل من الفريق هيتواصل معاك حالاً.';

      return this.finish(
        ctx,
        { text, citedRecordIds: [], safetyFlag: SafetyFlag.EMERGENCY, terminal: true },
        LeadStatus.EMERGENCY,
        null,
      );
    }

    if (verdict.action === 'MARK_SPAM') {
      return this.finish(ctx, { text: '', citedRecordIds: [], safetyFlag: SafetyFlag.SPAM, terminal: true }, LeadStatus.SPAM, null);
    }

    const text =
      verdict.action === 'WARN_ABUSE'
        ? 'أنا هنا عشان أساعدك. ياريت نكمل بأسلوب محترم.'
        : 'هقفل المحادثة دي هنا. لو حابب تتواصل بشكل مختلف، إحنا موجودين.';

    return this.finish(
      ctx,
      { text, citedRecordIds: [], safetyFlag: SafetyFlag.ABUSE, terminal: verdict.action === 'END_ABUSE' },
      LeadStatus.ABUSIVE,
      null,
    );
  }

  /** Slug is what the lexicon keys its per-hospital emergency numbers on. */
  private async hospitalSlug(hospitalId: string | null): Promise<string | null> {
    if (!hospitalId) return null;
    const h = await this.prisma.hospital.findUnique({ where: { id: hospitalId }, select: { slug: true } });
    return h?.slug ?? null;
  }

  // ───────────────────────── persistence ─────────────────────────

  private async loadContext(message: InboundMessage): Promise<TurnContext> {
    let convo = await this.prisma.chatConversation.findFirst({
      where: message.externalId
        ? { channel: message.channel, externalId: message.externalId, endedAt: null }
        : { visitorId: message.visitorId, channel: message.channel, endedAt: null },
      include: { messages: { orderBy: { createdAt: 'asc' }, take: 30 } },
    });

    if (!convo) {
      const scope = await this.scopeResolver.initialScope(message.brandId);
      convo = await this.prisma.chatConversation.create({
        data: {
          visitorId: message.visitorId,
          locale: message.locale,
          brandId: message.brandId,
          channel: message.channel,
          externalId: message.externalId,
          scopeState: scope.state,
          resolvedHospitalId: scope.hospitalId,
        },
        include: { messages: true },
      });
    }

    return {
      conversationId: convo.id,
      brandId: convo.brandId ?? message.brandId,
      channel: convo.channel,
      scope: {
        state: convo.scopeState,
        hospitalId: convo.resolvedHospitalId,
        candidateHospitalIds: [],
      },
      slots: (convo.slots as Slots) ?? {},
      leadStatus: convo.leadStatus,
      history: convo.messages.map((m) => ({
        role: m.sender === ChatSender.USER ? ('user' as const) : ('assistant' as const),
        content: m.content,
      })),
      channelCanReplyLater: message.surface.canReplyLater,
      handedOff: convo.handedOffAt !== null,
    };
  }

  private async persistUser(conversationId: string, text: string): Promise<void> {
    await this.prisma.chatMessage.create({
      data: { conversationId, sender: ChatSender.USER, content: text },
    });
  }

  private async persistScope(ctx: TurnContext): Promise<void> {
    await this.prisma.chatConversation.update({
      where: { id: ctx.conversationId },
      data: { scopeState: ctx.scope.state, resolvedHospitalId: ctx.scope.hospitalId },
    });
  }

  private async finish(
    ctx: TurnContext,
    reply: OutboundReply,
    leadStatus: LeadStatus,
    metrics: { modelUsed: string; inputTokens: number; outputTokens: number; cachedTokens: number; latencyMs: number } | null,
  ): Promise<OutboundReply> {
    if (reply.text) {
      await this.prisma.chatMessage.create({
        data: {
          conversationId: ctx.conversationId,
          sender: ChatSender.AI,
          content: reply.text,
          citedRecordIds: reply.citedRecordIds,
          safetyFlag: reply.safetyFlag,
          modelUsed: metrics?.modelUsed,
          inputTokens: metrics?.inputTokens,
          outputTokens: metrics?.outputTokens,
          cachedTokens: metrics?.cachedTokens,
          latencyMs: metrics?.latencyMs,
        },
      });
    }

    await this.prisma.chatConversation.update({
      where: { id: ctx.conversationId },
      data: {
        slots: ctx.slots as object,
        leadStatus,
        lastMessageAt: new Date(),
        endedAt: reply.terminal && leadStatus === LeadStatus.ABUSIVE ? new Date() : undefined,
      },
    });

    return reply;
  }

  /** What the staff member reads instead of the transcript. */
  private summarise(ctx: TurnContext, latest: string): string {
    const parts: string[] = [];
    if (ctx.slots.reasonSummary) parts.push(ctx.slots.reasonSummary);
    if (ctx.slots.specialty) parts.push(`التخصص المطلوب: ${ctx.slots.specialty}`);
    if (ctx.slots.visitType) parts.push(ctx.slots.visitType);
    if (ctx.slots.preferredDate || ctx.slots.preferredTime) {
      parts.push(`الوقت المفضل: ${[ctx.slots.preferredDate, ctx.slots.preferredTime].filter(Boolean).join(' ')}`);
    }
    if (parts.length === 0) parts.push(latest.slice(0, 160));
    return parts.join('. ');
  }
}
