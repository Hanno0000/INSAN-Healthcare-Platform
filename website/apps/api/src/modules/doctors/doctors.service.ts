import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDoctorDto } from './dto/create-doctor.dto';
import { UpdateDoctorDto } from './dto/update-doctor.dto';
import {
  parsePagination,
  parseSortOrder,
  parseStatusFilter,
} from '../../common/helpers/pagination.helper';
import { RESOURCE_PATHS, SUPPORTED_LOCALES } from '../../common/helpers/slug.helper';

@Injectable()
export class DoctorsService {
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
        { specialty: { path: ['ar'], string_contains: query.search } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.doctor.findMany({
        where, skip, take, orderBy,
        include: {
          hospitals: { include: { hospital: { select: { id: true, slug: true, name: true } } } },
          centers: { include: { medicalCenter: { select: { id: true, slug: true, name: true } } } },
        },
      }),
      this.prisma.doctor.count({ where }),
    ]);

    return { data, page, pageSize, total };
  }

  async findOne(id: string) {
    const doctor = await this.prisma.doctor.findUnique({
      where: { id },
      include: {
        hospitals: { include: { hospital: true } },
        centers: { include: { medicalCenter: true } },
      },
    });
    if (!doctor) throw new NotFoundException('Doctor not found');
    return doctor;
  }

  async findBySlug(slug: string) {
    const doctor = await this.prisma.doctor.findUnique({
      where: { slug },
      include: {
        hospitals: { include: { hospital: { select: { id: true, slug: true, name: true, brandColor: true } } } },
        centers: { include: { medicalCenter: { select: { id: true, slug: true, name: true } } } },
      },
    });
    if (!doctor || doctor.status !== 'PUBLISHED') throw new NotFoundException('Doctor not found');
    return doctor;
  }

  async create(dto: CreateDoctorDto) {
    const existing = await this.prisma.doctor.findUnique({ where: { slug: dto.slug } });
    if (existing) throw new ConflictException('A doctor with this slug already exists');

    const { hospitalIds, medicalCenterIds, ...doctorData } = dto;

    return this.prisma.$transaction(async (tx) => {
      const doctor = await tx.doctor.create({ data: doctorData as any });

      if (hospitalIds?.length) {
        await tx.doctorHospital.createMany({
          data: hospitalIds.map((hospitalId) => ({ doctorId: doctor.id, hospitalId })),
          skipDuplicates: true,
        });
      }
      if (medicalCenterIds?.length) {
        await tx.doctorMedicalCenter.createMany({
          data: medicalCenterIds.map((medicalCenterId) => ({ doctorId: doctor.id, medicalCenterId })),
          skipDuplicates: true,
        });
      }

      return tx.doctor.findUnique({
        where: { id: doctor.id },
        include: {
          hospitals: { include: { hospital: true } },
          centers: { include: { medicalCenter: true } },
        },
      });
    });
  }

  async update(id: string, dto: UpdateDoctorDto) {
    const existing = await this.prisma.doctor.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Doctor not found');

    const slugChanged = dto.slug && dto.slug !== existing.slug;
    if (slugChanged) {
      const conflict = await this.prisma.doctor.findUnique({ where: { slug: dto.slug } });
      if (conflict) throw new ConflictException('A doctor with this slug already exists');
    }

    const { hospitalIds, medicalCenterIds, ...doctorData } = dto;

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.doctor.update({ where: { id }, data: doctorData as any });

      if (hospitalIds !== undefined) {
        await tx.doctorHospital.deleteMany({ where: { doctorId: id } });
        if (hospitalIds.length) {
          await tx.doctorHospital.createMany({
            data: hospitalIds.map((hospitalId) => ({ doctorId: id, hospitalId })),
            skipDuplicates: true,
          });
        }
      }
      if (medicalCenterIds !== undefined) {
        await tx.doctorMedicalCenter.deleteMany({ where: { doctorId: id } });
        if (medicalCenterIds.length) {
          await tx.doctorMedicalCenter.createMany({
            data: medicalCenterIds.map((medicalCenterId) => ({ doctorId: id, medicalCenterId })),
            skipDuplicates: true,
          });
        }
      }

      if (slugChanged) {
        await tx.slugHistory.create({
          data: { entity: 'Doctor', entityId: id, oldSlug: existing.slug, newSlug: dto.slug! },
        });
        for (const locale of SUPPORTED_LOCALES) {
          const fromPath = `/${locale}/${RESOURCE_PATHS.Doctor}/${existing.slug}`;
          const toPath = `/${locale}/${RESOURCE_PATHS.Doctor}/${dto.slug}`;
          await tx.redirect.upsert({
            where: { fromPath },
            create: { fromPath, toPath, statusCode: 301 },
            update: { toPath },
          });
        }
      }

      return tx.doctor.findUnique({
        where: { id: updated.id },
        include: {
          hospitals: { include: { hospital: true } },
          centers: { include: { medicalCenter: true } },
        },
      });
    });
  }

  async publish(id: string) {
    const doctor = await this.prisma.doctor.findUnique({
      where: { id },
      include: { hospitals: true },
    });
    if (!doctor) throw new NotFoundException('Doctor not found');

    const name = doctor.name as any;
    if (!name?.ar || !name?.en) {
      throw new BadRequestException({
        code: 'INCOMPLETE_CONTENT',
        message: 'Both Arabic and English names are required before publishing.',
      });
    }
    if (!doctor.hospitals.length) {
      throw new BadRequestException({
        code: 'INCOMPLETE_CONTENT',
        message: 'Doctor must be linked to at least one hospital before publishing.',
      });
    }

    const updated = await this.prisma.doctor.update({
      where: { id },
      data: { status: 'PUBLISHED' },
    });

    return { status: updated.status };
  }

  async unpublish(id: string) {
    const doctor = await this.prisma.doctor.findUnique({ where: { id } });
    if (!doctor) throw new NotFoundException('Doctor not found');
    const updated = await this.prisma.doctor.update({
      where: { id },
      data: { status: 'DRAFT' },
    });
    return { status: updated.status };
  }

  async remove(id: string) {
    const doctor = await this.prisma.doctor.findUnique({ where: { id } });
    if (!doctor) throw new NotFoundException('Doctor not found');

    if (doctor.status === 'PUBLISHED') {
      throw new ConflictException('Cannot delete a published doctor. Archive them first.');
    }

    const appointmentCount = await this.prisma.appointmentRequest.count({ where: { doctorId: id } });
    if (appointmentCount > 0) {
      throw new ConflictException(
        `Cannot delete: ${appointmentCount} appointment request(s) reference this doctor.`,
      );
    }

    await this.prisma.doctor.delete({ where: { id } });
    return { deleted: true };
  }

  async submitReview(doctorId: string, data: { phone: string; rating: number; comment?: string }) {
    // 1. Find a completed appointment for this doctor and phone
    const appointment = await this.prisma.appointmentRequest.findFirst({
      where: {
        doctorId,
        phone: data.phone,
        status: { in: ['COMPLETED', 'ATTENDED'] },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!appointment) {
      throw new BadRequestException('لم نتمكن من العثور على موعد مكتمل مرتبط برقم الهاتف هذا.');
    }

    // 2. Check if already reviewed
    const existingReview = await this.prisma.doctorReview.findUnique({
      where: { appointmentId: appointment.id },
    });

    if (existingReview) {
      throw new BadRequestException('لقد قمت بتقييم هذه الزيارة مسبقاً.');
    }

    // 3. Create Review
    const review = await this.prisma.doctorReview.create({
      data: {
        doctorId,
        appointmentId: appointment.id,
        phone: data.phone,
        rating: data.rating,
        comment: data.comment,
        status: 'PENDING',
      },
    });

    return review;
  }
}
