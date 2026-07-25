import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBrandDto, SocialAccountDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';

@Injectable()
export class BrandsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.brand.findMany({
      include: { socialAccounts: true },
      orderBy: { code: 'asc' },
    });
  }

  async findOne(id: string) {
    const brand = await this.prisma.brand.findUnique({
      where: { id },
      include: { socialAccounts: { include: { integrationSetting: { select: { provider: true, isActive: true } } } } },
    });
    if (!brand) throw new NotFoundException('Brand not found');
    return brand;
  }

  async create(dto: CreateBrandDto) {
    const existing = await this.prisma.brand.findUnique({ where: { code: dto.code } });
    if (existing) throw new ConflictException('A brand with this code already exists');
    return this.prisma.brand.create({ data: { ...(dto as any), isActive: dto.isActive ?? true } });
  }

  async update(id: string, dto: UpdateBrandDto) {
    await this.findOne(id);
    return this.prisma.brand.update({ where: { id }, data: dto as any });
  }

  async remove(id: string) {
    const brand = await this.prisma.brand.findUnique({ where: { id } });
    if (!brand) throw new NotFoundException('Brand not found');
    await this.prisma.brand.delete({ where: { id } });
    return { deleted: true };
  }

  // Social Accounts
  async addSocialAccount(brandId: string, dto: SocialAccountDto) {
    await this.findOne(brandId);
    return this.prisma.brandSocialAccount.create({
      data: { brandId, ...(dto as any) },
    });
  }

  async updateSocialAccount(brandId: string, accountId: string, dto: Partial<SocialAccountDto>) {
    const account = await this.prisma.brandSocialAccount.findFirst({ where: { id: accountId, brandId } });
    if (!account) throw new NotFoundException('Social account not found');
    return this.prisma.brandSocialAccount.update({ where: { id: accountId }, data: dto as any });
  }

  async removeSocialAccount(brandId: string, accountId: string) {
    const account = await this.prisma.brandSocialAccount.findFirst({ where: { id: accountId, brandId } });
    if (!account) throw new NotFoundException('Social account not found');
    await this.prisma.brandSocialAccount.delete({ where: { id: accountId } });
    return { deleted: true };
  }
}
