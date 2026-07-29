import {
  Controller,
  Post,
  Body,
  Req,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
  Get,
  Patch,
  UnauthorizedException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Throttle } from '@nestjs/throttler';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(
      dto,
      req.ip,
      req.headers['user-agent'],
    );

    // Set refresh token as httpOnly cookie
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production' && req.secure, // Only secure if actually using HTTPS
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/api/v1/auth',
    });

    return {
      success: true,
      data: {
        accessToken: result.accessToken,
        user: result.user,
      },
    };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    // Try cookie first, then body
    const rawRefreshToken =
      req.cookies?.refreshToken || req.body?.refreshToken;

    if (!rawRefreshToken) {
      throw new UnauthorizedException('Refresh token missing');
    }

    // Decode payload without verifying signature — just to extract userId.
    // The AuthService.refresh() will verify the token hash against the DB,
    // so an attacker cannot exploit this unverified decode.
    let userId: string;
    try {
      const [, payloadB64] = rawRefreshToken.split('.');
      const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
      userId = payload?.sub;
      if (!userId) throw new Error('missing sub');
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const tokens = await this.authService.refresh(rawRefreshToken, userId);

    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production' && req.secure,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/api/v1/auth',
    });

    return {
      success: true,
      data: { accessToken: tokens.accessToken },
    };
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(
    @CurrentUser() user: any,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const rawRefreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
    await this.authService.logout(user.id, rawRefreshToken);

    res.clearCookie('refreshToken', { path: '/api/v1/auth' });

    return { success: true, data: { message: 'Logged out successfully' } };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@CurrentUser() user: any) {
    return { success: true, data: user };
  }

  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  async updateProfile(@CurrentUser() user: any, @Body() dto: UpdateProfileDto) {
    const result = await this.authService.updateProfile(user.id, dto);
    return result;
  }
}
