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
import { DoctorsService } from './doctors.service';
import { CreateDoctorDto } from './dto/create-doctor.dto';
import { UpdateDoctorDto } from './dto/update-doctor.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { AuditInterceptor, AuditAction } from '../../common/interceptors/audit.interceptor';
import { ApiResponse } from '../../common/helpers/api-response.helper';

@Controller()
@UseInterceptors(AuditInterceptor)
export class DoctorsController {
  constructor(private readonly doctorsService: DoctorsService) {}

  @Get('doctors')
  async listPublic(@Query() query: any, @Query('filter') filter: any) {
    const result = await this.doctorsService.findAll(query, filter, false);
    return ApiResponse.paginated(result.data, result.page, result.pageSize, result.total);
  }

  @Get('doctors/:slug')
  async getBySlug(@Param('slug') slug: string) {
    return ApiResponse.success(await this.doctorsService.findBySlug(slug));
  }

  @Get('admin/doctors')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('doctors', 'view')
  async listAdmin(@Query() query: any, @Query('filter') filter: any) {
    const result = await this.doctorsService.findAll(query, filter, true);
    return ApiResponse.paginated(result.data, result.page, result.pageSize, result.total);
  }

  @Get('admin/doctors/:id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('doctors', 'view')
  async getOne(@Param('id') id: string) {
    return ApiResponse.success(await this.doctorsService.findOne(id));
  }

  @Post('admin/doctors')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('doctors', 'create')
  @AuditAction('Doctor', 'create')
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateDoctorDto) {
    return ApiResponse.success(await this.doctorsService.create(dto));
  }

  @Patch('admin/doctors/:id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('doctors', 'edit')
  @AuditAction('Doctor', 'update')
  async update(@Param('id') id: string, @Body() dto: UpdateDoctorDto) {
    return ApiResponse.success(await this.doctorsService.update(id, dto));
  }

  @Post('admin/doctors/:id/publish')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('doctors', 'publish')
  @AuditAction('Doctor', 'publish')
  @HttpCode(HttpStatus.OK)
  async publish(@Param('id') id: string) {
    return ApiResponse.success(await this.doctorsService.publish(id));
  }

  @Delete('admin/doctors/:id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('doctors', 'delete')
  @AuditAction('Doctor', 'delete')
  async remove(@Param('id') id: string) {
    return ApiResponse.success(await this.doctorsService.remove(id));
  }
}
