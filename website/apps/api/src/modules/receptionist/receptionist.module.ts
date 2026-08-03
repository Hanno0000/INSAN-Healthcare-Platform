import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ReceptionistConfigService } from './core/receptionist-config.service';
import { BudgetGuardService } from './core/budget-guard.service';
import { RetentionService } from './core/retention.service';
import { LexiconLoader } from './core/safety/lexicon.loader';
import { SafetyGateService } from './core/safety/safety-gate.service';
import { ScopeResolverService } from './core/scope/scope-resolver.service';
import { FactsLoader } from './core/retrieval/facts.loader';
import { DeterministicSource } from './core/retrieval/deterministic.source';
import { SemanticSource } from './core/retrieval/semantic.source';
import { RetrieverService } from './core/retrieval/retriever.service';
import { ContextBuilderService } from './core/context/context-builder.service';
import { ClaudeProvider } from './core/model/claude.provider';
import { GroundingService } from './core/engine/grounding.service';
import { SlotFillerService } from './core/engine/slot-filler.service';
import { QualifierService } from './core/qualify/qualifier.service';
import { NotifierService } from './core/handoff/notifier.service';
import { HandoffService } from './core/handoff/handoff.service';
import { ConversationEngineService } from './core/engine/conversation-engine.service';
import { MessengerAdapter } from './channels/messenger/messenger.adapter';
import { MessengerController } from './channels/messenger/messenger.controller';
import { WebAdapter } from './channels/web/web.adapter';
import { WebController } from './channels/web/web.controller';
import { ConversationsController } from './admin/conversations.controller';
import { ConversationsService } from './admin/conversations.service';

/**
 * Healthcare AI Layer.
 *
 * Serves four surfaces from one engine: the INSAN website, and the INSAN,
 * Future and Delta Facebook pages. See receptionist/docs/ARCHITECTURE.md.
 *
 * Structure:
 *   core/      channel-agnostic. Knows nothing about Messenger, HTTP or PSIDs.
 *   channels/  adapters. Translation only, zero business logic.
 *
 * The separation is enforced, not asserted:
 *   node receptionist/scripts/check-boundary.js
 *
 * Behaviour, voice, safety lexicons and operator data live in `receptionist/`
 * at the repository root — reviewable without opening TypeScript.
 */
@Module({
  imports: [PrismaModule],
  controllers: [MessengerController, WebController, ConversationsController],
  providers: [
    ReceptionistConfigService,
    BudgetGuardService,
    RetentionService,
    LexiconLoader,
    SafetyGateService,
    ScopeResolverService,
    FactsLoader,
    DeterministicSource,
    SemanticSource,
    RetrieverService,
    ContextBuilderService,
    ClaudeProvider,
    GroundingService,
    SlotFillerService,
    QualifierService,
    NotifierService,
    HandoffService,
    ConversationEngineService,
    MessengerAdapter,
    WebAdapter,
    ConversationsService,
  ],
  exports: [ReceptionistConfigService, ConversationEngineService],
})
export class ReceptionistModule {}
