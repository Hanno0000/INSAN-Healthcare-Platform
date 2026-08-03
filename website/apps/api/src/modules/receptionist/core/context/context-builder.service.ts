import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ConversationScopeState } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from '../../../prisma/prisma.service';
import { RetrieverService } from '../retrieval/retriever.service';
import { PromptLayers, RetrievedRecord, SLOT_ORDER, Slots, TurnContext } from '../types';

/**
 * Assembles the prompt in four layers ordered by rate of change.
 *
 * Caching is a prefix match: one changed byte invalidates everything after it.
 * So the ordering is not tidiness, it is cost. Layers 1–3 take cache
 * breakpoints; layer 4 is volatile and never cached.
 *
 *   1 shared     — same for all four surfaces. Written once, read by all.
 *   2 brand      — persona + that brand's business rules. Three variants.
 *   3 knowledge  — the resolved hospital's scoped facts. Two variants.
 *   4 volatile   — this turn's retrieval and history. Never cached.
 *
 * Putting per-question retrieval before the last breakpoint is the expensive
 * mistake — it makes the whole prefix volatile and costs roughly 5× per turn.
 */
@Injectable()
export class ContextBuilderService implements OnModuleInit {
  private readonly logger = new Logger(ContextBuilderService.name);
  private sharedLayer = '';

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  onModuleInit(): void {
    const dir =
      this.config.get<string>('RECEPTIONIST_PROMPTS_DIR') ??
      path.resolve(process.cwd(), '..', '..', '..', 'receptionist', 'prompts');
    const file = path.join(dir, 'shared', 'CONVERSATION_RULES.md');

    if (!fs.existsSync(file)) {
      throw new Error(`Shared prompt layer not found: ${file}\nRefusing to start without conversation rules.`);
    }
    this.sharedLayer = fs.readFileSync(file, 'utf8');
    this.logger.log(`Shared prompt layer loaded (${this.sharedLayer.length} chars)`);
  }

  async build(ctx: TurnContext, records: RetrievedRecord[]): Promise<PromptLayers> {
    return {
      shared: this.sharedLayer,
      brand: await this.brandLayer(ctx.brandId),
      knowledge: await this.knowledgeLayer(ctx),
      volatile: this.volatileLayer(ctx, records),
    };
  }

  /** Layer 2 — persona and business rules, kept apart because their owners differ. */
  private async brandLayer(brandId: string): Promise<string> {
    const persona = await this.prisma.brandPersona.findUnique({ where: { brandId } });
    if (!persona) {
      this.logger.warn(`No BrandPersona for ${brandId} — brand layer is empty.`);
      return '';
    }
    return [
      '# طبقة 2 — الشخصية وقواعد العمل',
      '',
      '## الشخصية',
      persona.persona,
      '',
      '## قواعد العمل',
      persona.businessRules,
    ].join('\n');
  }

  /**
   * Layer 3 — what this hospital is. Stable until an admin edits a schedule,
   * which is exactly the right cadence for a cache breakpoint.
   *
   * Deliberately excludes the specific answer to this turn's question; that is
   * layer 4's job.
   */
  private async knowledgeLayer(ctx: TurnContext): Promise<string> {
    if (ctx.scope.state !== ConversationScopeState.RESOLVED || !ctx.scope.hospitalId) {
      return [
        '# طبقة 3 — النطاق',
        '',
        'لسه مش محدد أنهي مستشفى. جاوب على مستوى المنظومة بس.',
        'متقولش جدول عيادة ولا اسم دكتور ولا عنوان فرع قبل ما تحدد المستشفى.',
      ].join('\n');
    }

    const hospital = await this.prisma.hospital.findUnique({
      where: { id: ctx.scope.hospitalId },
      include: { medicalCenters: { include: { medicalCenter: true } } },
    });
    if (!hospital) return '';

    const centers = hospital.medicalCenters
      .filter((l) => l.medicalCenter.status === 'PUBLISHED')
      .map((l) => `- ${this.ar(l.medicalCenter.name)}`)
      .join('\n');

    return [
      '# طبقة 3 — نطاق المستشفى',
      '',
      `إنت بترد في نطاق: **${this.ar(hospital.name)}**`,
      '',
      '## المراكز الطبية في المستشفى دي',
      centers || '(لا يوجد مراكز منشورة)',
      '',
      '⚠️ أي مركز أو خدمة مش مذكورة هنا **مش موجودة في المستشفى دي**.',
      'لو المريض طلبها، قوله بصراحة واعرض تحوّله لمنظومة إنسان.',
    ].join('\n');
  }

  /** Layer 4 — this turn only. Never cached. */
  private volatileLayer(ctx: TurnContext, records: RetrievedRecord[]): string {
    const parts: string[] = ['# طبقة 4 — سياق المحادثة دي', ''];

    parts.push('## السجلات المتاحة لك دلوقتي');
    parts.push('استشهد بالمعرّف بين قوسين مربعين بعد أي حقيقة تقولها.');
    parts.push('');
    parts.push(RetrieverService.render(records));
    parts.push('');

    parts.push('## المعلومات اللي جمعتها');
    const known = SLOT_ORDER.filter((s) => ctx.slots[s]).map((s) => `- ${this.slotLabel(s)}: ${ctx.slots[s]}`);
    parts.push(known.length ? known.join('\n') : '(لسه مفيش)');
    parts.push('');

    const next = this.nextSlot(ctx.slots, ctx.channelCanReplyLater);
    if (next) {
      parts.push(`## أقرب معلومة ناقصة`);
      parts.push(`${this.slotLabel(next)} — اسأل عنها **لو** المحادثة وصلت لمرحلة تستدعي كده.`);
      parts.push('لو المريض سأل سؤال مغلق، جاوبه وبس.');
    }

    return parts.join('\n');
  }

  /**
   * Next slot to pursue.
   *
   * When the surface cannot message the person again — an anonymous web
   * visitor who closes the tab is gone — the phone is promoted ahead of the
   * softer questions. On Messenger there is a PSID and the phone can wait until
   * it fits the conversation.
   */
  private nextSlot(slots: Slots, canReplyLater: boolean): string | null {
    const order = canReplyLater ? SLOT_ORDER : (['phone', ...SLOT_ORDER.filter((s) => s !== 'phone')] as const);
    return order.find((s) => !slots[s as keyof Slots]) ?? null;
  }

  private slotLabel(slot: string): string {
    const map: Record<string, string> = {
      reasonSummary: 'سبب الزيارة (عام)',
      visitType: 'كشف أول ولا متابعة',
      specialty: 'التخصص',
      branch: 'الفرع',
      doctorPreference: 'تفضيل دكتور معيّن',
      preferredDate: 'اليوم المفضل',
      preferredTime: 'الوقت المفضل',
      patientName: 'اسم المريض',
      phone: 'رقم التليفون',
    };
    return map[slot] ?? slot;
  }

  private ar(value: unknown): string {
    if (value && typeof value === 'object' && 'ar' in (value as Record<string, unknown>)) {
      return String((value as Record<string, unknown>).ar ?? '');
    }
    return String(value ?? '');
  }
}
