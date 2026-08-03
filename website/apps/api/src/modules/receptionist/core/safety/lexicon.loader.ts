import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';

export interface EmergencyCategory {
  id: string;
  severity: string;
  label: { ar: string; en: string };
  terms: string[];
  /**
   * Fragment groups; every fragment in a group must appear somewhere in the
   * message. This is how Arabic conjugation is covered — ['مش قادر','تنفس']
   * matches أتنفس / تتنفس / يتنفس with one rule.
   */
  cooccurrence?: string[][];
}

export interface SelfHarmResponse {
  template: string | null;
  crisisLine: string | null;
  notifyStaffImmediately: boolean;
  neverQualify: boolean;
  neverBook: boolean;
}

export interface EmergencyLexicon {
  categories: EmergencyCategory[];
  selfHarm: EmergencyCategory & { response: SelfHarmResponse };
  historicalMarkers: { terms: string[] };
  response: {
    template: string | null;
    emergencyNumberNational: string | null;
    emergencyNumberFuture: string | null;
    emergencyNumberDelta: string | null;
    notifyStaffImmediately: boolean;
  };
}

export interface AbuseLexicon {
  abuse: { reviewed: boolean; terms: string[]; policy: Record<string, unknown> };
  spam: { signals: Array<{ id: string; threshold?: number; windowSeconds?: number }> };
  outOfScope: { categories: Array<{ id: string; terms: string[] }> };
}

/**
 * Loads the safety lexicons from `receptionist/safety/`.
 *
 * FAILS CLOSED. If a lexicon is missing or malformed the application refuses to
 * start. The alternative — booting with an empty emergency lexicon — is a
 * receptionist that answers a stroke like a booking enquiry, and it would look
 * completely healthy in every log and every dashboard.
 */
@Injectable()
export class LexiconLoader implements OnModuleInit {
  private readonly logger = new Logger(LexiconLoader.name);

  private emergency!: EmergencyLexicon;
  private abuse!: AbuseLexicon;

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    const dir =
      this.config.get<string>('RECEPTIONIST_SAFETY_DIR') ??
      path.resolve(process.cwd(), '..', '..', '..', 'receptionist', 'safety');

    this.emergency = this.read<EmergencyLexicon>(dir, 'emergency-lexicon.ar.json');
    this.abuse = this.read<AbuseLexicon>(dir, 'abuse-lexicon.ar.json');

    const termCount = this.emergency.categories.reduce((n, c) => n + c.terms.length, 0);
    if (termCount === 0) {
      throw new Error('Emergency lexicon loaded but contains no terms — refusing to start.');
    }

    this.logger.log(`Safety lexicons loaded: ${this.emergency.categories.length} emergency categories, ${termCount} terms`);

    if (this.emergency.response.template === null) {
      this.logger.warn(
        'Emergency response template is unset — the gate will detect emergencies but cannot ' +
          'serve a reply. Fill receptionist/safety/emergency-lexicon.ar.json §response ' +
          '(NEEDS_OPERATOR.md §4) before opening any channel.',
      );
    }
    if (!this.abuse.abuse.reviewed) {
      this.logger.warn('Abuse lexicon has not been reviewed by an Arabic-speaking operator.');
    }
  }

  private read<T>(dir: string, file: string): T {
    const full = path.join(dir, file);
    if (!fs.existsSync(full)) {
      throw new Error(
        `Safety lexicon not found: ${full}\n` +
          `Set RECEPTIONIST_SAFETY_DIR, or run from a checkout where receptionist/safety/ exists.\n` +
          `Refusing to start without it.`,
      );
    }
    try {
      return JSON.parse(fs.readFileSync(full, 'utf8')) as T;
    } catch (e) {
      throw new Error(`Safety lexicon is malformed: ${full}\n${(e as Error).message}`);
    }
  }

  getEmergency(): EmergencyLexicon {
    return this.emergency;
  }

  getAbuse(): AbuseLexicon {
    return this.abuse;
  }

  /** True once an operator has supplied the emergency reply text and numbers. */
  isEmergencyResponseReady(): boolean {
    return this.emergency.response.template !== null;
  }

  /**
   * The medical-emergency reply, with the right number substituted.
   *
   * Returns null while the operator has not written it — the caller then says
   * only that a colleague is coming. Improvising this particular message is the
   * one thing the whole safety layer exists to prevent.
   */
  renderEmergencyReply(hospitalSlug: string | null): string | null {
    const r = this.emergency.response;
    if (!r.template) return null;

    const perHospital =
      hospitalSlug === 'future-hospital'
        ? r.emergencyNumberFuture
        : hospitalSlug === 'delta-hospital'
          ? r.emergencyNumberDelta
          : null;

    const number = perHospital ?? r.emergencyNumberNational ?? '';
    return r.template.replace(/\{\{\s*emergencyNumber\s*\}\}/g, number).trim();
  }

  /** True once a clinician has supplied the self-harm wording. */
  isSelfHarmResponseReady(): boolean {
    return this.emergency.selfHarm.response?.template !== null;
  }

  /**
   * The self-harm reply. Deliberately a different method from the emergency
   * one, reading a different block, because the two messages must never
   * converge — telling someone in crisis to go to an emergency department is
   * the wrong response.
   */
  renderSelfHarmReply(): string | null {
    const r = this.emergency.selfHarm.response;
    if (!r?.template) return null;
    return r.template.replace(/\{\{\s*crisisLine\s*\}\}/g, r.crisisLine ?? '').trim();
  }
}
