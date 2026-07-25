import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  // Public — only expose non-sensitive groups
  private readonly PUBLIC_GROUPS = ['general', 'brand', 'seo', 'languages'];

  async findAllPublic(group?: string) {
    const where: any = { group: { in: this.PUBLIC_GROUPS } };
    if (group && this.PUBLIC_GROUPS.includes(group)) where.group = group;
    return this.prisma.setting.findMany({ where, orderBy: [{ group: 'asc' }, { key: 'asc' }] });
  }

  async findAll(group?: string) {
    const where: any = {};
    if (group) where.group = group;
    return this.prisma.setting.findMany({ where, orderBy: [{ group: 'asc' }, { key: 'asc' }] });
  }

  async findByKey(key: string) {
    const setting = await this.prisma.setting.findUnique({ where: { key } });
    if (!setting) throw new NotFoundException(`Setting "${key}" not found`);
    return setting;
  }

  async update(key: string, value: any) {
    const setting = await this.prisma.setting.findUnique({ where: { key } });
    if (!setting) throw new NotFoundException(`Setting "${key}" not found`);
    return this.prisma.setting.update({ where: { key }, data: { value } });
  }

  // Feature flags
  async findAllFlags() {
    return this.prisma.featureFlag.findMany({ orderBy: { key: 'asc' } });
  }

  async toggleFlag(key: string, isEnabled: boolean) {
    const flag = await this.prisma.featureFlag.findUnique({ where: { key } });
    if (!flag) throw new NotFoundException(`Feature flag "${key}" not found`);
    return this.prisma.featureFlag.update({ where: { key }, data: { isEnabled } });
  }
}
