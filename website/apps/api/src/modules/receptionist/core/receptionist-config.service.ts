import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataMode, ProvisionalDataError, SurfaceTraits } from './types';

/**
 * Configuration and the provisional-data gate.
 *
 * The gate exists because the knowledge base is being built from documents that
 * still disagree with each other — six recorded conflicts as of 2026-08-03, five
 * of them open (receptionist/data/hospitals.json). Development against
 * placeholder data is expected and fine; serving it to a patient on a live page
 * is not.
 *
 * This is the same shape as Campaign OS's `DRY_RUN`: the unsafe state is the
 * default, it is visible, and leaving it takes a deliberate act.
 */
@Injectable()
export class ReceptionistConfigService {
  private readonly logger = new Logger(ReceptionistConfigService.name);

  constructor(private readonly config: ConfigService) {
    if (this.dataMode === 'PROVISIONAL') {
      this.logger.warn(
        'Receptionist data mode is PROVISIONAL — live public channels are refused. ' +
          'Set RECEPTIONIST_DATA_MODE=VERIFIED once the knowledge base is signed off.',
      );
    }
  }

  /** Defaults to PROVISIONAL. An unreadable or unknown value is treated as PROVISIONAL. */
  get dataMode(): DataMode {
    return this.config.get<string>('RECEPTIONIST_DATA_MODE') === 'VERIFIED' ? 'VERIFIED' : 'PROVISIONAL';
  }

  /**
   * Call before serving a turn. Throws rather than returning a boolean: a gate
   * whose result can be ignored is not a gate.
   *
   * Whether a surface is public is declared by its own adapter, not enumerated
   * here. Core holding a channel list would mean a new channel silently
   * bypasses this gate the day someone forgets to extend the list — and the
   * boundary check catches that mistake, which is how this signature came to
   * be shaped this way.
   */
  assertMayServe(surface: SurfaceTraits, label: string): void {
    if (this.dataMode === 'VERIFIED') return;
    if (surface.isPublic) {
      throw new ProvisionalDataError(label);
    }
  }

  /** Model for the conversation itself. One model per conversation — switching mid-conversation invalidates the whole prompt cache. */
  get conversationModel(): string {
    return this.config.get<string>('RECEPTIONIST_MODEL') ?? 'claude-sonnet-5';
  }

  /** Model for side tasks that use their own small prompts: classification, summarisation. */
  get utilityModel(): string {
    return this.config.get<string>('RECEPTIONIST_UTILITY_MODEL') ?? 'claude-haiku-4-5';
  }

  /**
   * Patients reply in minutes to hours. The 5-minute default cache TTL expires
   * between turns and every turn then pays full price on the whole prefix.
   */
  get cacheTtl(): '5m' | '1h' {
    return '1h';
  }

  /**
   * Cache-read ratio below which the prefix is assumed to have a silent
   * invalidator. ARCHITECTURE.md §10 gates phase progress on this.
   */
  get minCacheHitRatio(): number {
    return 0.7;
  }
}
