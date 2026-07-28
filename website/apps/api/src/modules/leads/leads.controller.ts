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
import { Throttle } from '@nestjs/throttler';
import { LeadsService } from './leads.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateAppointmentStatusDto, MarkContactReadDto } from './dto/update-lead-status.dto';
import { UpdateAppointmentAnswersDto } from './dto/update-appointment-answers.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { AuditInterceptor, AuditAction } from '../../common/interceptors/audit.interceptor';
import { ApiResponse } from '../../common/helpers/api-response.helper';

@Controller()
@UseInterceptors(AuditInterceptor)
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  // ─── Appointments Public ──────────────────────────────────────────────────

  @Post('appointments')
  @HttpCode(HttpStatus.CREATED)
  async createAppointment(@Body() dto: CreateAppointmentDto) {
    const data = await this.leadsService.createAppointment(dto);
    return ApiResponse.success({ id: data.id, message: 'Appointment request received' });
  }

  @Patch('appointments/:id/answers')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  async updateAppointmentAnswers(@Param('id') id: string, @Body() dto: UpdateAppointmentAnswersDto) {
    const data = await this.leadsService.updateAppointmentAnswers(id, dto.answers);
    return ApiResponse.success(data);
  }

  // ─── Appointments Admin ───────────────────────────────────────────────────

  @Get('admin/appointments')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('appointments', 'view')
  async listAppointments(@Query() query: PaginationQueryDto, @Query('filter') filter: any) {
    const result = await this.leadsService.findAllAppointments(query, filter);
    return ApiResponse.paginated(result.data, result.page, result.pageSize, result.total);
  }

  @Get('admin/appointments/:id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('appointments', 'view')
  async getOneAppointment(@Param('id') id: string) {
    return ApiResponse.success(await this.leadsService.findOneAppointment(id));
  }

  @Patch('admin/appointments/:id/status')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('appointments', 'manage')
  @AuditAction('AppointmentRequest', 'update_status')
  async updateAppointmentStatus(@Param('id') id: string, @Body() dto: UpdateAppointmentStatusDto) {
    return ApiResponse.success(await this.leadsService.updateAppointmentStatus(id, dto));
  }

  @Delete('admin/appointments/:id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('appointments', 'manage')
  @AuditAction('AppointmentRequest', 'delete')
  async deleteAppointment(@Param('id') id: string) {
    return ApiResponse.success(await this.leadsService.deleteAppointment(id));
  }

  // ─── Contact Public ───────────────────────────────────────────────────────

  @Post('contact')
  @HttpCode(HttpStatus.CREATED)
  async createContact(@Body() dto: CreateContactDto) {
    const data = await this.leadsService.createContact(dto);
    return ApiResponse.success({ id: data.id, message: 'Message received, we will get back to you soon' });
  }

  // ─── Contact Admin ────────────────────────────────────────────────────────

  @Get('admin/contact')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('contact', 'view')
  async listContacts(@Query() query: PaginationQueryDto, @Query('filter') filter: any) {
    const result = await this.leadsService.findAllContacts(query, filter);
    return ApiResponse.paginated(result.data, result.page, result.pageSize, result.total);
  }

  @Get('admin/contact/:id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('contact', 'view')
  async getOneContact(@Param('id') id: string) {
    return ApiResponse.success(await this.leadsService.findOneContact(id));
  }

  @Patch('admin/contact/:id/read')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('contact', 'manage')
  @AuditAction('ContactSubmission', 'mark_read')
  async markContactRead(@Param('id') id: string, @Body() dto: MarkContactReadDto) {
    return ApiResponse.success(await this.leadsService.markContactRead(id, dto));
  }
}
