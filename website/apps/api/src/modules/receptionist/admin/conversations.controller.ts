import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ChatChannel, LeadStatus } from '@prisma/client';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { ConversationsService } from './conversations.service';

/**
 * Read-only view of receptionist conversations for staff.
 *
 * Guarded by the existing `appointments` permission rather than a new one: the
 * people who work these leads are the people who work appointments, and a
 * separate permission would mean a separate thing to forget to grant.
 */
@Controller('admin/receptionist/conversations')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ConversationsController {
  constructor(private readonly service: ConversationsService) {}

  @Get()
  @RequirePermission('appointments', 'view')
  list(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('leadStatus') leadStatus?: LeadStatus,
    @Query('channel') channel?: ChatChannel,
    @Query('brandId') brandId?: string,
  ) {
    return this.service.list({
      page: Number(page) || 1,
      pageSize: Math.min(Number(pageSize) || 20, 100),
      leadStatus,
      channel,
      brandId,
    });
  }

  /** Counts per lead status — drives the dashboard tiles. */
  @Get('stats')
  @RequirePermission('appointments', 'view')
  stats() {
    return this.service.stats();
  }

  @Get(':id')
  @RequirePermission('appointments', 'view')
  detail(@Param('id') id: string) {
    return this.service.detail(id);
  }
}
