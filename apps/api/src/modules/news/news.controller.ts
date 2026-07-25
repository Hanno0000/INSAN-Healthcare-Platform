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
import { NewsService } from './news.service';
import { CreateNewsCategoryDto } from './dto/create-news-category.dto';
import { UpdateNewsCategoryDto } from './dto/update-news-category.dto';
import { CreateNewsPostDto } from './dto/create-news-post.dto';
import { UpdateNewsPostDto } from './dto/update-news-post.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { AuditInterceptor, AuditAction } from '../../common/interceptors/audit.interceptor';
import { ApiResponse } from '../../common/helpers/api-response.helper';

@Controller()
@UseInterceptors(AuditInterceptor)
export class NewsController {
  constructor(private readonly newsService: NewsService) {}

  // ─── Categories Public ───────────────────────────────────────────────────

  @Get('news-categories')
  async listCategoriesPublic() {
    return ApiResponse.success(await this.newsService.findAllCategories());
  }

  // ─── Categories Admin ────────────────────────────────────────────────────

  @Get('admin/news-categories')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('news', 'view')
  async listCategoriesAdmin() {
    return ApiResponse.success(await this.newsService.findAllCategories());
  }

  @Post('admin/news-categories')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('news', 'create')
  @AuditAction('NewsCategory', 'create')
  @HttpCode(HttpStatus.CREATED)
  async createCategory(@Body() dto: CreateNewsCategoryDto) {
    return ApiResponse.success(await this.newsService.createCategory(dto));
  }

  @Patch('admin/news-categories/:id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('news', 'edit')
  @AuditAction('NewsCategory', 'update')
  async updateCategory(@Param('id') id: string, @Body() dto: UpdateNewsCategoryDto) {
    return ApiResponse.success(await this.newsService.updateCategory(id, dto));
  }

  @Delete('admin/news-categories/:id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('news', 'delete')
  @AuditAction('NewsCategory', 'delete')
  async removeCategory(@Param('id') id: string) {
    return ApiResponse.success(await this.newsService.removeCategory(id));
  }

  // ─── News Posts Public ───────────────────────────────────────────────────

  @Get('news')
  async listPostsPublic(@Query() query: any, @Query('filter') filter: any) {
    const result = await this.newsService.findAllPosts(query, filter, false);
    return ApiResponse.paginated(result.data, result.page, result.pageSize, result.total);
  }

  @Get('news/:slug')
  async getPostBySlug(@Param('slug') slug: string) {
    return ApiResponse.success(await this.newsService.findPostBySlug(slug));
  }

  // ─── News Posts Admin ────────────────────────────────────────────────────

  @Get('admin/news')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('news', 'view')
  async listPostsAdmin(@Query() query: any, @Query('filter') filter: any) {
    const result = await this.newsService.findAllPosts(query, filter, true);
    return ApiResponse.paginated(result.data, result.page, result.pageSize, result.total);
  }

  @Get('admin/news/:id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('news', 'view')
  async getOnePost(@Param('id') id: string) {
    return ApiResponse.success(await this.newsService.findOnePost(id));
  }

  @Post('admin/news')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('news', 'create')
  @AuditAction('NewsPost', 'create')
  @HttpCode(HttpStatus.CREATED)
  async createPost(@Body() dto: CreateNewsPostDto) {
    return ApiResponse.success(await this.newsService.createPost(dto));
  }

  @Patch('admin/news/:id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('news', 'edit')
  @AuditAction('NewsPost', 'update')
  async updatePost(@Param('id') id: string, @Body() dto: UpdateNewsPostDto) {
    return ApiResponse.success(await this.newsService.updatePost(id, dto));
  }

  @Post('admin/news/:id/publish')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('news', 'publish')
  @AuditAction('NewsPost', 'publish')
  @HttpCode(HttpStatus.OK)
  async publishPost(@Param('id') id: string) {
    return ApiResponse.success(await this.newsService.publishPost(id));
  }

  @Delete('admin/news/:id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('news', 'delete')
  @AuditAction('NewsPost', 'delete')
  async removePost(@Param('id') id: string) {
    return ApiResponse.success(await this.newsService.removePost(id));
  }
}
