import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { BrandsService } from './brands.service';
import { CreateBrandDto, SocialAccountDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { AuditInterceptor, AuditAction } from '../../common/interceptors/audit.interceptor';
import { ApiResponse } from '../../common/helpers/api-response.helper';

@Controller('admin/brands')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@UseInterceptors(AuditInterceptor)
export class BrandsController {
  constructor(private readonly brandsService: BrandsService) {}

  @Get()
  @RequirePermission('settings', 'view')
  async list() {
    return ApiResponse.success(await this.brandsService.findAll());
  }

  @Get(':id')
  @RequirePermission('settings', 'view')
  async getOne(@Param('id') id: string) {
    return ApiResponse.success(await this.brandsService.findOne(id));
  }

  @Post()
  @RequirePermission('settings', 'manage')
  @AuditAction('Brand', 'create')
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateBrandDto) {
    return ApiResponse.success(await this.brandsService.create(dto));
  }

  @Patch(':id')
  @RequirePermission('settings', 'manage')
  @AuditAction('Brand', 'update')
  async update(@Param('id') id: string, @Body() dto: UpdateBrandDto) {
    return ApiResponse.success(await this.brandsService.update(id, dto));
  }

  @Delete(':id')
  @RequirePermission('settings', 'manage')
  @AuditAction('Brand', 'delete')
  async remove(@Param('id') id: string) {
    return ApiResponse.success(await this.brandsService.remove(id));
  }

  // Social Accounts nested
  @Post(':id/social-accounts')
  @RequirePermission('settings', 'manage')
  @AuditAction('BrandSocialAccount', 'create')
  @HttpCode(HttpStatus.CREATED)
  async addSocialAccount(@Param('id') id: string, @Body() dto: SocialAccountDto) {
    return ApiResponse.success(await this.brandsService.addSocialAccount(id, dto));
  }

  @Patch(':id/social-accounts/:accountId')
  @RequirePermission('settings', 'manage')
  @AuditAction('BrandSocialAccount', 'update')
  async updateSocialAccount(
    @Param('id') id: string,
    @Param('accountId') accountId: string,
    @Body() dto: Partial<SocialAccountDto>,
  ) {
    return ApiResponse.success(await this.brandsService.updateSocialAccount(id, accountId, dto));
  }

  @Delete(':id/social-accounts/:accountId')
  @RequirePermission('settings', 'manage')
  @AuditAction('BrandSocialAccount', 'delete')
  async removeSocialAccount(
    @Param('id') id: string,
    @Param('accountId') accountId: string,
  ) {
    return ApiResponse.success(await this.brandsService.removeSocialAccount(id, accountId));
  }
}
