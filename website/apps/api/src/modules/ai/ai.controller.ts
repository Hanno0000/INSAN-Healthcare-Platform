import { Controller, Get, Post, Body, Param, Delete, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AiService } from './ai.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { ChatDto } from './dto/chat.dto';

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  // ==============================
  // Providers Endpoints (Admin only)
  // ==============================
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('settings', 'manage')
  @Get('providers')
  getProviders() {
    return this.aiService.getProviders();
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('settings', 'manage')
  @Post('providers')
  saveProvider(@Body() body: any) {
    return this.aiService.saveProvider(body);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('settings', 'manage')
  @Delete('providers/:id')
  deleteProvider(@Param('id') id: string) {
    return this.aiService.deleteProvider(id);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('settings', 'manage')
  @Post('providers/test')
  testProvider(@Body() body: any) {
    return this.aiService.testProvider(body);
  }

  // ==============================
  // Knowledge Base Endpoints (Admin only)
  // ==============================
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('settings', 'manage')
  @Get('knowledge-base')
  getKnowledgeBase() {
    return this.aiService.getKnowledgeBase();
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('settings', 'manage')
  @Post('knowledge-base')
  saveKnowledgeBase(@Body() body: any) {
    return this.aiService.saveKnowledgeBase(body);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('settings', 'manage')
  @Delete('knowledge-base/:id')
  deleteKnowledgeBase(@Param('id') id: string) {
    return this.aiService.deleteKnowledgeBase(id);
  }

  // ==============================
  // Public Chat Endpoint — REMOVED 2026-08-03
  // ==============================
  //
  // `POST /ai/chat` used to serve the public site widget. It is gone, and the
  // widget now calls `POST /receptionist/web/message`.
  //
  // It was removed rather than fixed because of what it did NOT have: no
  // emergency detection, no scope (it could describe either hospital's services
  // on any page), no grounding check, and no persistence. A patient describing
  // chest pain to it got a general chatbot answer. Leaving it reachable would
  // have left a documented way around every safety gate in the receptionist.
  //
  // Provider and knowledge-base management above are unaffected — the admin
  // dashboard still uses them.
}
