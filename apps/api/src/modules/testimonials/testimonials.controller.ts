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
import { TestimonialsService } from './testimonials.service';
import { CreateTestimonialDto } from './dto/create-testimonial.dto';
import { UpdateTestimonialDto } from './dto/update-testimonial.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { AuditInterceptor, AuditAction } from '../../common/interceptors/audit.interceptor';
import { ApiResponse } from '../../common/helpers/api-response.helper';

@Controller()
@UseInterceptors(AuditInterceptor)
export class TestimonialsController {
  constructor(private readonly testimonialsService: TestimonialsService) {}

  @Get('testimonials')
  async listPublic(@Query() query: any) {
    const result = await this.testimonialsService.findAll(query, false);
    return ApiResponse.paginated(result.data, result.page, result.pageSize, result.total);
  }

  @Get('admin/testimonials')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('testimonials', 'view')
  async listAdmin(@Query() query: any) {
    const result = await this.testimonialsService.findAll(query, true);
    return ApiResponse.paginated(result.data, result.page, result.pageSize, result.total);
  }

  @Get('admin/testimonials/:id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('testimonials', 'view')
  async getOne(@Param('id') id: string) {
    return ApiResponse.success(await this.testimonialsService.findOne(id));
  }

  @Post('admin/testimonials')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('testimonials', 'create')
  @AuditAction('Testimonial', 'create')
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateTestimonialDto) {
    return ApiResponse.success(await this.testimonialsService.create(dto));
  }

  @Patch('admin/testimonials/:id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('testimonials', 'edit')
  @AuditAction('Testimonial', 'update')
  async update(@Param('id') id: string, @Body() dto: UpdateTestimonialDto) {
    return ApiResponse.success(await this.testimonialsService.update(id, dto));
  }

  @Post('admin/testimonials/:id/publish')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('testimonials', 'edit')
  @AuditAction('Testimonial', 'publish')
  @HttpCode(HttpStatus.OK)
  async publish(@Param('id') id: string) {
    return ApiResponse.success(await this.testimonialsService.publish(id));
  }

  @Delete('admin/testimonials/:id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('testimonials', 'delete')
  @AuditAction('Testimonial', 'delete')
  async remove(@Param('id') id: string) {
    return ApiResponse.success(await this.testimonialsService.remove(id));
  }
}
