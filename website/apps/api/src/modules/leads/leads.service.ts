import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateAppointmentStatusDto, MarkContactReadDto } from './dto/update-lead-status.dto';
import { parsePagination, parseStatusFilter } from '../../common/helpers/pagination.helper';

@Injectable()
export class LeadsService {
  constructor(private prisma: PrismaService) {}

  // ─── Appointments ─────────────────────────────────────────────────────────

  async createAppointment(dto: CreateAppointmentDto) {
    return this.prisma.appointmentRequest.create({ data: dto as any });
  }

  async updateAppointmentAnswers(id: string, answers: Record<string, any>) {
    const appt = await this.prisma.appointmentRequest.findUnique({
      where: { id },
      select: { id: true, status: true, createdAt: true },
    });
    if (!appt) throw new NotFoundException('Appointment not found');

    // Only the initial booking flow may attach answers — once staff has
    // progressed the request, the answers are considered final.
    if (appt.status !== 'NEW') {
      throw new ForbiddenException('This appointment can no longer be updated');
    }

    // Booking form step 2 is expected to complete within minutes of step 1.
    // This closes the window an attacker would have to guess/replay an id.
    const ANSWERS_WINDOW_MS = 30 * 60 * 1000;
    if (Date.now() - appt.createdAt.getTime() > ANSWERS_WINDOW_MS) {
      throw new ForbiddenException('The time window to submit answers has expired');
    }

    const serialized = JSON.stringify(answers ?? {});
    if (serialized.length > 20_000) {
      throw new BadRequestException('Answers payload is too large');
    }

    await this.prisma.appointmentRequest.update({
      where: { id },
      data: { answers },
    });

    // Do not echo back the record — it contains the patient's name/phone/email.
    return { ok: true };
  }

  async findAllAppointments(query: any, filter: any) {
    const { page, pageSize, skip, take } = parsePagination(query);
    const statuses = parseStatusFilter(filter, ['NEW', 'CONTACTED', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'ATTENDED', 'NO_SHOW']);

    const where: any = {};
    if (statuses?.length) where.status = { in: statuses };
    if (filter?.hospitalId) where.hospitalId = filter.hospitalId;
    if (filter?.doctorId) where.doctorId = filter.doctorId;
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { phone: { contains: query.search } },
        { email: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.appointmentRequest.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          hospital: { select: { id: true, slug: true, name: true } },
          medicalCenter: { select: { id: true, slug: true, name: true } },
          doctor: { select: { id: true, slug: true, name: true } },
        },
      }),
      this.prisma.appointmentRequest.count({ where }),
    ]);

    return { data, page, pageSize, total };
  }

  async findOneAppointment(id: string) {
    const appt = await this.prisma.appointmentRequest.findUnique({
      where: { id },
      include: {
        hospital: true,
        medicalCenter: true,
        doctor: true,
      },
    });
    if (!appt) throw new NotFoundException('Appointment not found');
    return appt;
  }

  async updateAppointmentStatus(id: string, dto: UpdateAppointmentStatusDto) {
    await this.findOneAppointment(id);
    return this.prisma.appointmentRequest.update({
      where: { id },
      data: { 
        status: dto.status,
        ...(dto.notes !== undefined && { notes: dto.notes }),
      },
    });
  }

  async deleteAppointment(id: string) {
    await this.findOneAppointment(id);
    return this.prisma.appointmentRequest.delete({ where: { id } });
  }

  // ─── Contact Submissions ──────────────────────────────────────────────────

  async createContact(dto: CreateContactDto) {
    return this.prisma.contactSubmission.create({ data: dto as any });
  }

  async findAllContacts(query: any, filter: any) {
    const { page, pageSize, skip, take } = parsePagination(query);

    const where: any = {};
    if (filter?.isRead !== undefined) where.isRead = filter.isRead === 'true' || filter.isRead === true;
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
        { phone: { contains: query.search } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.contactSubmission.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.contactSubmission.count({ where }),
    ]);

    return { data, page, pageSize, total };
  }

  async findOneContact(id: string) {
    const msg = await this.prisma.contactSubmission.findUnique({ where: { id } });
    if (!msg) throw new NotFoundException('Contact submission not found');
    return msg;
  }

  async markContactRead(id: string, dto: MarkContactReadDto) {
    await this.findOneContact(id);
    return this.prisma.contactSubmission.update({
      where: { id },
      data: { isRead: dto.isRead ?? true },
    });
  }
}
