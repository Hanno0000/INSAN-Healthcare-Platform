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
import { PagesService } from './pages.service';
import { SectionsService } from './sections.service';
import { CreatePageDto } from './dto/create-page.dto';
import { UpdatePageDto } from './dto/update-page.dto';
import { CreateSectionDto } from './dto/create-section.dto';
import { UpdateSectionDto } from './dto/update-section.dto';
import { ReorderSectionsDto } from './dto/reorder-sections.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { AuditInterceptor, AuditAction } from '../../common/interceptors/audit.interceptor';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ApiResponse } from '../../common/helpers/api-response.helper';

@Controller()
@UseInterceptors(AuditInterceptor)
export class PagesController {
  constructor(
    private readonly pagesService: PagesService,
    private readonly sectionsService: SectionsService,
  ) {}

  // ─── Public ──────────────────────────────────────────────────────────────

  @Get('pages/:slug')
  async getBySlug(@Param('slug') slug: string) {
    return ApiResponse.success(await this.pagesService.findBySlug(slug));
  }

  // ─── Admin Pages ─────────────────────────────────────────────────────────

  @Get('admin/pages')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('pages', 'view')
  async listAdmin(@Query() query: any, @Query('filter') filter: any) {
    const result = await this.pagesService.findAll(query, filter, true);
    return ApiResponse.paginated(result.data, result.page, result.pageSize, result.total);
  }

  @Get('admin/pages/:id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('pages', 'view')
  async getOne(@Param('id') id: string) {
    return ApiResponse.success(await this.pagesService.findOne(id));
  }

  @Post('admin/pages')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('pages', 'create')
  @AuditAction('Page', 'create')
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreatePageDto, @CurrentUser() user: any) {
    return ApiResponse.success(await this.pagesService.create(dto, user?.id));
  }

  @Patch('admin/pages/:id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('pages', 'edit')
  @AuditAction('Page', 'update')
  async update(@Param('id') id: string, @Body() dto: UpdatePageDto, @CurrentUser() user: any) {
    return ApiResponse.success(await this.pagesService.update(id, dto, user?.id));
  }

  @Post('admin/pages/:id/publish')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('pages', 'publish')
  @AuditAction('Page', 'publish')
  @HttpCode(HttpStatus.OK)
  async publish(@Param('id') id: string, @CurrentUser() user: any) {
    return ApiResponse.success(await this.pagesService.publish(id, user?.id));
  }

  @Post('admin/pages/:id/unpublish')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('pages', 'publish')
  @AuditAction('Page', 'unpublish')
  @HttpCode(HttpStatus.OK)
  async unpublish(@Param('id') id: string) {
    return ApiResponse.success(await this.pagesService.unpublish(id));
  }

  @Delete('admin/pages/:id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('pages', 'delete')
  @AuditAction('Page', 'delete')
  async remove(@Param('id') id: string) {
    return ApiResponse.success(await this.pagesService.remove(id));
  }

  // ─── Sections — reorder MUST be declared before :id to take priority ─────

  @Post('admin/pages/:pageId/sections/reorder')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('pages', 'edit')
  @HttpCode(HttpStatus.OK)
  async reorderSections(
    @Param('pageId') pageId: string,
    @Body() dto: ReorderSectionsDto,
  ) {
    return ApiResponse.success(await this.sectionsService.reorder(pageId, dto));
  }

  @Get('admin/pages/:pageId/sections')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('pages', 'view')
  async listSections(@Param('pageId') pageId: string) {
    return ApiResponse.success(await this.sectionsService.findAll(pageId));
  }

  @Post('admin/pages/:pageId/sections')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('pages', 'edit')
  @AuditAction('Section', 'create')
  @HttpCode(HttpStatus.CREATED)
  async createSection(
    @Param('pageId') pageId: string,
    @Body() dto: CreateSectionDto,
  ) {
    return ApiResponse.success(await this.sectionsService.create(pageId, dto));
  }

  @Patch('admin/pages/:pageId/sections/:id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('pages', 'edit')
  @AuditAction('Section', 'update')
  async updateSection(
    @Param('pageId') pageId: string,
    @Param('id') id: string,
    @Body() dto: UpdateSectionDto,
  ) {
    return ApiResponse.success(await this.sectionsService.update(pageId, id, dto));
  }

  @Delete('admin/pages/:pageId/sections/:id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('pages', 'edit')
  @AuditAction('Section', 'delete')
  async removeSection(
    @Param('pageId') pageId: string,
    @Param('id') id: string,
  ) {
    return ApiResponse.success(await this.sectionsService.remove(pageId, id));
  }
}
