import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { FaqsService } from './faqs.service';
import { ApiResponse } from '../../common/helpers/api-response.helper';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { AuditInterceptor, AuditAction } from '../../common/interceptors/audit.interceptor';
import { CreateFaqDto, UpdateFaqDto } from './dto/faq.dto';

@Controller()
@UseInterceptors(AuditInterceptor)
export class FaqsController {
  constructor(private readonly faqsService: FaqsService) {}

  // ─── Public ───────────────────────────────────────────────────────────────
  @Get('faqs')
  async listPublic(@Query() query: any) {
    const result = await this.faqsService.findAll({ ...query, isActive: true });
    return ApiResponse.paginated(result.data, result.page, result.pageSize, result.total);
  }

  // ─── Admin ────────────────────────────────────────────────────────────────
  @Get('admin/faqs')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('pages', 'view')
  async listAdmin(@Query() query: any) {
    const result = await this.faqsService.findAll(query);
    return ApiResponse.paginated(result.data, result.page, result.pageSize, result.total);
  }

  @Post('admin/faqs')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('pages', 'manage')
  @AuditAction('Faq', 'create')
  async create(@Body() body: CreateFaqDto) {
    return ApiResponse.success(await this.faqsService.create(body));
  }

  @Patch('admin/faqs/:id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('pages', 'manage')
  @AuditAction('Faq', 'update')
  async update(@Param('id') id: string, @Body() body: UpdateFaqDto) {
    return ApiResponse.success(await this.faqsService.update(id, body));
  }

  @Delete('admin/faqs/:id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('pages', 'manage')
  @AuditAction('Faq', 'delete')
  async remove(@Param('id') id: string) {
    await this.faqsService.remove(id);
    return ApiResponse.success({ deleted: true });
  }
}
