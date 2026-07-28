import { Controller, Get, Post, Body, UseGuards, Param, Delete } from '@nestjs/common';
import { IntegrationsService } from './integrations.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';

@Controller('admin/integrations')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermission('settings', 'manage') // Use settings manage permission
export class IntegrationsController {
  constructor(private readonly integrationsService: IntegrationsService) {}

  @Get()
  async getAll() {
    const data = await this.integrationsService.getAllIntegrations();
    return { data };
  }

  @Post()
  async upsert(@Body() body: { provider: string; value: string; isActive?: boolean }) {
    const data = await this.integrationsService.upsertIntegration(
      body.provider,
      body.value,
      body.isActive !== undefined ? body.isActive : true
    );
    return { data };
  }

  @Delete(':provider')
  async remove(@Param('provider') provider: string) {
    return this.integrationsService.deleteIntegration(provider);
  }
}
