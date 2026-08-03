import { Injectable } from '@nestjs/common';
import { ConversationScopeState } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { SafetyGateService } from '../safety/safety-gate.service';
import { RetrievalQuery, RetrievalSource, RetrievedRecord, SourceKind } from '../types';
import { FactsLoader } from './facts.loader';

/**
 * Facts with exactly one correct answer: a clinic's hours, a branch address,
 * which centers a hospital operates.
 *
 * These never go through a vector search. "Nearest match" on a clinic schedule
 * is a confidently wrong appointment time, and the patient finds out by
 * arriving at a closed door.
 *
 * SCOPE IS ENFORCED HERE, in the query. Every clinic, doctor and center lookup
 * is filtered by `hospitalId` before results exist. The model is never shown a
 * Delta-only center while serving the Future page, so it cannot offer one — as
 * opposed to being told not to, which holds until it doesn't.
 */
@Injectable()
export class DeterministicSource implements RetrievalSource {
  readonly kind: SourceKind = 'DETERMINISTIC';

  constructor(
    private readonly prisma: PrismaService,
    private readonly facts: FactsLoader,
  ) {}

  async retrieve(query: RetrievalQuery): Promise<RetrievedRecord[]> {
    // Nothing scoped can be answered before a hospital is known. Returning
    // ecosystem-level facts here instead would let an unresolved conversation
    // quote a clinic schedule that may belong to the wrong governorate.
    if (query.scopeState !== ConversationScopeState.RESOLVED || !query.hospitalId) {
      return this.ecosystemFacts(query);
    }

    const text = SafetyGateService.normalize(query.text);
    const out: RetrievedRecord[] = [];

    if (this.asksAbout(text, ['عياده', 'ميعاد', 'مواعيد', 'كشف', 'امتي', 'بتفتح', 'ساعه', 'يوم'])) {
      out.push(...(await this.clinics(query.hospitalId)));
    }
    if (this.asksAbout(text, ['دكتور', 'طبيب', 'استشاري', 'اساتذه', 'مين'])) {
      out.push(...(await this.doctors(query.hospitalId)));
    }
    if (this.asksAbout(text, ['مركز', 'مراكز', 'تخصص', 'قسم', 'اقسام'])) {
      out.push(...(await this.centers(query.hospitalId)));
    }
    if (this.asksAbout(text, ['فين', 'عنوان', 'مكان', 'تليفون', 'رقم', 'واتس', 'اتصل'])) {
      out.push(...(await this.contactAndLocation(query.hospitalId)));
    }

    // Hours are cheap and asked about constantly; include them whenever the
    // turn touched anything service-shaped.
    if (out.length > 0) {
      out.push(...(await this.openingHours(query.hospitalId)));
    }

    return out.filter((r) => FactsLoader.isServable(r.confidence));
  }

  private asksAbout(normalizedText: string, keys: string[]): boolean {
    return keys.some((k) => normalizedText.includes(SafetyGateService.normalize(k)));
  }

  private async clinics(hospitalId: string): Promise<RetrievedRecord[]> {
    const clinics = await this.prisma.clinic.findMany({
      where: { hospitalId },
      include: { medicalCenter: true },
    });

    return clinics.map((c) => {
      const name = this.ar(c.name);
      const center = c.medicalCenter ? this.ar(c.medicalCenter.name) : null;
      return {
        id: `clinic:${c.id}`,
        kind: this.kind,
        label: name,
        content:
          `عيادة ${name}` +
          (center ? ` — تابعة لـ${center}` : '') +
          `\nالجدول: ${this.renderSchedule(c.schedule)}`,
        confidence: 'stated' as const,
        sourceRef: `Clinic ${c.id}`,
        similarity: null,
      };
    });
  }

  private async doctors(hospitalId: string): Promise<RetrievedRecord[]> {
    const links = await this.prisma.doctorHospital.findMany({
      where: { hospitalId },
      include: { doctor: true },
      take: 40,
    });

    return links
      .filter((l) => l.doctor.status === 'PUBLISHED')
      .map((l) => ({
        id: `doctor:${l.doctor.id}`,
        kind: this.kind,
        label: this.ar(l.doctor.name),
        content: `${this.ar(l.doctor.name)}${l.doctor.title ? ` — ${this.ar(l.doctor.title)}` : ''}${
          l.doctor.specialty ? ` — ${this.ar(l.doctor.specialty)}` : ''
        }`,
        confidence: 'stated' as const,
        sourceRef: `Doctor ${l.doctor.id}`,
        similarity: null,
      }));
  }

  private async centers(hospitalId: string): Promise<RetrievedRecord[]> {
    const links = await this.prisma.hospitalMedicalCenter.findMany({
      where: { hospitalId },
      include: { medicalCenter: true },
    });

    return links
      .filter((l) => l.medicalCenter.status === 'PUBLISHED')
      .map((l) => ({
        id: `center:${l.medicalCenter.id}`,
        kind: this.kind,
        label: this.ar(l.medicalCenter.name),
        content: this.ar(l.medicalCenter.name),
        confidence: 'stated' as const,
        sourceRef: `MedicalCenter ${l.medicalCenter.id}`,
        similarity: null,
      }));
  }

  private async contactAndLocation(hospitalId: string): Promise<RetrievedRecord[]> {
    const hospital = await this.prisma.hospital.findUnique({ where: { id: hospitalId } });
    if (!hospital) return [];

    const f = this.facts.bySlug(hospital.slug);
    if (!f) return [];

    const out: RetrievedRecord[] = [
      {
        id: `location:${hospital.slug}`,
        kind: this.kind,
        label: 'العنوان',
        content: `${this.ar(f.name)} — ${f.location.address.ar}`,
        confidence: f.location.confidence,
        sourceRef: `hospitals.json ${f.slug}.location`,
        similarity: null,
      },
    ];

    // Phone numbers carry their own confidence: Future's are recorded as a
    // conflict (nine digits where Cairo landlines have eight), and a wrong
    // number turns a qualified lead into a dead end.
    if (f.contact.phones?.length) {
      out.push({
        id: `contact:${hospital.slug}`,
        kind: this.kind,
        label: 'أرقام التواصل',
        content:
          `التليفون: ${f.contact.phones.join(' · ')}` +
          (f.contact.whatsapp ? `\nواتساب: ${f.contact.whatsapp}` : ''),
        confidence: f.contact.confidence,
        sourceRef: `hospitals.json ${f.slug}.contact`,
        similarity: null,
      });
    }

    return out;
  }

  private async openingHours(hospitalId: string): Promise<RetrievedRecord[]> {
    const hospital = await this.prisma.hospital.findUnique({ where: { id: hospitalId } });
    const f = hospital ? this.facts.bySlug(hospital.slug) : null;
    if (!f) return [];

    return Object.entries(f.hours)
      .filter(([, v]) => FactsLoader.isServable(v.confidence))
      .map(([key, v]) => ({
        id: `hours:${f.slug}:${key}`,
        kind: this.kind,
        label: key,
        content: `${this.hoursLabel(key)}: ${v.ar}`,
        confidence: v.confidence,
        sourceRef: `hospitals.json ${f.slug}.hours.${key}`,
        similarity: null,
      }));
  }

  /** Facts true of the whole ecosystem — safe before a hospital is known. */
  private async ecosystemFacts(query: RetrievalQuery): Promise<RetrievedRecord[]> {
    const text = SafetyGateService.normalize(query.text);
    if (!this.asksAbout(text, ['انسان', 'مستشفي', 'مستشفيات', 'منظومه', 'ايه هي', 'مين انتم'])) {
      return [];
    }

    const hospitals = await this.prisma.hospital.findMany({ where: { status: 'PUBLISHED' } });
    return hospitals
      .map((h) => {
        const f = this.facts.bySlug(h.slug);
        if (!f) return null;
        return {
          id: `hospital:${h.slug}`,
          kind: this.kind,
          label: this.ar(f.name),
          content: `${this.ar(f.name)} — ${f.location.district}، ${f.location.governorate}`,
          confidence: f.location.confidence,
          sourceRef: `hospitals.json ${f.slug}`,
          similarity: null,
        } as RetrievedRecord;
      })
      .filter((r): r is RetrievedRecord => r !== null && FactsLoader.isServable(r.confidence));
  }

  private hoursLabel(key: string): string {
    const map: Record<string, string> = {
      outpatientClinics: 'العيادات الخارجية',
      emergency: 'الطوارئ',
      laboratory: 'المعمل',
    };
    return map[key] ?? key;
  }

  /** Bilingual JSON fields are `{ar, en}`; the receptionist speaks Arabic. */
  private ar(value: unknown): string {
    if (value && typeof value === 'object' && 'ar' in (value as Record<string, unknown>)) {
      return String((value as Record<string, unknown>).ar ?? '');
    }
    return String(value ?? '');
  }

  private renderSchedule(schedule: unknown): string {
    if (!Array.isArray(schedule) || schedule.length === 0) return 'غير محدد';
    return schedule
      .map((s: Record<string, unknown>) => `${s.day ?? '?'} من ${s.from ?? '?'} إلى ${s.to ?? '?'}`)
      .join(' · ');
  }
}
