import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateNavigationItemDto } from './dto/create-navigation-item.dto';
import { UpdateNavigationItemDto } from './dto/update-navigation-item.dto';
import { ReorderNavigationDto } from './dto/reorder-navigation.dto';

@Injectable()
export class NavigationService {
  constructor(private prisma: PrismaService) {}

  async findAll(location?: string) {
    const where: any = location ? { location } : {};
    return this.prisma.navigationItem.findMany({
      where,
      orderBy: [{ location: 'asc' }, { order: 'asc' }],
    });
  }

  async create(dto: CreateNavigationItemDto) {
    return this.prisma.$transaction(async (tx) => {
      const maxItem = await tx.navigationItem.findFirst({
        where: { location: dto.location },
        orderBy: { order: 'desc' },
      });
      const order = dto.order ?? (maxItem ? maxItem.order + 1 : 1);

      return tx.navigationItem.create({
        data: { ...(dto as any), order },
      });
    });
  }

  async update(id: string, dto: UpdateNavigationItemDto) {
    const item = await this.prisma.navigationItem.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Navigation item not found');
    return this.prisma.navigationItem.update({ where: { id }, data: dto as any });
  }

  async remove(id: string) {
    const item = await this.prisma.navigationItem.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Navigation item not found');
    await this.prisma.navigationItem.delete({ where: { id } });
    return { deleted: true };
  }

  async reorder(dto: ReorderNavigationDto) {
    const { order: ids } = dto;
    if (!ids.length) throw new BadRequestException('Order array must not be empty');

    await this.prisma.$transaction(
      ids.map((id, index) =>
        this.prisma.navigationItem.update({ where: { id }, data: { order: index + 1 } }),
      ),
    );

    return this.prisma.navigationItem.findMany({ orderBy: [{ location: 'asc' }, { order: 'asc' }] });
  }
}
