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
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { AuditInterceptor, AuditAction } from '../../common/interceptors/audit.interceptor';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ApiResponse } from '../../common/helpers/api-response.helper';

@Controller('admin')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@UseInterceptors(AuditInterceptor)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('roles')
  @RequirePermission('users', 'view')
  async listRoles() {
    return ApiResponse.success(await this.usersService.findAllRoles());
  }

  @Get('users')
  @RequirePermission('users', 'view')
  async listUsers(@Query() query: any) {
    const result = await this.usersService.findAll(query);
    return ApiResponse.paginated(result.data, result.page, result.pageSize, result.total);
  }

  @Get('users/:id')
  @RequirePermission('users', 'view')
  async getOne(@Param('id') id: string) {
    return ApiResponse.success(await this.usersService.findOne(id));
  }

  @Post('users')
  @RequirePermission('users', 'manage')
  @AuditAction('User', 'create')
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateUserDto) {
    return ApiResponse.success(await this.usersService.create(dto));
  }

  @Patch('users/:id')
  @RequirePermission('users', 'manage')
  @AuditAction('User', 'update')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() user: any,
  ) {
    return ApiResponse.success(await this.usersService.update(id, dto, user.id));
  }

  @Delete('users/:id')
  @RequirePermission('users', 'manage')
  @AuditAction('User', 'delete')
  async remove(@Param('id') id: string, @CurrentUser() user: any) {
    return ApiResponse.success(await this.usersService.remove(id, user.id));
  }
}
