import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import sanitizeHtml = require('sanitize-html');

@Injectable()
export class InvestorsService {
  constructor(private prisma: PrismaService) {}

  async getInvestorsPage() {
    const page = await this.prisma.investorsPage.findFirst();
    if (!page) {
      return {
        heroTitle: 'صفحة المستثمرين',
        htmlContent: '<p>المحتوى غير متوفر بعد.</p>',
        ctaButtonText: 'تواصل معنا',
        ctaButtonLink: '/contact',
        isPublished: false
      };
    }
    return page;
  }

  async updateInvestorsPage(data: {
    heroTitle: string;
    htmlContent: string;
    ctaButtonText?: string;
    ctaButtonLink?: string;
    isPublished?: boolean;
  }) {
    // Sanitize HTML to prevent XSS
    const cleanHtml = sanitizeHtml(data.htmlContent, {
      allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img', 'h1', 'h2', 'h3', 'div', 'span', 'iframe']),
      allowedAttributes: {
        ...sanitizeHtml.defaults.allowedAttributes,
        '*': ['class', 'style'],
        'img': ['src', 'alt', 'width', 'height'],
        'iframe': ['src', 'width', 'height', 'frameborder', 'allowfullscreen']
      },
      allowedSchemes: ['http', 'https', 'data']
    });

    const existing = await this.prisma.investorsPage.findFirst();
    
    if (existing) {
      return this.prisma.investorsPage.update({
        where: { id: existing.id },
        data: {
          ...data,
          htmlContent: cleanHtml
        }
      });
    }

    return this.prisma.investorsPage.create({
      data: {
        heroTitle: data.heroTitle,
        htmlContent: cleanHtml,
        ctaButtonText: data.ctaButtonText || 'اعرف أكتر',
        ctaButtonLink: data.ctaButtonLink || '/contact',
        isPublished: data.isPublished || false
      }
    });
  }
}
