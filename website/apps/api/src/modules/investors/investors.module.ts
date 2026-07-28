import { Module } from '@nestjs/common';
import { InvestorsService } from './investors.service';
import { InvestorsController, AdminInvestorsController } from './investors.controller';

@Module({
  controllers: [InvestorsController, AdminInvestorsController],
  providers: [InvestorsService],
})
export class InvestorsModule {}
