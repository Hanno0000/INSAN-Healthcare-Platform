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
import { MedicalCentersService } from './medical-centers.service';
import { ClinicsService } from './clinics.service';
import { QuestionsService } from './questions.service';
import { CreateMedicalCenterDto } from './dto/create-medical-center.dto';
import { UpdateMedicalCenterDto } from './dto/update-medical-center.dto';
import { CreateClinicDto } from './dto/create-clinic.dto';
import { UpdateClinicDto } from './dto/update-clinic.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { AuditInterceptor, AuditAction } from '../../common/interceptors/audit.interceptor';
import { ApiResponse } from '../../common/helpers/api-response.helper';

@Controller()
@UseInterceptors(AuditInterceptor)
export class MedicalCentersController {
  constructor(
    private readonly medicalCentersService: MedicalCentersService,
    private readonly clinicsService: ClinicsService,
    private readonly questionsService: QuestionsService,
  ) {}

  // ─── Medical Centers Public ────────────────────────────────────────────────

  @Get('medical-centers')
  async listPublic(@Query() query: PaginationQueryDto, @Query('filter') filter: any) {
    const result = await this.medicalCentersService.findAll(query, filter, false);
    return ApiResponse.paginated(result.data, result.page, result.pageSize, result.total);
  }

  @Get('medical-centers/:slug')
  async getBySlug(@Param('slug') slug: string) {
    const data = await this.medicalCentersService.findBySlug(slug);
    return ApiResponse.success(data);
  }

  // ─── Medical Centers Admin ────────────────────────────────────────────────

  @Get('admin/medical-centers')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('medical-centers', 'view')
  async listAdmin(@Query() query: PaginationQueryDto, @Query('filter') filter: any) {
    const result = await this.medicalCentersService.findAll(query, filter, true);
    return ApiResponse.paginated(result.data, result.page, result.pageSize, result.total);
  }

  @Get('admin/medical-centers/:id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('medical-centers', 'view')
  async getOne(@Param('id') id: string) {
    const data = await this.medicalCentersService.findOne(id);
    return ApiResponse.success(data);
  }

  @Post('admin/medical-centers')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('medical-centers', 'create')
  @AuditAction('MedicalCenter', 'create')
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateMedicalCenterDto) {
    const data = await this.medicalCentersService.create(dto);
    return ApiResponse.success(data);
  }

  @Patch('admin/medical-centers/:id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('medical-centers', 'edit')
  @AuditAction('MedicalCenter', 'update')
  async update(@Param('id') id: string, @Body() dto: UpdateMedicalCenterDto) {
    const data = await this.medicalCentersService.update(id, dto);
    return ApiResponse.success(data);
  }

  @Post('admin/medical-centers/:id/publish')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('medical-centers', 'publish')
  @AuditAction('MedicalCenter', 'publish')
  @HttpCode(HttpStatus.OK)
  async publish(@Param('id') id: string) {
    const data = await this.medicalCentersService.publish(id);
    return ApiResponse.success(data);
  }

  @Post('admin/medical-centers/:id/unpublish')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('medical-centers', 'publish')
  @AuditAction('MedicalCenter', 'unpublish')
  @HttpCode(HttpStatus.OK)
  async unpublish(@Param('id') id: string) {
    const data = await this.medicalCentersService.unpublish(id);
    return ApiResponse.success(data);
  }

  @Delete('admin/medical-centers/:id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('medical-centers', 'delete')
  @AuditAction('MedicalCenter', 'delete')
  async remove(@Param('id') id: string) {
    const data = await this.medicalCentersService.remove(id);
    return ApiResponse.success(data);
  }

  // ─── Clinics (nested under medical-centers) ────────────────────────────────

  @Get('admin/medical-centers/:centerId/clinics')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('medical-centers', 'view')
  async listClinics(@Param('centerId') centerId: string) {
    const data = await this.clinicsService.findAll(centerId);
    return ApiResponse.success(data);
  }

  @Post('admin/medical-centers/:centerId/clinics')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('medical-centers', 'edit')
  @AuditAction('Clinic', 'create')
  @HttpCode(HttpStatus.CREATED)
  async createClinic(
    @Param('centerId') centerId: string,
    @Body() dto: CreateClinicDto,
  ) {
    const data = await this.clinicsService.create(centerId, dto);
    return ApiResponse.success(data);
  }

  @Patch('admin/medical-centers/:centerId/clinics/:id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('medical-centers', 'edit')
  @AuditAction('Clinic', 'update')
  async updateClinic(
    @Param('centerId') centerId: string,
    @Param('id') id: string,
    @Body() dto: UpdateClinicDto,
  ) {
    const data = await this.clinicsService.update(centerId, id, dto);
    return ApiResponse.success(data);
  }

  @Delete('admin/medical-centers/:centerId/clinics/:id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('medical-centers', 'edit')
  @AuditAction('Clinic', 'delete')
  async removeClinic(
    @Param('centerId') centerId: string,
    @Param('id') id: string,
  ) {
    const data = await this.clinicsService.remove(centerId, id);
    return ApiResponse.success(data);
  }

  // ─── Booking Questions (nested under medical-centers) ────────────────────

  @Get('medical-centers/:centerId/questions') // Public
  async listQuestionsPublic(@Param('centerId') centerId: string) {
    const data = await this.questionsService.list(centerId);
    return data;
  }

  @Get('admin/medical-centers/:centerId/questions')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('medical-centers', 'view')
  async listQuestionsAdmin(@Param('centerId') centerId: string) {
    const data = await this.questionsService.list(centerId);
    return data;
  }

  @Post('admin/medical-centers/:centerId/questions')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('medical-centers', 'edit')
  @AuditAction('BookingQuestion', 'create')
  @HttpCode(HttpStatus.CREATED)
  async createQuestion(
    @Param('centerId') centerId: string,
    @Body() dto: any, // CreateBookingQuestionDto
  ) {
    const data = await this.questionsService.create(centerId, dto);
    return data;
  }

  @Patch('admin/medical-centers/:centerId/questions/:id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('medical-centers', 'edit')
  @AuditAction('BookingQuestion', 'update')
  async updateQuestion(
    @Param('id') id: string,
    @Body() dto: any, // UpdateBookingQuestionDto
  ) {
    const data = await this.questionsService.update(id, dto);
    return data;
  }

  @Delete('admin/medical-centers/:centerId/questions/:id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('medical-centers', 'edit')
  @AuditAction('BookingQuestion', 'delete')
  async removeQuestion(@Param('id') id: string) {
    const data = await this.questionsService.delete(id);
    return data;
  }

  @Post('admin/medical-centers/:centerId/questions/copy-to')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('medical-centers', 'edit')
  @AuditAction('BookingQuestion', 'copy')
  @HttpCode(HttpStatus.OK)
  async copyQuestions(
    @Param('centerId') centerId: string,
    @Body('targetCenterIds') targetCenterIds: string[],
    @Body('questionIds') questionIds?: string[],
  ) {
    const data = await this.questionsService.copyTo(centerId, targetCenterIds, questionIds);
    return data;
  }
}
