import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { InvestorsService } from './investors.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';

@Controller('investors-page')
export class InvestorsController {
  constructor(private readonly investorsService: InvestorsService) {}

  @Get()
  async getPage() {
    return this.investorsService.getInvestorsPage();
  }
}

@Controller('admin/investors-page')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermission('pages', 'edit') // Assuming managing this requires page editing permissions
export class AdminInvestorsController {
  constructor(private readonly investorsService: InvestorsService) {}

  @Get()
  async getPage() {
    return this.investorsService.getInvestorsPage();
  }

  @Post()
  async updatePage(@Body() body: any) {
    return this.investorsService.updateInvestorsPage(body);
  }
}
