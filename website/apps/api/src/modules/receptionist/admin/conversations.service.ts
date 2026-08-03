import { Injectable, NotFoundException } from '@nestjs/common';
import { ChatChannel, LeadStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ConversationsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(params: {
    page: number;
    pageSize: number;
    leadStatus?: LeadStatus;
    channel?: ChatChannel;
    brandId?: string;
  }) {
    const where: Prisma.ChatConversationWhereInput = {
      ...(params.leadStatus ? { leadStatus: params.leadStatus } : {}),
      ...(params.channel ? { channel: params.channel } : {}),
      ...(params.brandId ? { brandId: params.brandId } : {}),
    };

    const [total, rows] = await Promise.all([
      this.prisma.chatConversation.count({ where }),
      this.prisma.chatConversation.findMany({
        where,
        // Urgent first, then most recently active. A staff member opening this
        // screen should see the person who needs calling, not the newest chat.
        orderBy: [{ handedOffAt: 'desc' }, { lastMessageAt: 'desc' }],
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
        include: {
          brand: { select: { code: true, displayName: true } },
          resolvedHospital: { select: { slug: true, name: true } },
          appointmentRequest: { select: { id: true, status: true } },
          _count: { select: { messages: true } },
        },
      }),
    ]);

    return {
      data: rows.map((c) => ({
        id: c.id,
        channel: c.channel,
        brand: c.brand?.code ?? null,
        hospital: c.resolvedHospital?.slug ?? null,
        scopeState: c.scopeState,
        leadStatus: c.leadStatus,
        slots: c.slots,
        messageCount: c._count.messages,
        handedOffAt: c.handedOffAt,
        lastMessageAt: c.lastMessageAt,
        startedAt: c.startedAt,
        appointmentRequestId: c.appointmentRequest?.id ?? null,
      })),
      meta: { total, page: params.page, pageSize: params.pageSize },
    };
  }

  async stats() {
    const grouped = await this.prisma.chatConversation.groupBy({
      by: ['leadStatus'],
      _count: { _all: true },
    });

    const byStatus = Object.fromEntries(grouped.map((g) => [g.leadStatus, g._count._all]));

    // Cache health, from the tokens recorded on every AI message. The
    // architecture gates progress on this staying above 70% — without surfacing
    // it, a cold cache is invisible: the replies look fine and the bill is
    // several times what it should be.
    const cache = await this.prisma.chatMessage.aggregate({
      _sum: { cachedTokens: true, inputTokens: true },
      where: { sender: 'AI', inputTokens: { not: null } },
    });
    const cached = cache._sum.cachedTokens ?? 0;
    const fresh = cache._sum.inputTokens ?? 0;
    const totalInput = cached + fresh;

    return {
      byStatus,
      needsAttention:
        (byStatus[LeadStatus.EMERGENCY] ?? 0) +
        (byStatus[LeadStatus.NEEDS_HUMAN] ?? 0) +
        (byStatus[LeadStatus.READY_TO_BOOK] ?? 0),
      cacheHitRatio: totalInput > 0 ? Number((cached / totalInput).toFixed(3)) : null,
    };
  }

  async detail(id: string) {
    const c = await this.prisma.chatConversation.findUnique({
      where: { id },
      include: {
        brand: { select: { code: true, displayName: true } },
        resolvedHospital: { select: { slug: true, name: true } },
        appointmentRequest: true,
        messages: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!c) throw new NotFoundException('Conversation not found');

    return {
      id: c.id,
      channel: c.channel,
      brand: c.brand,
      hospital: c.resolvedHospital,
      scopeState: c.scopeState,
      leadStatus: c.leadStatus,
      slots: c.slots,
      startedAt: c.startedAt,
      handedOffAt: c.handedOffAt,
      appointmentRequest: c.appointmentRequest,
      messages: c.messages.map((m) => ({
        id: m.id,
        sender: m.sender,
        content: m.content,
        createdAt: m.createdAt,
        safetyFlag: m.safetyFlag,
        // Surfaced so a staff member reviewing a bad answer can see exactly
        // which records it was drawn from.
        citedRecordIds: m.citedRecordIds,
        modelUsed: m.modelUsed,
        latencyMs: m.latencyMs,
        cachedTokens: m.cachedTokens,
      })),
    };
  }
}
