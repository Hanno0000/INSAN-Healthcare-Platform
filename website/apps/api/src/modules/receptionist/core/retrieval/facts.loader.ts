import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { FactConfidence } from '../types';

interface HospitalFactsFile {
  hospitals: HospitalFacts[];
  conflicts: Array<{ id: string; severity: string; subject: string; status: string }>;
}

export interface HospitalFacts {
  slug: string;
  brandCode: string;
  name: { ar: string; en: string };
  managedBy?: { ar: string; en: string };
  location: { governorate: string; district: string; address: { ar: string; en: string }; confidence: FactConfidence; note?: string };
  contact: { phones?: string[]; whatsapp?: string; website?: string; email?: string; confidence: FactConfidence; note?: string };
  hours: Record<string, { ar: string; en: string; confidence: FactConfidence }>;
  capacity: Record<string, { value: unknown; confidence: FactConfidence; note?: string }>;
  services: Record<string, unknown>;
  medicalCenters: { confidence: FactConfidence; centerIds: string[]; note?: string };
}

/**
 * Hospital-level facts, from `receptionist/data/hospitals.json`.
 *
 * That file — not the website database — is the source of truth for these. The
 * database was populated with placeholder data to exercise the admin panel
 * (operator, 2026-08-03) and still records Delta in the wrong governorate.
 *
 * Clinic schedules and doctors continue to come from the database, because
 * those are edited daily by staff and must land without a deploy.
 */
@Injectable()
export class FactsLoader implements OnModuleInit {
  private readonly logger = new Logger(FactsLoader.name);
  private facts!: HospitalFactsFile;

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    const dir =
      this.config.get<string>('RECEPTIONIST_DATA_DIR') ??
      path.resolve(process.cwd(), '..', '..', '..', 'receptionist', 'data');
    const full = path.join(dir, 'hospitals.json');

    if (!fs.existsSync(full)) {
      throw new Error(`Hospital facts not found: ${full}\nSet RECEPTIONIST_DATA_DIR. Refusing to start.`);
    }
    this.facts = JSON.parse(fs.readFileSync(full, 'utf8')) as HospitalFactsFile;

    const open = this.facts.conflicts.filter((c) => c.status === 'open');
    this.logger.log(`Hospital facts loaded: ${this.facts.hospitals.length} hospitals, ${open.length} open conflict(s)`);
    for (const c of open) {
      this.logger.warn(`Open conflict ${c.id} (${c.severity}): ${c.subject} — dependent facts are withheld from patients.`);
    }
  }

  bySlug(slug: string): HospitalFacts | null {
    return this.facts.hospitals.find((h) => h.slug === slug) ?? null;
  }

  openConflictCount(): number {
    return this.facts.conflicts.filter((c) => c.status === 'open').length;
  }

  /**
   * Whether a fact at this confidence may be said to a patient.
   *
   * `conflict` never may: two source documents disagree, and a receptionist
   * stating a contested fact confidently is worse than one that offers to
   * check. `provisional` never may either — it is placeholder data.
   */
  static isServable(confidence: FactConfidence): boolean {
    return confidence === 'stated' || confidence === 'derived';
  }
}
