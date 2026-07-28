import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { parsePagination } from '../../common/helpers/pagination.helper';

@Injectable()
export class FaqsService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: any) {
    const { page, pageSize, skip, take } = parsePagination(query);

    const where: any = { isActive: true };
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
}
