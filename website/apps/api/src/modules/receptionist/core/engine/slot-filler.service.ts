import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { ReceptionistConfigService } from '../receptionist-config.service';
import { REQUIRED_FOR_HANDOFF, SLOT_ORDER, SlotName, Slots } from '../types';

/**
 * Extracts what the patient has told us into structured slots.
 *
 * Two mechanisms, chosen per slot by which is more reliable:
 *
 *   phone  — regex. An Egyptian mobile is a fixed shape and a model that
 *            "helpfully" tidies a digit produces a number that does not ring.
 *   others — the utility model (Haiku), on its own small prompt. Because it
 *            shares no prefix with the conversation, running it costs nothing
 *            in cache terms — this is the split that makes a cheaper model
 *            actually save money instead of thrashing the cache.
 */
@Injectable()
export class SlotFillerService {
  private readonly logger = new Logger(SlotFillerService.name);

  /** 010/011/012/015 + 8 digits, with or without +20 / 0020 and any separators. */
  private static readonly EG_MOBILE = /(?:\+?20|0020)?\s*0?1[0125][\s-]?\d{4}[\s-]?\d{4}/g;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ReceptionistConfigService,
  ) {}

  /** Deterministic pass. Runs always, cannot fail, needs no network. */
  extractDeterministic(text: string, current: Slots): Slots {
    const out: Slots = { ...current };

    if (!out.phone) {
      const matches = text.match(SlotFillerService.EG_MOBILE);
      if (matches?.length) {
        const digits = matches[0].replace(/\D/g, '');
        // Normalise to local 11-digit form: strip a country code if present.
        const local = digits.startsWith('20') ? '0' + digits.slice(2) : digits.startsWith('0') ? digits : '0' + digits;
        if (/^01[0125]\d{8}$/.test(local)) out.phone = local;
      }
    }

    if (!out.visitType) {
      const n = text.toLowerCase();
      if (/كشف\s*(اول|أول|جديد)/.test(n)) out.visitType = 'كشف أول';
      else if (/متابعه|متابعة|اعاده|إعادة/.test(n)) out.visitType = 'متابعة';
    }

    return out;
  }

  /**
   * Model pass for the slots that need language understanding. Best-effort: a
   * failure here degrades slot filling, it does not fail the turn.
   */
  async extractWithModel(recentExchange: string, current: Slots): Promise<Slots> {
    const missing = SLOT_ORDER.filter((s) => !current[s] && s !== 'phone');
    if (missing.length === 0) return current;

    const key = await this.anthropicKey();
    if (!key) return current;

    const prompt =
      `استخرج المعلومات دي من كلام المريض لو موجودة. رد JSON بس، من غير أي كلام تاني.\n` +
      `المفاتيح المطلوبة (سيب أي مفتاح مش موجود في الكلام): ${missing.join(', ')}\n\n` +
      `الكلام:\n${recentExchange}`;

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
        body: JSON.stringify({
          model: this.config.utilityModel,
          max_tokens: 300,
          messages: [{ role: 'user', content: prompt }],
          output_config: {
            format: {
              type: 'json_schema',
              schema: {
                type: 'object',
                properties: Object.fromEntries(missing.map((m) => [m, { type: 'string' }])),
                additionalProperties: false,
              },
            },
          },
        }),
      });
      if (!res.ok) return current;

      const data = (await res.json()) as { content?: Array<{ type: string; text?: string }> };
      const raw = (data.content ?? []).find((b) => b.type === 'text')?.text ?? '{}';
      const parsed = JSON.parse(raw) as Record<string, string>;

      const out: Slots = { ...current };
      for (const [k, v] of Object.entries(parsed)) {
        if (v && typeof v === 'string' && v.trim() && SLOT_ORDER.includes(k as SlotName)) {
          out[k as SlotName] = v.trim();
        }
      }
      return out;
    } catch (e) {
      this.logger.warn(`Slot extraction failed, continuing without it: ${(e as Error).message}`);
      return current;
    }
  }

  /**
   * Whether a lead is complete enough to hand to a human.
   *
   * Deterministic on purpose. A missed handoff is lost revenue and a false one
   * wastes a staff call — neither is a judgement to leave to a model.
   */
  static isHandoffReady(slots: Slots): boolean {
    return REQUIRED_FOR_HANDOFF.every((s) => Boolean(slots[s]?.trim()));
  }

  static missingForHandoff(slots: Slots): SlotName[] {
    return REQUIRED_FOR_HANDOFF.filter((s) => !slots[s]?.trim());
  }

  private async anthropicKey(): Promise<string | null> {
    const p = await this.prisma.aiProvider.findFirst({
      where: {
        isActive: true,
        OR: [
          { name: { contains: 'anthropic', mode: 'insensitive' } },
          { name: { contains: 'claude', mode: 'insensitive' } },
        ],
      },
      orderBy: { priority: 'asc' },
    });
    return p?.apiKey ?? process.env.ANTHROPIC_API_KEY ?? null;
  }
}
