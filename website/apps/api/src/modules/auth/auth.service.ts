import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private config: ConfigService,
  ) {}

  async login(dto: LoginDto, ipAddress?: string, userAgent?: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { role: true },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate tokens first (they don't depend on any DB write below).
    // Then wrap the three writes (lastLogin, audit log, refresh token)
    // in a single transaction (TD-002).
    const tokens = await this.generateTokens(user.id, user.email, user.roleId, user.role.name);
    const tokenHash = this.hashToken(tokens.refreshToken);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      }),
      this.prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'login',
          entity: 'User',
          entityId: user.id,
          ipAddress,
        },
      }),
      this.prisma.refreshToken.create({
        data: {
          userId: user.id,
          tokenHash,
          ipAddress,
          userAgent,
          expiresAt,
        },
      }),
    ]);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        roleName: user.role.name,
        permissions: user.role.permissions,
      },
    };
  }

  async refresh(rawRefreshToken: string, userId: string) {
    const tokenHash = this.hashToken(rawRefreshToken);
    const storedToken = await this.prisma.refreshToken.findFirst({
      where: { userId, tokenHash, revoked: false },
    });

    if (!storedToken || storedToken.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    // Revoke old refresh token (rotation)
    await this.prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revoked: true },
    });

    const tokens = await this.generateTokens(user.id, user.email, user.roleId, user.role.name);
    await this.storeRefreshToken(user.id, tokens.refreshToken);

    return tokens;
  }

  async logout(userId: string, rawRefreshToken?: string) {
    if (rawRefreshToken) {
      const tokenHash = this.hashToken(rawRefreshToken);
      await this.prisma.refreshToken.updateMany({
        where: { userId, tokenHash },
        data: { revoked: true },
      });
    } else {
      await this.prisma.refreshToken.updateMany({
        where: { userId, revoked: false },
        data: { revoked: true },
      });
    }

    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'logout',
        entity: 'User',
        entityId: userId,
      },
    });

    return { message: 'Logged out successfully' };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User not found');

    const updateData: any = {};
    if (dto.name) updateData.name = dto.name;
    if (dto.email) updateData.email = dto.email;

    if (dto.newPassword) {
      if (!dto.currentPassword) {
        throw new BadRequestException('Current password is required to set a new password');
      }
      const isPasswordValid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
      if (!isPasswordValid) {
        throw new BadRequestException('Invalid current password');
      }
      updateData.passwordHash = await bcrypt.hash(dto.newPassword, 10);
    }

    if (Object.keys(updateData).length === 0) {
      return { success: true, message: 'No changes provided' };
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    return { success: true, message: 'Profile updated successfully' };
  }

  private async generateTokens(userId: string, email: string, roleId: string, roleName: string) {
    const payload = { sub: userId, email, roleId, roleName };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.config.get('JWT_ACCESS_SECRET'),
        expiresIn: this.config.get('JWT_ACCESS_EXPIRES', '15m'),
      }),
      this.jwtService.signAsync(payload, {
        secret: this.config.get('JWT_REFRESH_SECRET'),
        expiresIn: this.config.get('JWT_REFRESH_EXPIRES', '7d'),
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private async storeRefreshToken(
    userId: string,
    rawToken: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const tokenHash = this.hashToken(rawToken);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        ipAddress,
        userAgent,
        expiresAt,
      },
    });
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}
