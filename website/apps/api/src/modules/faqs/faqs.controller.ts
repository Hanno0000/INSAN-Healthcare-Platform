import { Controller, Get, Query } from '@nestjs/common';
import { FaqsService } from './faqs.service';
import { ApiResponse } from '../../common/helpers/api-response.helper';

@Controller()
export class FaqsController {
  constructor(private readonly faqsService: FaqsService) {}

  @Get('faqs')
  async listPublic(@Query() query: any) {
    const result = await this.faqsService.findAll(query);
    return ApiResponse.paginated(result.data, result.page, result.pageSize, result.total);
  }
}
