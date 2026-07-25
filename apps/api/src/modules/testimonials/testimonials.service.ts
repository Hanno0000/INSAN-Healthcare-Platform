import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTestimonialDto } from './dto/create-testimonial.dto';
import { UpdateTestimonialDto } from './dto/update-testimonial.dto';
import { parsePagination } from '../../common/helpers/pagination.helper';

@Injectable()
export class TestimonialsService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: any, isAdmin = false) {
    const { page, pageSize, skip, take } = parsePagination(query);

    const where: any = {};
    if (!isAdmin) where.status = 'PUBLISHED';
    if (query.audience) where.audience = query.audience.toUpperCase();

    const [data, total] = await Promise.all([
      this.prisma.testimonial.findMany({
        where,
        skip,
        take,
        orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
      }),
      this.prisma.testimonial.count({ where }),
    ]);

    return { data, page, pageSize, total };
  }

  async findOne(id: string) {
    const t = await this.prisma.testimonial.findUnique({ where: { id } });
    if (!t) throw new NotFoundException('Testimonial not found');
    return t;
  }

  async create(dto: CreateTestimonialDto) {
    const maxRow = await this.prisma.testimonial.findFirst({ orderBy: { order: 'desc' } });
    const order = dto.order ?? (maxRow ? maxRow.order + 1 : 1);

    return this.prisma.testimonial.create({
      data: { ...(dto as any), order, status: 'DRAFT' },
    });
  }

  async update(id: string, dto: UpdateTestimonialDto) {
    await this.findOne(id);
    return this.prisma.testimonial.update({ where: { id }, data: dto as any });
  }

  async publish(id: string) {
    await this.findOne(id);
    return this.prisma.testimonial.update({ where: { id }, data: { status: 'PUBLISHED' } });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.testimonial.delete({ where: { id } });
    return { deleted: true };
  }
}
