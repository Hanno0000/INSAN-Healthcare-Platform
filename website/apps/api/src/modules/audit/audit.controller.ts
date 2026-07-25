import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { ApiResponse } from '../../common/helpers/api-response.helper';

@Controller('admin/audit-logs')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermission('audit', 'view')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  async list(@Query() query: any, @Query('filter') filter: any) {
    const result = await this.auditService.findAll(query, filter);
    return ApiResponse.paginated(result.data, result.page, result.pageSize, result.total);
  }

  @Get(':id')
  async getOne(@Param('id') id: string) {
    return ApiResponse.success(await this.auditService.findOne(id));
  }
}
