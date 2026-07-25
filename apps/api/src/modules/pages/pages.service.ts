import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePageDto } from './dto/create-page.dto';
import { UpdatePageDto } from './dto/update-page.dto';
import { parsePagination, parseSortOrder, parseStatusFilter } from '../../common/helpers/pagination.helper';
import { SUPPORTED_LOCALES } from '../../common/helpers/slug.helper';

@Injectable()
export class PagesService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: any, filter: any, isAdmin = false) {
    const { page, pageSize, skip, take } = parsePagination(query);
    const orderBy = parseSortOrder(query.sortBy, query.sortDir, ['createdAt', 'updatedAt', 'slug']);
    const statuses = parseStatusFilter(filter, ['DRAFT', 'PUBLISHED', 'ARCHIVED']);

    const where: any = {};
    if (!isAdmin) {
      where.status = 'PUBLISHED';
      where.type = { not: 'hidden' };
    }
    if (isAdmin && statuses?.length) where.status = { in: statuses };
    if (query.search) where.slug = { contains: query.search, mode: 'insensitive' };

    const [data, total] = await Promise.all([
      this.prisma.page.findMany({ where, skip, take, orderBy }),
      this.prisma.page.count({ where }),
    ]);

    return { data, page, pageSize, total };
  }

  async findOne(id: string) {
    const page = await this.prisma.page.findUnique({
      where: { id },
      include: { sections: { orderBy: { order: 'asc' } } },
    });
    if (!page) throw new NotFoundException('Page not found');
    return page;
  }

  async findBySlug(slug: string) {
    const page = await this.prisma.page.findUnique({
      where: { slug },
      include: { sections: { where: { isVisible: true }, orderBy: { order: 'asc' } } },
    });
    if (!page || page.status !== 'PUBLISHED') throw new NotFoundException('Page not found');
    return page;
  }

  async create(dto: CreatePageDto, userId?: string) {
    const existing = await this.prisma.page.findUnique({ where: { slug: dto.slug } });
    if (existing) throw new ConflictException('A page with this slug already exists');

    return this.prisma.page.create({
      data: { ...(dto as any), createdBy: userId ?? null },
    });
  }

  async update(id: string, dto: UpdatePageDto, userId?: string) {
    const existing = await this.prisma.page.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Page not found');

    const slugChanged = dto.slug && dto.slug !== existing.slug;
    if (slugChanged) {
      const conflict = await this.prisma.page.findUnique({ where: { slug: dto.slug } });
      if (conflict) throw new ConflictException('A page with this slug already exists');
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.page.update({
        where: { id },
        data: { ...(dto as any), updatedBy: userId ?? null },
      });

      if (slugChanged) {
        await tx.slugHistory.create({
          data: { entity: 'Page', entityId: id, oldSlug: existing.slug, newSlug: dto.slug! },
        });
        for (const locale of SUPPORTED_LOCALES) {
          const fromPath = `/${locale}/${existing.slug}`;
          const toPath = `/${locale}/${dto.slug}`;
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

  async publish(id: string, userId?: string) {
    const page = await this.prisma.page.findUnique({ where: { id } });
    if (!page) throw new NotFoundException('Page not found');

    const title = page.title as any;
    if (!title?.ar) {
      throw new BadRequestException({
        code: 'INCOMPLETE_CONTENT',
        message: 'Arabic title is required before publishing.',
      });
    }

    const updated = await this.prisma.page.update({
      where: { id },
      data: { status: 'PUBLISHED', publishedAt: new Date(), updatedBy: userId ?? null },
    });

    return { status: updated.status, publishedAt: updated.publishedAt };
  }

  async remove(id: string) {
    const page = await this.prisma.page.findUnique({ where: { id } });
    if (!page) throw new NotFoundException('Page not found');

    if (page.status === 'PUBLISHED') {
      throw new ConflictException('Cannot delete a published page. Archive it first.');
    }

    await this.prisma.page.delete({ where: { id } });
    return { deleted: true };
  }
}
