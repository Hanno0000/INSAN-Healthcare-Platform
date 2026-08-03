import { Injectable, Logger } from '@nestjs/common';
import { ChatChannel } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { InboundMessage, SurfaceTraits } from '../../core/types';

/**
 * The web widget.
 *
 * `canReplyLater: false` is the load-bearing difference from Messenger. An
 * anonymous visitor who closes the tab is unreachable, so the engine promotes
 * the phone slot ahead of the softer questions — a warm lead with no number is
 * worth nothing here.
 *
 * `isPublic: false` because the widget ships behind the existing
 * `ai_chat_enabled` feature flag, which makes it the intended place to exercise
 * provisional data while the Facebook pages stay gated.
 */
const WEB_TRAITS: SurfaceTraits = { isPublic: false, canReplyLater: false };

@Injectable()
export class WebAdapter {
  private readonly logger = new Logger(WebAdapter.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * The website is INSAN's own surface, so every conversation starts on the
   * INSAN brand — and then narrows by page, not by asking.
   */
  async toInbound(input: {
    visitorId: string;
    text: string;
    locale?: string;
    /** Path the visitor is reading, e.g. /hospitals/delta-hospital. */
    path?: string;
  }): Promise<InboundMessage | null> {
    const brand = await this.prisma.brand.findUnique({ where: { code: 'INSAN' } });
    if (!brand) {
      this.logger.error('Brand INSAN not found — run the seed.');
      return null;
    }

    return {
      brandId: brand.id,
      channel: ChatChannel.WEB,
      externalId: null,
      visitorId: input.visitorId,
      text: input.text,
      locale: input.locale ?? 'ar',
      surface: WEB_TRAITS,
      hints: this.hintsFromPath(input.path),
    };
  }

  /**
   * A visitor on /hospitals/delta-hospital has already said which hospital they
   * mean. This is the one advantage the web surface has over Messenger, and it
   * costs nothing.
   */
  private hintsFromPath(path?: string): Record<string, string> {
    if (!path) return {};
    const hospital = /\/hospitals\/([a-z0-9-]+)/i.exec(path);
    if (hospital) return { hospitalSlug: hospital[1] };

    const center = /\/medical-centers\/([a-z0-9-]+)/i.exec(path);
    if (center) return { centerSlug: center[1] };

    return {};
  }
}
