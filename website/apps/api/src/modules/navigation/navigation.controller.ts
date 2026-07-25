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
import { NavigationService } from './navigation.service';
import { CreateNavigationItemDto } from './dto/create-navigation-item.dto';
import { UpdateNavigationItemDto } from './dto/update-navigation-item.dto';
import { ReorderNavigationDto } from './dto/reorder-navigation.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { AuditInterceptor, AuditAction } from '../../common/interceptors/audit.interceptor';
import { ApiResponse } from '../../common/helpers/api-response.helper';

@Controller()
@UseInterceptors(AuditInterceptor)
export class NavigationController {
  constructor(private readonly navigationService: NavigationService) {}

  @Get('navigation')
  async listPublic(@Query('location') location?: string) {
    return ApiResponse.success(await this.navigationService.findAll(location));
  }

  @Get('admin/navigation')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('navigation', 'view')
  async listAdmin(@Query('location') location?: string) {
    return ApiResponse.success(await this.navigationService.findAll(location));
  }

  @Post('admin/navigation/reorder')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('navigation', 'edit')
  @HttpCode(HttpStatus.OK)
  async reorder(@Body() dto: ReorderNavigationDto) {
    return ApiResponse.success(await this.navigationService.reorder(dto));
  }

  @Post('admin/navigation')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('navigation', 'edit')
  @AuditAction('NavigationItem', 'create')
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateNavigationItemDto) {
    return ApiResponse.success(await this.navigationService.create(dto));
  }

  @Patch('admin/navigation/:id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('navigation', 'edit')
  @AuditAction('NavigationItem', 'update')
  async update(@Param('id') id: string, @Body() dto: UpdateNavigationItemDto) {
    return ApiResponse.success(await this.navigationService.update(id, dto));
  }

  @Delete('admin/navigation/:id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('navigation', 'edit')
  @AuditAction('NavigationItem', 'delete')
  async remove(@Param('id') id: string) {
    return ApiResponse.success(await this.navigationService.remove(id));
  }
}
