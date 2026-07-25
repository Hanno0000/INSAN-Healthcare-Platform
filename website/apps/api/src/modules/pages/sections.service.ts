import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSectionDto } from './dto/create-section.dto';
import { UpdateSectionDto } from './dto/update-section.dto';
import { ReorderSectionsDto } from './dto/reorder-sections.dto';

@Injectable()
export class SectionsService {
  constructor(private prisma: PrismaService) {}

  private async assertPage(pageId: string) {
    const page = await this.prisma.page.findUnique({ where: { id: pageId } });
    if (!page) throw new NotFoundException('Page not found');
    return page;
  }

  async findAll(pageId: string) {
    await this.assertPage(pageId);
    return this.prisma.section.findMany({
      where: { pageId },
      orderBy: { order: 'asc' },
    });
  }

  async create(pageId: string, dto: CreateSectionDto) {
    await this.assertPage(pageId);

    return this.prisma.$transaction(async (tx) => {
      const maxSection = await tx.section.findFirst({
        where: { pageId },
        orderBy: { order: 'desc' },
      });
      const order = dto.order ?? (maxSection ? maxSection.order + 1 : 1);

      return tx.section.create({
        data: {
          pageId,
          componentType: dto.componentType,
          order,
          isVisible: dto.isVisible ?? true,
          config: dto.config ?? {},
        },
      });
    });
  }

  async update(pageId: string, id: string, dto: UpdateSectionDto) {
    const section = await this.prisma.section.findFirst({ where: { id, pageId } });
    if (!section) throw new NotFoundException('Section not found');

    return this.prisma.section.update({
      where: { id },
      data: {
        ...(dto.config !== undefined ? { config: dto.config } : {}),
        ...(dto.isVisible !== undefined ? { isVisible: dto.isVisible } : {}),
      },
    });
  }

  async remove(pageId: string, id: string) {
    const section = await this.prisma.section.findFirst({ where: { id, pageId } });
    if (!section) throw new NotFoundException('Section not found');

    await this.prisma.$transaction(async (tx) => {
      await tx.section.delete({ where: { id } });
      // Close the gap: decrement order for all sections after the deleted one
      await tx.section.updateMany({
        where: { pageId, order: { gt: section.order } },
        data: { order: { decrement: 1 } },
      });
    });

    return { deleted: true };
  }

  async reorder(pageId: string, dto: ReorderSectionsDto) {
    await this.assertPage(pageId);

    const { order: ids } = dto;
    if (!ids.length) throw new BadRequestException('Order array must not be empty');

    // Validate all IDs belong to this page
    const sections = await this.prisma.section.findMany({ where: { pageId } });
    const sectionIds = new Set(sections.map((s) => s.id));
    for (const id of ids) {
      if (!sectionIds.has(id)) {
        throw new BadRequestException(`Section ${id} does not belong to this page`);
      }
    }

    await this.prisma.$transaction(
      ids.map((id, index) =>
        this.prisma.section.update({
          where: { id },
          data: { order: index + 1 },
        }),
      ),
    );

    return this.prisma.section.findMany({
      where: { pageId },
      orderBy: { order: 'asc' },
    });
  }
}
