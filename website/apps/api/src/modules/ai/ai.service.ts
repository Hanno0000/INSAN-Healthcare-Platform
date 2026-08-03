import { Injectable, Logger, HttpException, HttpStatus, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiProvider } from '@prisma/client';

const MASK_PREFIX = '••••';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(private prisma: PrismaService) {}

  /** Mask an API key for display (e.g. ••••1234) — never return the raw value to the client. */
  private maskApiKey(value: string): string {
    if (!value) return '';
    if (value.length <= 4) return MASK_PREFIX;
    return MASK_PREFIX + value.slice(-4);
  }

  // ==============================
  // Providers Management
  // ==============================
  async getProviders() {
    const providers = await this.prisma.aiProvider.findMany({
      orderBy: { priority: 'asc' },
    });
    return providers.map(({ apiKey, ...rest }) => ({
      ...rest,
      maskedApiKey: this.maskApiKey(apiKey),
    }));
  }

  async saveProvider(data: { id?: string; name: string; baseUrl?: string; apiKey?: string; modelName: string; priority: number; isActive: boolean }) {
    const { apiKey, ...rest } = data;
    const isMasked = typeof apiKey === 'string' && apiKey.startsWith(MASK_PREFIX);

    if (data.id) {
      const { id, ...updateData } = rest;
      if (!isMasked && apiKey) {
        (updateData as any).apiKey = apiKey;
      }
      return this.prisma.aiProvider.update({ where: { id }, data: updateData });
    }

    if (!apiKey || isMasked) {
      throw new BadRequestException('apiKey is required to create a new provider');
    }
    return this.prisma.aiProvider.create({ data: { ...rest, apiKey } as any });
  }

  async deleteProvider(id: string) {
    return this.prisma.aiProvider.delete({ where: { id } });
  }

  async testProvider(body: any) {
    try {
      const provider = {
        name: body.name,
        baseUrl: body.baseUrl,
        apiKey: body.apiKey,
        modelName: body.modelName,
        priority: 0,
        isActive: true,
      } as AiProvider;
      
      const reply = await this.callProvider(provider, [{ role: 'user', content: 'Say "Hello, this is a test from AI" in Arabic.' }]);
      return { success: true, text: reply };
    } catch (e) {
      throw new BadRequestException(e.message);
    }
  }

  // ==============================
  // Knowledge Base Management
  // ==============================
  async getKnowledgeBase() {
    return this.prisma.aiKnowledgeBase.findMany({
      orderBy: { createdAt: 'desc' },
      select: { id: true, topic: true, question: true, answer: true, category: true, isActive: true, createdAt: true, updatedAt: true } // Exclude embedding from response
    });
  }

  async saveKnowledgeBase(data: { id?: string; topic: any; question: any; answer: any; category?: string; isActive?: boolean }) {
    // Generate embedding using a free embedding provider (e.g., Gemini)
    // For now, we'll save the text and try to generate embedding if possible
    let embeddingSql = null;
    try {
      const textToEmbed = `${data.question?.ar || ''} ${data.answer?.ar || ''}`;
      const vector = await this.generateEmbedding(textToEmbed);
      if (vector && vector.length > 0) {
        embeddingSql = vector;
      }
    } catch (e) {
      this.logger.error('Failed to generate embedding', e);
    }

    if (data.id) {
      // Update
      const { id, ...updateData } = data;
      await this.prisma.aiKnowledgeBase.update({ where: { id: data.id }, data: updateData as any }); 
      if (embeddingSql) {
        await this.prisma.$executeRawUnsafe(`UPDATE "AiKnowledgeBase" SET embedding = $1::vector WHERE id = $2`, `[${embeddingSql.join(',')}]`, data.id);
      }
      return { success: true };
    } else {
      // Create
      const { id, ...createData } = data;
      const created = await this.prisma.aiKnowledgeBase.create({ data: createData as any });
      if (embeddingSql) {
        await this.prisma.$executeRawUnsafe(`UPDATE "AiKnowledgeBase" SET embedding = $1::vector WHERE id = $2`, `[${embeddingSql.join(',')}]`, created.id);
      }
      return { success: true };
    }
  }

  async deleteKnowledgeBase(id: string) {
    return this.prisma.aiKnowledgeBase.delete({ where: { id } });
  }

  // ==============================
  // AI Core Logic
  // ==============================
  
  async generateEmbedding(text: string): Promise<number[]> {
    // Attempt to use Gemini for embeddings (requires an active Gemini provider)
    const geminiProvider = await this.prisma.aiProvider.findFirst({
      where: { name: { contains: 'gemini', mode: 'insensitive' }, isActive: true },
    });
    
    if (!geminiProvider) {
      // Fallback: If no embedding provider is found, return empty (search will fallback to keyword)
      return [];
    }

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${geminiProvider.apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'models/text-embedding-004',
        content: { parts: [{ text }] }
      })
    });
    const data = await response.json();
    return data?.embedding?.values || [];
  }

  // processChat() was removed 2026-08-03 together with POST /ai/chat.
  // The public assistant is now the receptionist module, which runs a
  // deterministic safety gate before any model call and a grounding check
  // after it. See modules/receptionist/core/engine/conversation-engine.service.ts
  //
  // Its pgvector query also carried a live defect worth recording: it read
  //  unquoted. Postgres folds unquoted identifiers to
  // lowercase and Prisma created the column as "isActive", so the query threw
  // on every call, retrieval silently returned nothing, and the assistant
  // answered ungrounded while looking perfectly healthy in every log. The
  // replacement in SemanticSource quotes it.

  private async callProvider(provider: AiProvider, messages: any[]): Promise<string> {
    const isGroq = provider.name.toLowerCase().includes('groq');
    const isGemini = provider.name.toLowerCase().includes('gemini');
    const isOpenAI = provider.name.toLowerCase().includes('openai');

    // OpenAI compatible endpoint (Groq, OpenAI, Together, etc)
    if (isGroq || isOpenAI || (provider.baseUrl && provider.baseUrl.includes('openai'))) {
      const baseUrl = provider.baseUrl || 'https://api.groq.com/openai/v1';
      const url = baseUrl.endsWith('/chat/completions') ? baseUrl : `${baseUrl.replace(/\/$/, '')}/chat/completions`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${provider.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: provider.modelName,
          messages: messages.map(m => ({ role: m.role, content: m.content })),
        })
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`API error: ${res.statusText} - ${errText}`);
      }
      const data = await res.json();
      return data.choices[0].message.content;
    }

    // Gemini API
    if (isGemini) {
      const url = provider.baseUrl || `https://generativelanguage.googleapis.com/v1beta/models/${provider.modelName}:generateContent?key=${provider.apiKey}`;
      
      // Convert OpenAI messages format to Gemini format
      const geminiMessages = messages.map(m => {
        if (m.role === 'system') return null; // System prompt handled separately in Gemini (or prepended)
        return {
          role: m.role === 'user' ? 'user' : 'model',
          parts: [{ text: m.content }]
        };
      }).filter(Boolean);

      const systemMessage = messages.find(m => m.role === 'system')?.content;

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: systemMessage ? { parts: [{ text: systemMessage }] } : undefined,
          contents: geminiMessages,
        })
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`API error: ${res.statusText} - ${errText}`);
      }
      const data = await res.json();
      
      if (!data.candidates || data.candidates.length === 0) {
        throw new Error(`Gemini API returned no candidates: ${JSON.stringify(data)}`);
      }
      const candidate = data.candidates[0];
      if (!candidate.content || !candidate.content.parts || candidate.content.parts.length === 0) {
        throw new Error(`Gemini API response blocked or empty (finishReason: ${candidate.finishReason}): ${JSON.stringify(data)}`);
      }
      return candidate.content.parts[0].text;
    }

    throw new Error(`Unsupported provider type: ${provider.name}`);
  }
}
