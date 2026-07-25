import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMedicalCenterDto } from './dto/create-medical-center.dto';
import { UpdateMedicalCenterDto } from './dto/update-medical-center.dto';
import {
  parsePagination,
  parseSortOrder,
  parseStatusFilter,
} from '../../common/helpers/pagination.helper';
import { RESOURCE_PATHS, SUPPORTED_LOCALES } from '../../common/helpers/slug.helper';

@Injectable()
export class MedicalCentersService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: any, filter: any, isAdmin = false) {
    const { page, pageSize, skip, take } = parsePagination(query);
    const orderBy = parseSortOrder(query.sortBy, query.sortDir, ['createdAt', 'updatedAt', 'slug']);
    const statuses = parseStatusFilter(filter, ['DRAFT', 'PUBLISHED', 'ARCHIVED']);

    const where: any = {};
    if (!isAdmin) where.status = 'PUBLISHED';
    if (isAdmin && statuses?.length) where.status = { in: statuses };
    if (query.isFeatured === 'true') where.isFeatured = true;
    if (query.search) {
      where.OR = [
        { slug: { contains: query.search, mode: 'insensitive' } },
        { name: { path: ['ar'], string_contains: query.search } },
        { name: { path: ['en'], string_contains: query.search } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.medicalCenter.findMany({
        where,
        skip,
        take,
        orderBy,
        include: { hospitals: { include: { hospital: { select: { id: true, slug: true, name: true } } } } },
      }),
      this.prisma.medicalCenter.count({ where }),
    ]);

    return { data, page, pageSize, total };
  }

  async findOne(id: string) {
    const center = await this.prisma.medicalCenter.findUnique({
      where: { id },
      include: {
        hospitals: { include: { hospital: true } },
        clinics: true,
        doctors: { include: { doctor: { select: { id: true, slug: true, name: true, specialty: true, photo: true } } } },
      },
    });
    if (!center) throw new NotFoundException('Medical center not found');
    return center;
  }

  async findBySlug(slug: string) {
    const center = await this.prisma.medicalCenter.findUnique({
      where: { slug },
      include: {
        hospitals: { include: { hospital: { select: { id: true, slug: true, name: true } } } },
        clinics: true,
        doctors: { include: { doctor: { select: { id: true, slug: true, name: true, specialty: true, photo: true } } } },
      },
    });
    if (!center || center.status !== 'PUBLISHED') throw new NotFoundException('Medical center not found');
    return center;
  }

  async create(dto: CreateMedicalCenterDto) {
    const existing = await this.prisma.medicalCenter.findUnique({ where: { slug: dto.slug } });
    if (existing) throw new ConflictException('A medical center with this slug already exists');

    const { hospitalIds, ...centerData } = dto;

    return this.prisma.$transaction(async (tx) => {
      const center = await tx.medicalCenter.create({ data: centerData as any });

      if (hospitalIds?.length) {
        await tx.hospitalMedicalCenter.createMany({
          data: hospitalIds.map((hospitalId) => ({ hospitalId, medicalCenterId: center.id })),
          skipDuplicates: true,
        });
      }

      return tx.medicalCenter.findUnique({
        where: { id: center.id },
        include: { hospitals: { include: { hospital: true } } },
      });
    });
  }

  async update(id: string, dto: UpdateMedicalCenterDto) {
    const existing = await this.prisma.medicalCenter.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Medical center not found');

    const slugChanged = dto.slug && dto.slug !== existing.slug;
    if (slugChanged) {
      const conflict = await this.prisma.medicalCenter.findUnique({ where: { slug: dto.slug } });
      if (conflict) throw new ConflictException('A medical center with this slug already exists');
    }

    const { hospitalIds, ...centerData } = dto;

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.medicalCenter.update({ where: { id }, data: centerData as any });

      if (hospitalIds !== undefined) {
        await tx.hospitalMedicalCenter.deleteMany({ where: { medicalCenterId: id } });
        if (hospitalIds.length) {
          await tx.hospitalMedicalCenter.createMany({
            data: hospitalIds.map((hospitalId) => ({ hospitalId, medicalCenterId: id })),
            skipDuplicates: true,
          });
        }
      }

      if (slugChanged) {
        await tx.slugHistory.create({
          data: { entity: 'MedicalCenter', entityId: id, oldSlug: existing.slug, newSlug: dto.slug! },
        });
        for (const locale of SUPPORTED_LOCALES) {
          const fromPath = `/${locale}/${RESOURCE_PATHS.MedicalCenter}/${existing.slug}`;
          const toPath = `/${locale}/${RESOURCE_PATHS.MedicalCenter}/${dto.slug}`;
          await tx.redirect.upsert({
            where: { fromPath },
            create: { fromPath, toPath, statusCode: 301 },
            update: { toPath },
          });
        }
      }

      return tx.medicalCenter.findUnique({
        where: { id },
        include: { hospitals: { include: { hospital: true } } },
      });
    });
  }

  async publish(id: string) {
    const center = await this.prisma.medicalCenter.findUnique({
      where: { id },
      include: { hospitals: true },
    });
    if (!center) throw new NotFoundException('Medical center not found');

    const name = center.name as any;
    if (!name?.ar || !name?.en) {
      throw new BadRequestException({
        code: 'INCOMPLETE_CONTENT',
        message: 'Both Arabic and English names are required before publishing.',
      });
    }

    if (!center.hospitals.length) {
      throw new BadRequestException({
        code: 'INCOMPLETE_CONTENT',
        message: 'Medical center must be linked to at least one hospital before publishing.',
      });
    }

    const updated = await this.prisma.medicalCenter.update({
      where: { id },
      data: { status: 'PUBLISHED' },
    });

    return { status: updated.status };
  }

  async remove(id: string) {
    const center = await this.prisma.medicalCenter.findUnique({ where: { id } });
    if (!center) throw new NotFoundException('Medical center not found');

    if (center.status === 'PUBLISHED') {
      throw new ConflictException('Cannot delete a published medical center. Archive it first.');
    }

    const appointmentCount = await this.prisma.appointmentRequest.count({ where: { medicalCenterId: id } });
    if (appointmentCount > 0) {
      throw new ConflictException(
        `Cannot delete: ${appointmentCount} appointment request(s) reference this medical center.`,
      );
    }

    await this.prisma.medicalCenter.delete({ where: { id } });
    return { deleted: true };
  }
}
