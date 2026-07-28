import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { IntegrationsService } from '../integrations/integrations.service';
import { NewsSourceType, SocialPlatform, ContentStatus } from '@prisma/client';

@Injectable()
export class FacebookSyncService {
  private readonly logger = new Logger(FacebookSyncService.name);

  constructor(
    private prisma: PrismaService,
    private integrations: IntegrationsService
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async handleCron() {
    this.logger.debug('Running Facebook Sync Cron Job...');
    await this.syncFacebookPosts();
  }

  async syncFacebookPosts() {
    try {
      // Get the Facebook credentials from DB securely
      const pageId = await this.integrations.getIntegrationValue('FACEBOOK_PAGE_ID');
      const accessToken = await this.integrations.getIntegrationValue('FACEBOOK_ACCESS_TOKEN');

      if (!pageId || !accessToken) {
        this.logger.warn('Facebook credentials not configured. Skipping sync.');
        return { success: false, message: 'Credentials not configured' };
      }

      // Fetch from Graph API
      const url = `https://graph.facebook.com/v19.0/${pageId}/posts?fields=id,message,created_time,full_picture,permalink_url&access_token=${accessToken}&limit=10`;
      
      const response = await fetch(url);
      const data = await response.json();

      if (data.error) {
        this.logger.error(`Facebook API Error: ${data.error.message}`);
        return { success: false, error: data.error.message };
      }

      if (!Array.isArray(data?.data)) {
        this.logger.warn('Facebook API response did not contain a posts array — skipping sync.');
        return { success: false, message: 'Unexpected Facebook API response shape' };
      }

      let syncedCount = 0;

      for (const post of data.data) {
        if (!post.message) continue; // Skip posts without text

        // Check if we already have this post
        const existing = await this.prisma.newsPost.findUnique({
          where: {
            sourcePlatform_externalPostId: {
              sourcePlatform: SocialPlatform.FACEBOOK,
              externalPostId: post.id
            }
          }
        });

        if (!existing) {
          await this.prisma.newsPost.create({
            data: {
              slug: `fb-${post.id}`, // Unique slug
              title: {
                ar: post.message.substring(0, 50) + (post.message.length > 50 ? '...' : ''),
                en: post.message.substring(0, 50) + (post.message.length > 50 ? '...' : '')
              },
              excerpt: {
                ar: post.message.substring(0, 150),
                en: post.message.substring(0, 150)
              },
              body: {
                ar: post.message,
                en: post.message
              },
              featuredImage: post.full_picture || null,
              // Requires editorial review before appearing on the public site.
              status: ContentStatus.DRAFT,
              sourceType: NewsSourceType.SOCIAL_SYNC,
              sourcePlatform: SocialPlatform.FACEBOOK,
              externalPostId: post.id,
              externalPermalink: post.permalink_url,
              publishedAt: new Date(post.created_time),
              syncedAt: new Date()
            }
          });
          syncedCount++;
        }
      }

      this.logger.log(`Successfully synced ${syncedCount} new Facebook posts.`);
      return { success: true, syncedCount };

    } catch (error) {
      this.logger.error('Failed to sync Facebook posts', error);
      return { success: false, error: error.message };
    }
  }
}
