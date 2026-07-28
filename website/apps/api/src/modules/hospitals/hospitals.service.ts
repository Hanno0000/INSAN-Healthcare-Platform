import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateHospitalDto } from './dto/create-hospital.dto';
import { UpdateHospitalDto } from './dto/update-hospital.dto';
import {
  parsePagination,
  parseSortOrder,
  parseStatusFilter,
} from '../../common/helpers/pagination.helper';
import { RESOURCE_PATHS, SUPPORTED_LOCALES } from '../../common/helpers/slug.helper';

@Injectable()
export class HospitalsService {
  constructor(private prisma: PrismaService) {}

  /**
   * يتحقّق من صحة مصفوفة الأقسام قبل الحفظ:
   * كل قسم يجب أن يكون له slug صالح، وكل slug فريد داخل نفس المستشفى.
   */
  private validateDepartments(departments: any): void {
    if (departments === undefined || departments === null) return;
    if (!Array.isArray(departments)) {
      throw new BadRequestException('departments must be an array');
    }
    const seen = new Set<string>();
    for (const [i, dept] of departments.entries()) {
      const slug = dept?.slug;
      if (typeof slug !== 'string' || !/^[a-z0-9-]+$/.test(slug)) {
        throw new BadRequestException(
          `القسم رقم ${i + 1}: الـ slug مطلوب ويجب أن يكون حروفاً إنجليزية صغيرة وأرقاماً وشرطات فقط`,
        );
      }
      if (seen.has(slug)) {
        throw new BadRequestException(`الـ slug "${slug}" مكرّر — يجب أن يكون كل قسم بـ slug فريد`);
      }
      seen.add(slug);
      if (!dept?.name?.ar) {
        throw new BadRequestException(`القسم "${slug}": الاسم بالعربية مطلوب`);
      }
    }
  }

  async findAll(query: any, filter: any, isAdmin = false) {
    const { page, pageSize, skip, take } = parsePagination(query);
    const orderBy = parseSortOrder(query.sortBy, query.sortDir, ['createdAt', 'updatedAt', 'slug']);
    const statuses = parseStatusFilter(filter, ['DRAFT', 'PUBLISHED', 'ARCHIVED']);

    const where: any = {};
    if (!isAdmin) where.status = 'PUBLISHED';
    if (isAdmin && statuses?.length) where.status = { in: statuses };
    if (query.search) {
      where.OR = [
        { slug: { contains: query.search, mode: 'insensitive' } },
        { name: { path: ['ar'], string_contains: query.search } },
        { name: { path: ['en'], string_contains: query.search } },
        { shortDescription: { path: ['ar'], string_contains: query.search } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.hospital.findMany({ where, skip, take, orderBy }),
      this.prisma.hospital.count({ where }),
    ]);

    return { data, page, pageSize, total };
  }

  async findOne(id: string) {
    const hospital = await this.prisma.hospital.findUnique({
      where: { id },
      include: {
        medicalCenters: { include: { medicalCenter: true } },
        doctors: { include: { doctor: true } },
      },
    });
    if (!hospital) throw new NotFoundException('Hospital not found');
    return hospital;
  }

  async findBySlug(slug: string) {
    const hospital = await this.prisma.hospital.findUnique({
      where: { slug },
      include: {
        // المراكز الطبية التابعة + عيادات كل مركز (للسيكشن 2 و 4)
        medicalCenters: {
          include: {
            medicalCenter: {
              select: {
                id: true,
                slug: true,
                name: true,
                heroImage: true,
                isFeatured: true,
                clinics: {
                  select: { id: true, name: true, schedule: true },
                  orderBy: { createdAt: 'asc' },
                },
              },
            },
          },
        },
        // الأطباء (لصفحة القسم)
        doctors: {
          include: {
            doctor: {
              select: { id: true, slug: true, name: true, specialty: true, photo: true, isFeatured: true },
            },
          },
        },
        // أحدث 4 أخبار مرتبطة بهذا المستشفى (للسيكشن 6)
        // ⚠️ اسم الحقل relatedHospitalId — وليس hospitalId
        newsPosts: {
          where: { status: 'PUBLISHED' },
          select: {
            id: true,
            slug: true,
            title: true,
            excerpt: true,
            featuredImage: true,
            publishedAt: true,
          },
          orderBy: { publishedAt: 'desc' },
          take: 4,
        },
      },
    });
    if (!hospital || hospital.status !== 'PUBLISHED') {
      throw new NotFoundException('Hospital not found');
    }
    return hospital;
  }

  async create(dto: CreateHospitalDto) {
    const existing = await this.prisma.hospital.findUnique({ where: { slug: dto.slug } });
    if (existing) throw new ConflictException('A hospital with this slug already exists');

    this.validateDepartments((dto as any).departments);

    return this.prisma.hospital.create({ data: dto as any });
  }

  async update(id: string, dto: UpdateHospitalDto) {
    const existing = await this.prisma.hospital.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Hospital not found');

    this.validateDepartments((dto as any).departments);

    const slugChanged = dto.slug && dto.slug !== existing.slug;
    if (slugChanged) {
      const conflict = await this.prisma.hospital.findUnique({ where: { slug: dto.slug } });
      if (conflict) throw new ConflictException('A hospital with this slug already exists');
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.hospital.update({ where: { id }, data: dto as any });

      if (slugChanged) {
        await tx.slugHistory.create({
          data: { entity: 'Hospital', entityId: id, oldSlug: existing.slug, newSlug: dto.slug! },
        });
        for (const locale of SUPPORTED_LOCALES) {
          const fromPath = `/${locale}/${RESOURCE_PATHS.Hospital}/${existing.slug}`;
          const toPath = `/${locale}/${RESOURCE_PATHS.Hospital}/${dto.slug}`;
          await tx.redirect.upsert({
            where: { fromPath },
            create: { fromPath, toPath, statusCode: 301 },
            update: { toPath },
          });
        }
      }

      return updated;
    });
  }

  async publish(id: string) {
    const hospital = await this.prisma.hospital.findUnique({ where: { id } });
    if (!hospital) throw new NotFoundException('Hospital not found');

    const name = hospital.name as any;
    if (!name?.ar || !name?.en) {
      throw new BadRequestException({
        code: 'INCOMPLETE_CONTENT',
        message: 'Both Arabic and English names are required before publishing.',
      });
    }

    const updated = await this.prisma.hospital.update({
      where: { id },
      data: { status: 'PUBLISHED' },
    });

    return { status: updated.status };
  }

  async unpublish(id: string) {
    const hospital = await this.prisma.hospital.findUnique({ where: { id } });
    if (!hospital) throw new NotFoundException('Hospital not found');
    const updated = await this.prisma.hospital.update({
      where: { id },
      data: { status: 'DRAFT' },
    });
    return { status: updated.status };
  }

  async remove(id: string) {
    const hospital = await this.prisma.hospital.findUnique({ where: { id } });
    if (!hospital) throw new NotFoundException('Hospital not found');

    if (hospital.status === 'PUBLISHED') {
      throw new ConflictException('Cannot delete a published hospital. Archive it first.');
    }

    const appointmentCount = await this.prisma.appointmentRequest.count({ where: { hospitalId: id } });
    if (appointmentCount > 0) {
      throw new ConflictException(
        `Cannot delete: ${appointmentCount} appointment request(s) reference this hospital.`,
      );
    }

    await this.prisma.hospital.delete({ where: { id } });
    return { deleted: true };
  }
}
