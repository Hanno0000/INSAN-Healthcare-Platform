import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { parsePagination } from '../../common/helpers/pagination.helper';

@Injectable()
export class FaqsService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: any) {
    const { page, pageSize, skip, take } = parsePagination(query);

    // Public callers pass isActive:true as a real boolean (see listPublic).
    // Admin callers pass raw query params — a filter is optional, and when
    // absent the admin list must show both active and inactive items, or a
    // toggled-off FAQ becomes permanently unreachable from its own list.
    const where: any = {};
    if (query.isActive !== undefined) {
      where.isActive = query.isActive === true || query.isActive === 'true';
    }
    if (query.search) {
      where.OR = [
        { question: { path: ['ar'], string_contains: query.search } },
        { question: { path: ['en'], string_contains: query.search } },
        { answer: { path: ['ar'], string_contains: query.search } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.faqItem.findMany({ where, skip, take, orderBy: { order: 'asc' } }),
      this.prisma.faqItem.count({ where }),
    ]);

    return { data, page, pageSize, total };
  }

  async create(data: any) {
    return this.prisma.faqItem.create({
      data: {
        topic: data.topic,
        question: data.question,
        answer: data.answer,
        order: data.order ?? 0,
        isActive: data.isActive ?? true,
      }
    });
  }

  async update(id: string, data: any) {
    return this.prisma.faqItem.update({
      where: { id },
      data
    });
  }

  async remove(id: string) {
    return this.prisma.faqItem.delete({
      where: { id }
    });
  }
}
