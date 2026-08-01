import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClinicDto } from './dto/create-clinic.dto';
import { UpdateClinicDto } from './dto/update-clinic.dto';

@Injectable()
export class ClinicsService {
  constructor(private prisma: PrismaService) {}

  private async assertCenter(centerId: string) {
    const center = await this.prisma.medicalCenter.findUnique({ where: { id: centerId } });
    if (!center) throw new NotFoundException('Medical center not found');
    return center;
  }

  private validateSchedule(schedule: any[]) {
    const days = schedule.map((s) => s.day);
    const unique = new Set(days);
    if (unique.size !== days.length) {
      throw new BadRequestException('Duplicate days are not allowed in the clinic schedule.');
    }
    for (const entry of schedule) {
      if (!entry.closed && entry.from && entry.to && entry.from >= entry.to) {
        throw new BadRequestException(`Schedule entry for ${entry.day}: "from" must be earlier than "to".`);
      }
    }
  }

  async findAllPublic() {
    return this.prisma.clinic.findMany({
      include: {
        hospital: { select: { id: true, slug: true, name: true } },
        medicalCenter: { select: { id: true, slug: true, name: true } },
      }
    });
  }

  async findAll(centerId: string) {
    await this.assertCenter(centerId);
    return this.prisma.clinic.findMany({ where: { medicalCenterId: centerId } });
  }

  async findOne(centerId: string, id: string) {
    await this.assertCenter(centerId);
    const clinic = await this.prisma.clinic.findFirst({ where: { id, medicalCenterId: centerId } });
    if (!clinic) throw new NotFoundException('Clinic not found');
    return clinic;
  }

  async create(centerId: string, dto: CreateClinicDto) {
    await this.assertCenter(centerId);
    this.validateSchedule(dto.schedule);

    let hospitalId = dto.hospitalId;
    if (!hospitalId) {
      const center = await this.prisma.medicalCenter.findUnique({
        where: { id: centerId },
        include: { hospitals: true }
      });
      if (center?.hospitals && center.hospitals.length > 0) {
        hospitalId = center.hospitals[0].hospitalId;
      } else {
        throw new BadRequestException('hospitalId is required');
      }
    }

    return this.prisma.clinic.create({
      data: { 
        medicalCenterId: centerId, 
        hospitalId,
        name: dto.name as any, 
        schedule: dto.schedule as any 
      },
    });
  }

  async update(centerId: string, id: string, dto: UpdateClinicDto) {
    await this.findOne(centerId, id);
    if (dto.schedule) this.validateSchedule(dto.schedule);
    return this.prisma.clinic.update({
      where: { id },
      data: {
        ...(dto.hospitalId ? { hospitalId: dto.hospitalId } : {}),
        ...(dto.name ? { name: dto.name as any } : {}),
        ...(dto.schedule ? { schedule: dto.schedule as any } : {}),
      },
    });
  }

  async remove(centerId: string, id: string) {
    await this.findOne(centerId, id);
    await this.prisma.clinic.delete({ where: { id } });
    return { deleted: true };
  }
}
