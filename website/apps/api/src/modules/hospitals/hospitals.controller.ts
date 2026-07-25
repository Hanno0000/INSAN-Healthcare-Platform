import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { HospitalsService } from './hospitals.service';
import { CreateHospitalDto } from './dto/create-hospital.dto';
import { UpdateHospitalDto } from './dto/update-hospital.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { AuditInterceptor, AuditAction } from '../../common/interceptors/audit.interceptor';
import { ApiResponse } from '../../common/helpers/api-response.helper';

@Controller()
@UseInterceptors(AuditInterceptor)
export class HospitalsController {
  constructor(private readonly hospitalsService: HospitalsService) {}

  // ─── Public ──────────────────────────────────────────────────────────────

  @Get('hospitals')
  async listPublic(@Query() query: any, @Query('filter') filter: any) {
    const result = await this.hospitalsService.findAll(query, filter, false);
    return ApiResponse.paginated(result.data, result.page, result.pageSize, result.total);
  }

  @Get('hospitals/:slug')
  async getBySlug(@Param('slug') slug: string) {
    const data = await this.hospitalsService.findBySlug(slug);
    return ApiResponse.success(data);
  }

  // ─── Admin ───────────────────────────────────────────────────────────────

  @Get('admin/hospitals')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('hospitals', 'view')
  async listAdmin(@Query() query: any, @Query('filter') filter: any) {
    const result = await this.hospitalsService.findAll(query, filter, true);
    return ApiResponse.paginated(result.data, result.page, result.pageSize, result.total);
  }

  @Get('admin/hospitals/:id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('hospitals', 'view')
  async getOne(@Param('id') id: string) {
    const data = await this.hospitalsService.findOne(id);
    return ApiResponse.success(data);
  }

  @Post('admin/hospitals')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('hospitals', 'create')
  @AuditAction('Hospital', 'create')
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateHospitalDto) {
    const data = await this.hospitalsService.create(dto);
    return ApiResponse.success(data);
  }

  @Patch('admin/hospitals/:id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('hospitals', 'edit')
  @AuditAction('Hospital', 'update')
  async update(@Param('id') id: string, @Body() dto: UpdateHospitalDto) {
    const data = await this.hospitalsService.update(id, dto);
    return ApiResponse.success(data);
  }

  @Post('admin/hospitals/:id/publish')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('hospitals', 'publish')
  @AuditAction('Hospital', 'publish')
  @HttpCode(HttpStatus.OK)
  async publish(@Param('id') id: string) {
    const data = await this.hospitalsService.publish(id);
    return ApiResponse.success(data);
  }

  @Post('admin/hospitals/:id/unpublish')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('hospitals', 'publish')
  @AuditAction('Hospital', 'unpublish')
  @HttpCode(HttpStatus.OK)
  async unpublish(@Param('id') id: string) {
    const data = await this.hospitalsService.unpublish(id);
    return ApiResponse.success(data);
  }

  @Delete('admin/hospitals/:id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('hospitals', 'delete')
  @AuditAction('Hospital', 'delete')
  async remove(@Param('id') id: string) {
    const data = await this.hospitalsService.remove(id);
    return ApiResponse.success(data);
  }
}
