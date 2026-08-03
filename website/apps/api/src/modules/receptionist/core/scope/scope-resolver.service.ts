import { Injectable, Logger } from '@nestjs/common';
import { ConversationScopeState, EntryMode } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { SafetyGateService } from '../safety/safety-gate.service';
import { ConversationScope, GeographyMatch } from '../types';

@Injectable()
export class ScopeResolverService {
  private readonly logger = new Logger(ScopeResolverService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * The scope a conversation starts in.
   *
   * DIRECT surfaces (a hospital's own page) start RESOLVED — the page *is* the
   * scope. ROUTER surfaces (INSAN) start UNRESOLVED and stay there until the
   * patient shows service intent; see resolveFromText.
   */
  async initialScope(brandId: string): Promise<ConversationScope> {
    const persona = await this.prisma.brandPersona.findUnique({ where: { brandId } });

    if (!persona) {
      this.logger.warn(`No BrandPersona for brand ${brandId} — defaulting to UNRESOLVED.`);
      return { state: ConversationScopeState.UNRESOLVED, hospitalId: null, candidateHospitalIds: [] };
    }

    if (persona.entryMode === EntryMode.ROUTER) {
      return { state: ConversationScopeState.UNRESOLVED, hospitalId: null, candidateHospitalIds: [] };
    }

    const hospitalId = await this.hospitalIdForBrand(brandId);
    if (!hospitalId) {
      // A DIRECT surface with no hospital behind it cannot answer anything
      // scoped. Better to sit in UNRESOLVED and say so than to answer from the
      // whole ecosystem while claiming to be one hospital.
      this.logger.error(`DIRECT brand ${brandId} resolves to no hospital — check the brand↔hospital mapping.`);
      return { state: ConversationScopeState.UNRESOLVED, hospitalId: null, candidateHospitalIds: [] };
    }

    return { state: ConversationScopeState.RESOLVED, hospitalId, candidateHospitalIds: [] };
  }

  /**
   * A DIRECT brand's hospital, matched on brand code ↔ hospital slug.
   *
   * FUTURE → future-hospital, DELTA → delta-hospital. Kept as an explicit map
   * rather than a naming convention so a renamed slug fails loudly here instead
   * of silently un-scoping a hospital page.
   */
  private static readonly BRAND_TO_HOSPITAL_SLUG: Record<string, string> = {
    FUTURE: 'future-hospital',
    DELTA: 'delta-hospital',
  };

  private async hospitalIdForBrand(brandId: string): Promise<string | null> {
    const brand = await this.prisma.brand.findUnique({ where: { id: brandId } });
    if (!brand) return null;

    const slug = ScopeResolverService.BRAND_TO_HOSPITAL_SLUG[brand.code];
    if (!slug) return null;

    const hospital = await this.prisma.hospital.findUnique({ where: { slug } });
    return hospital?.id ?? null;
  }

  /**
   * Resolve from a surface hint — on the website, the page the visitor is
   * reading. Someone on the Delta hospital page has already told us which
   * hospital they mean, and asking would be the interrogation the lazy rule
   * exists to avoid.
   *
   * The hint is client-supplied and therefore not trusted blindly: it is
   * accepted only when it names a real published hospital. Worst case a visitor
   * scopes themselves to the other hospital's public information, which is
   * public.
   */
  async resolveFromHint(current: ConversationScope, hospitalSlug: string | undefined): Promise<ConversationScope> {
    if (current.state === ConversationScopeState.RESOLVED || !hospitalSlug) return current;

    const hospital = await this.prisma.hospital.findUnique({ where: { slug: hospitalSlug } });
    if (!hospital || hospital.status !== 'PUBLISHED') return current;

    return { state: ConversationScopeState.RESOLVED, hospitalId: hospital.id, candidateHospitalIds: [] };
  }

  /**
   * Try to resolve a ROUTER conversation from what the patient just wrote.
   *
   * Returns the unchanged scope when nothing matched — resolution is lazy, and
   * a conversation that has not yet needed a hospital should not be pushed into
   * AMBIGUOUS just because this turn contained no place name.
   *
   * AMBIGUOUS is reserved for the case where the patient *did* name somewhere
   * and it maps to nothing, or maps to both. That is the case worth asking
   * about; guessing it is how someone ends up driving to the wrong governorate.
   */
  async resolveFromText(current: ConversationScope, text: string): Promise<ConversationScope> {
    if (current.state === ConversationScopeState.RESOLVED) return current;

    const matches = await this.matchGeography(text);
    if (matches.length === 0) return current;

    const best = matches[0];
    const tied = matches.filter((m) => m.priority === best.priority && m.district === best.district);

    if (tied.length > 1) {
      return {
        state: ConversationScopeState.AMBIGUOUS,
        hospitalId: null,
        candidateHospitalIds: [...new Set(tied.map((m) => m.hospitalId))],
      };
    }

    return { state: ConversationScopeState.RESOLVED, hospitalId: best.hospitalId, candidateHospitalIds: [] };
  }

  /**
   * Match place names in free text against ServiceArea rows.
   *
   * District beats governorate: a message saying "طنطا" must not be resolved by
   * a whole-governorate row for somewhere else that happens to sort first.
   * Within the same specificity, lower `priority` wins.
   */
  async matchGeography(text: string): Promise<GeographyMatch[]> {
    const normalized = SafetyGateService.normalize(text);
    if (!normalized) return [];

    const areas = await this.prisma.serviceArea.findMany({
      where: { isActive: true },
      orderBy: [{ priority: 'asc' }],
    });

    const hits: GeographyMatch[] = [];

    for (const area of areas) {
      const district = area.district ? SafetyGateService.normalize(area.district) : '';
      const governorate = SafetyGateService.normalize(area.governorate);

      if (district && normalized.includes(district)) {
        hits.push({ hospitalId: area.hospitalId, governorate: area.governorate, district: area.district, priority: area.priority });
      } else if (!district && governorate && normalized.includes(governorate)) {
        hits.push({ hospitalId: area.hospitalId, governorate: area.governorate, district: '', priority: area.priority });
      }
    }

    // District matches (non-empty district) before governorate-wide ones, then
    // by priority.
    return hits.sort((a, b) => {
      const specificity = (b.district ? 1 : 0) - (a.district ? 1 : 0);
      return specificity !== 0 ? specificity : a.priority - b.priority;
    });
  }

  /**
   * Whether this turn needs a hospital at all.
   *
   * Questions about the ecosystem itself never do — asking a patient where they
   * live before answering "إيه هي إنسان؟" is exactly the interrogation the
   * lazy-resolution rule exists to prevent.
   */
  needsScope(text: string): boolean {
    const n = SafetyGateService.normalize(text);
    const serviceIntent = [
      'احجز', 'حجز', 'ميعاد', 'موعد', 'كشف', 'دكتور', 'طبيب', 'عياده', 'عيادة',
      'مركز', 'تحليل', 'اشعه', 'عمليه', 'سعر', 'تكلفه', 'كام', 'متاح', 'مواعيد',
    ];
    return serviceIntent.some((t) => n.includes(SafetyGateService.normalize(t)));
  }
}
