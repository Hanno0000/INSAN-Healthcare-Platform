import {
  Controller,
  Get,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { SettingsService } from './settings.service';
import { UpdateSettingDto } from './dto/update-setting.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { AuditInterceptor, AuditAction } from '../../common/interceptors/audit.interceptor';
import { ApiResponse } from '../../common/helpers/api-response.helper';

@Controller()
@UseInterceptors(AuditInterceptor)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  // ─── Public ───────────────────────────────────────────────────────────────
  @Get('settings')
  async listPublic(@Query('group') group?: string) {
    return ApiResponse.success(await this.settingsService.findAllPublic(group));
  }

  // ─── Admin ────────────────────────────────────────────────────────────────
  @Get('admin/settings')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('settings', 'view')
  async listAdmin(@Query('group') group?: string) {
    return ApiResponse.success(await this.settingsService.findAll(group));
  }

  @Patch('admin/settings/:key')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('settings', 'manage')
  @AuditAction('Setting', 'update')
  async update(@Param('key') key: string, @Body() body: UpdateSettingDto) {
    return ApiResponse.success(await this.settingsService.update(key, body.value));
  }

  @Get('admin/settings/feature-flags')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('settings', 'view')
  async listFlags() {
    return ApiResponse.success(await this.settingsService.findAllFlags());
  }

  @Patch('admin/settings/feature-flags/:key')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('settings', 'manage')
  @AuditAction('FeatureFlag', 'update')
  @HttpCode(HttpStatus.OK)
  async toggleFlag(@Param('key') key: string, @Body() body: { isEnabled: boolean }) {
    return ApiResponse.success(await this.settingsService.toggleFlag(key, body.isEnabled));
  }
}
