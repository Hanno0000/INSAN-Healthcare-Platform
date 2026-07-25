import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { parsePagination } from '../../common/helpers/pagination.helper';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  private omitPassword<T extends { passwordHash?: string }>(user: T) {
    const { passwordHash, ...safe } = user;
    return safe;
  }

  async findAll(query: any) {
    const { page, pageSize, skip, take } = parsePagination(query);
    const where: any = {};
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.isActive !== undefined) where.isActive = query.isActive === 'true';

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where, skip, take,
        orderBy: { createdAt: 'desc' },
        include: { role: true },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: users.map(this.omitPassword),
      page,
      pageSize,
      total,
    };
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { role: true },
    });
    if (!user) throw new NotFoundException('User not found');
    return this.omitPassword(user);
  }

  async create(dto: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('A user with this email already exists');

    const role = await this.prisma.role.findUnique({ where: { id: dto.roleId } });
    if (!role) throw new NotFoundException('Role not found');

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const { password, ...rest } = dto;

    const user = await this.prisma.user.create({
      data: { ...rest, passwordHash, isActive: rest.isActive ?? true },
      include: { role: true },
    });

    return this.omitPassword(user);
  }

  async update(id: string, dto: UpdateUserDto, requestingUserId: string) {
    const user = await this.prisma.user.findUnique({ where: { id }, include: { role: true } });
    if (!user) throw new NotFoundException('User not found');

    if (dto.roleId) {
      const role = await this.prisma.role.findUnique({ where: { id: dto.roleId } });
      if (!role) throw new NotFoundException('Role not found');

      // Prevent removing last super admin
      if (user.role.name === 'SUPER_ADMIN' && role.name !== 'SUPER_ADMIN') {
        const superAdminCount = await this.prisma.user.count({
          where: { role: { name: 'SUPER_ADMIN' }, isActive: true },
        });
        if (superAdminCount === 1) {
          throw new BadRequestException('Cannot remove the last active super admin.');
        }
      }
    }

    if (dto.isActive === false && id === requestingUserId) {
      throw new BadRequestException('You cannot deactivate your own account.');
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: dto,
      include: { role: true },
    });

    return this.omitPassword(updated);
  }

  async remove(id: string, requestingUserId: string) {
    const user = await this.prisma.user.findUnique({ where: { id }, include: { role: true } });
    if (!user) throw new NotFoundException('User not found');

    if (id === requestingUserId) {
      throw new BadRequestException('You cannot delete your own account.');
    }

    if (user.role.name === 'SUPER_ADMIN') {
      const count = await this.prisma.user.count({
        where: { role: { name: 'SUPER_ADMIN' }, isActive: true },
      });
      if (count === 1) throw new BadRequestException('Cannot delete the last super admin.');
    }

    await this.prisma.user.delete({ where: { id } });
    return { deleted: true };
  }

  async findAllRoles() {
    return this.prisma.role.findMany({ orderBy: { name: 'asc' } });
  }
}
