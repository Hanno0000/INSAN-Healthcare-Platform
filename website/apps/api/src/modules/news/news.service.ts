import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateNewsCategoryDto } from './dto/create-news-category.dto';
import { UpdateNewsCategoryDto } from './dto/update-news-category.dto';
import { CreateNewsPostDto } from './dto/create-news-post.dto';
import { UpdateNewsPostDto } from './dto/update-news-post.dto';
import { slugify, RESOURCE_PATHS, SUPPORTED_LOCALES } from '../../common/helpers/slug.helper';
import { parsePagination, parseSortOrder, parseStatusFilter } from '../../common/helpers/pagination.helper';

@Injectable()
export class NewsService {
  constructor(private prisma: PrismaService) {}

  // ─── Categories ───────────────────────────────────────────────────────────

  async findAllCategories() {
    return this.prisma.newsCategory.findMany({ include: { _count: { select: { posts: true } } } });
  }

  async findOneCategory(id: string) {
    const cat = await this.prisma.newsCategory.findUnique({ where: { id } });
    if (!cat) throw new NotFoundException('News category not found');
    return cat;
  }

  async createCategory(dto: CreateNewsCategoryDto) {
    const slug = dto.slug ?? slugify((dto.name as any).en ?? (dto.name as any).ar);
    const existing = await this.prisma.newsCategory.findUnique({ where: { slug } });
    if (existing) throw new ConflictException('A category with this slug already exists');
    return this.prisma.newsCategory.create({ data: { name: dto.name as any, slug } });
  }

  async updateCategory(id: string, dto: UpdateNewsCategoryDto) {
    await this.findOneCategory(id);

    const updates: any = {};
    if (dto.name) updates.name = dto.name;
    if (dto.slug) {
      const conflict = await this.prisma.newsCategory.findFirst({
        where: { slug: dto.slug, id: { not: id } },
      });
      if (conflict) throw new ConflictException('A category with this slug already exists');
      updates.slug = dto.slug;
    }

    return this.prisma.newsCategory.update({ where: { id }, data: updates });
  }

  async removeCategory(id: string) {
    await this.findOneCategory(id);
    const postCount = await this.prisma.newsPost.count({ where: { categoryId: id } });
    if (postCount > 0) {
      throw new ConflictException(`Cannot delete: ${postCount} news post(s) belong to this category.`);
    }
    await this.prisma.newsCategory.delete({ where: { id } });
    return { deleted: true };
  }

  // ─── Posts ────────────────────────────────────────────────────────────────

  async findAllPosts(query: any, filter: any, isAdmin = false) {
    const { page, pageSize, skip, take } = parsePagination(query);
    const orderBy = parseSortOrder(query.sortBy ?? 'publishedAt', query.sortDir, ['createdAt', 'updatedAt', 'slug', 'publishedAt']);
    const statuses = parseStatusFilter(filter, ['DRAFT', 'PUBLISHED', 'ARCHIVED']);

    const where: any = {};
    if (!isAdmin) where.status = 'PUBLISHED';
    if (isAdmin && statuses?.length) where.status = { in: statuses };
    if (filter?.sourceType) where.sourceType = filter.sourceType.toUpperCase();
    if (filter?.sourceBrandId) where.sourceBrandId = filter.sourceBrandId;
    if (query.search) {
      where.OR = [
        { slug: { contains: query.search, mode: 'insensitive' } },
        { title: { path: ['ar'], string_contains: query.search } },
        { title: { path: ['en'], string_contains: query.search } },
        { excerpt: { path: ['ar'], string_contains: query.search } },
      ];
    }
    if (filter?.dateFrom || filter?.dateTo) {
      where.publishedAt = {};
      if (filter.dateFrom) where.publishedAt.gte = new Date(filter.dateFrom);
      if (filter.dateTo) where.publishedAt.lte = new Date(filter.dateTo);
    }

    const [data, total] = await Promise.all([
      this.prisma.newsPost.findMany({
        where, skip, take, orderBy,
        include: {
          category: true,
          sourceBrand: { select: { id: true, code: true, displayName: true } },
          relatedHospital: { select: { id: true, slug: true, name: true } },
        },
      }),
      this.prisma.newsPost.count({ where }),
    ]);

    return { data, page, pageSize, total };
  }

  async findOnePost(id: string) {
    const post = await this.prisma.newsPost.findUnique({
      where: { id },
      include: {
        category: true,
        sourceBrand: true,
        relatedHospital: { select: { id: true, slug: true, name: true } },
      },
    });
    if (!post) throw new NotFoundException('News post not found');
    return post;
  }

  async findPostBySlug(slug: string) {
    const post = await this.prisma.newsPost.findUnique({
      where: { slug },
      include: {
        category: true,
        sourceBrand: { select: { id: true, code: true, displayName: true } },
        relatedHospital: { select: { id: true, slug: true, name: true } },
      },
    });
    if (!post || post.status !== 'PUBLISHED') throw new NotFoundException('News post not found');
    return post;
  }

  async createPost(dto: CreateNewsPostDto) {
    const title = dto.title as any;
    const slug = dto.slug ?? slugify(title.en ?? title.ar);

    const existing = await this.prisma.newsPost.findUnique({ where: { slug } });
    if (existing) throw new ConflictException('A news post with this slug already exists');

    // SOCIAL_SYNC validation
    if (dto.sourceType === 'SOCIAL_SYNC') {
      if (!dto.sourcePlatform || !dto.externalPostId) {
        throw new BadRequestException(
          'sourcePlatform and externalPostId are required for SOCIAL_SYNC posts.',
        );
      }
    }

    const { slug: _slug, ...rest } = dto;
    return this.prisma.newsPost.create({ data: { ...rest, slug } as any });
  }

  async updatePost(id: string, dto: UpdateNewsPostDto) {
    const existing = await this.prisma.newsPost.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('News post not found');

    const slugChanged = dto.slug && dto.slug !== existing.slug;
    if (slugChanged) {
      const conflict = await this.prisma.newsPost.findUnique({ where: { slug: dto.slug } });
      if (conflict) throw new ConflictException('A news post with this slug already exists');
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.newsPost.update({ where: { id }, data: dto as any });

      if (slugChanged) {
        await tx.slugHistory.create({
          data: { entity: 'NewsPost', entityId: id, oldSlug: existing.slug, newSlug: dto.slug! },
        });
        for (const locale of SUPPORTED_LOCALES) {
          const fromPath = `/${locale}/${RESOURCE_PATHS.NewsPost}/${existing.slug}`;
          const toPath = `/${locale}/${RESOURCE_PATHS.NewsPost}/${dto.slug}`;
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

  async publishPost(id: string) {
    const post = await this.prisma.newsPost.findUnique({ where: { id } });
    if (!post) throw new NotFoundException('News post not found');

    const title = post.title as any;
    if (!title?.ar) {
      throw new BadRequestException({
        code: 'INCOMPLETE_CONTENT',
        message: 'Arabic title is required before publishing.',
      });
    }

    const updated = await this.prisma.newsPost.update({
      where: { id },
      data: { status: 'PUBLISHED', publishedAt: new Date() },
    });

    return { status: updated.status, publishedAt: updated.publishedAt };
  }

  async unpublishPost(id: string) {
    const post = await this.prisma.newsPost.findUnique({ where: { id } });
    if (!post) throw new NotFoundException('News post not found');
    const updated = await this.prisma.newsPost.update({
      where: { id },
      data: { status: 'DRAFT', publishedAt: null },
    });
    return { status: updated.status };
  }

  async removePost(id: string) {
    const post = await this.prisma.newsPost.findUnique({ where: { id } });
    if (!post) throw new NotFoundException('News post not found');

    if (post.status === 'PUBLISHED') {
      throw new ConflictException('Cannot delete a published news post. Archive it first.');
    }

    await this.prisma.newsPost.delete({ where: { id } });
    return { deleted: true };
  }
}
