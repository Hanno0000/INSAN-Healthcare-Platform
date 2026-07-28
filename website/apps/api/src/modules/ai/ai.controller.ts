import { Controller, Get, Post, Body, Param, Delete, UseGuards } from '@nestjs/common';
import { AiService } from './ai.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  // ==============================
  // Providers Endpoints (Admin only)
  // ==============================
  @UseGuards(JwtAuthGuard)
  @RequirePermission('settings', 'manage')
  @Get('providers')
  getProviders() {
    return this.aiService.getProviders();
  }

  @UseGuards(JwtAuthGuard)
  @RequirePermission('settings', 'manage')
  @Post('providers')
  saveProvider(@Body() body: any) {
    return this.aiService.saveProvider(body);
  }

  @UseGuards(JwtAuthGuard)
  @RequirePermission('settings', 'manage')
  @Delete('providers/:id')
  deleteProvider(@Param('id') id: string) {
    return this.aiService.deleteProvider(id);
  }

  // ==============================
  // Knowledge Base Endpoints (Admin only)
  // ==============================
  @UseGuards(JwtAuthGuard)
  @RequirePermission('settings', 'manage')
  @Get('knowledge-base')
  getKnowledgeBase() {
    return this.aiService.getKnowledgeBase();
  }

  @UseGuards(JwtAuthGuard)
  @RequirePermission('settings', 'manage')
  @Post('knowledge-base')
  saveKnowledgeBase(@Body() body: any) {
    return this.aiService.saveKnowledgeBase(body);
  }

  @UseGuards(JwtAuthGuard)
  @RequirePermission('settings', 'manage')
  @Delete('knowledge-base/:id')
  deleteKnowledgeBase(@Param('id') id: string) {
    return this.aiService.deleteKnowledgeBase(id);
  }

  // ==============================
  // Public Chat Endpoint
  // ==============================
  @Post('chat')
  processChat(@Body() body: { messages: { role: string, content: string }[] }) {
    return this.aiService.processChat(body.messages);
  }
}
