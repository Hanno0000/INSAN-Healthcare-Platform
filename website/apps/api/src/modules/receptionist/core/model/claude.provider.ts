import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { ReceptionistConfigService } from '../receptionist-config.service';
import { PromptLayers, TurnMetrics } from '../types';

interface AnthropicUsage {
  input_tokens?: number;
  output_tokens?: number;
  cache_read_input_tokens?: number;
  cache_creation_input_tokens?: number;
}

interface AnthropicResponse {
  content?: Array<{ type: string; text?: string }>;
  stop_reason?: string;
  usage?: AnthropicUsage;
  model?: string;
}

export interface ModelResult {
  text: string;
  metrics: TurnMetrics;
  stopReason: string;
}

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';

/**
 * Claude, with prompt caching arranged around the four prompt layers.
 *
 * The three stable layers each take a cache breakpoint; the volatile layer goes
 * into the user turn and is never cached. Four breakpoints are allowed per
 * request and three are used.
 *
 * TTL is one hour, not the five-minute default. Patients on a messaging surface
 * reply in minutes to hours — with the default the cache expires between turns
 * and every turn then pays full price on the entire prefix. The 1h write costs
 * 2× instead of 1.25×, which is repaid by the second read.
 */
@Injectable()
export class ClaudeProvider {
  private readonly logger = new Logger(ClaudeProvider.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ReceptionistConfigService,
  ) {}

  /**
   * The API key comes from the existing AiProvider table so the operator keeps
   * managing keys in the one admin screen they already have, with the masking
   * and the failover ordering that module already implements.
   */
  private async apiKey(): Promise<string | null> {
    const provider = await this.prisma.aiProvider.findFirst({
      where: {
        isActive: true,
        OR: [
          { name: { contains: 'anthropic', mode: 'insensitive' } },
          { name: { contains: 'claude', mode: 'insensitive' } },
        ],
      },
      orderBy: { priority: 'asc' },
    });
    return provider?.apiKey ?? process.env.ANTHROPIC_API_KEY ?? null;
  }

  async complete(
    layers: PromptLayers,
    history: Array<{ role: 'user' | 'assistant'; content: string }>,
    userMessage: string,
  ): Promise<ModelResult> {
    const key = await this.apiKey();
    if (!key) {
      throw new Error(
        'No Anthropic key configured. Add an active AiProvider named "anthropic" in the admin ' +
          'dashboard, or set ANTHROPIC_API_KEY.',
      );
    }

    const ttl = this.config.cacheTtl;
    const model = this.config.conversationModel;

    // Three breakpoints, in rate-of-change order. Layer 1 is shared by all four
    // surfaces, so it is written once and read by every one of them.
    const system = [
      { type: 'text', text: layers.shared, cache_control: { type: 'ephemeral', ttl } },
      { type: 'text', text: layers.brand, cache_control: { type: 'ephemeral', ttl } },
      { type: 'text', text: layers.knowledge, cache_control: { type: 'ephemeral', ttl } },
    ].filter((b) => b.text && b.text.trim().length > 0);

    // The volatile layer rides with the user's turn, after the last breakpoint,
    // where it is small and cheap. Putting it in `system` would make the whole
    // prefix change every turn and cost roughly 5× per message.
    const messages = [
      ...history.map((h) => ({ role: h.role, content: h.content })),
      { role: 'user' as const, content: `${layers.volatile}\n\n---\n\nرسالة المريض:\n${userMessage}` },
    ];

    const startedAt = Date.now();
    const res = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'x-api-key': key,
        'anthropic-version': ANTHROPIC_VERSION,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model,
        max_tokens: 1024,
        system,
        messages,
        // A receptionist reply is short, scoped and latency-sensitive. Effort is
        // the tuning knob if grounding discipline turns out to need more.
        output_config: { effort: 'low' },
      }),
    });

    const latencyMs = Date.now() - startedAt;

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Anthropic ${res.status}: ${body.slice(0, 400)}`);
    }

    const data = (await res.json()) as AnthropicResponse;

    // A refusal returns HTTP 200 with an empty content array. Reading
    // content[0] unconditionally would throw on exactly the responses that most
    // need handling.
    if (data.stop_reason === 'refusal') {
      this.logger.warn('Model declined the request.');
      return {
        text: '',
        stopReason: 'refusal',
        metrics: this.metrics(model, data.usage, latencyMs),
      };
    }

    const text = (data.content ?? [])
      .filter((b) => b.type === 'text')
      .map((b) => b.text ?? '')
      .join('')
      .trim();

    const metrics = this.metrics(data.model ?? model, data.usage, latencyMs);
    this.warnOnColdCache(metrics);

    return { text, stopReason: data.stop_reason ?? 'end_turn', metrics };
  }

  private metrics(model: string, usage: AnthropicUsage | undefined, latencyMs: number): TurnMetrics {
    return {
      modelUsed: model,
      inputTokens: usage?.input_tokens ?? 0,
      outputTokens: usage?.output_tokens ?? 0,
      cachedTokens: usage?.cache_read_input_tokens ?? 0,
      latencyMs,
    };
  }

  /**
   * A cache that never reads is the single most expensive failure mode here,
   * and it is invisible — the replies are fine, the bill is several times what
   * it should be. Surfacing it per-turn is how it gets noticed at all.
   */
  private warnOnColdCache(m: TurnMetrics): void {
    const total = m.inputTokens + m.cachedTokens;
    if (total < 2000) return; // first turns are legitimately cold
    const ratio = m.cachedTokens / total;
    if (ratio < this.config.minCacheHitRatio) {
      this.logger.warn(
        `Cache read ratio ${(ratio * 100).toFixed(0)}% is below ${(this.config.minCacheHitRatio * 100).toFixed(0)}% ` +
          `(${m.cachedTokens} cached / ${total} total). Something volatile is in the cached prefix — ` +
          `check for a timestamp, an id, or non-deterministic ordering in layers 1–3.`,
      );
    }
  }
}
