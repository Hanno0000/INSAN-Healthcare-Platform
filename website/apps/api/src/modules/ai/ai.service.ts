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

  async processChat(messages: { role: string, content: string }[]) {
    // 1. Get User's latest message
    const lastMessage = messages[messages.length - 1].content;

    // 2. Perform Vector Search (RAG)
    let contextStr = '';
    const vector = await this.generateEmbedding(lastMessage);
    
    if (vector.length > 0) {
      // pgvector similarity search
      const results = await this.prisma.$queryRawUnsafe<any[]>(
        `SELECT topic, question, answer, 1 - (embedding <=> $1::vector) as similarity
         FROM "AiKnowledgeBase"
         WHERE isActive = true AND embedding IS NOT NULL
         ORDER BY similarity DESC
         LIMIT 3`,
        `[${vector.join(',')}]`
      );
      
      if (results && results.length > 0 && results[0].similarity > 0.5) {
        contextStr = results.map(r => `Q: ${r.question?.ar}\nA: ${r.answer?.ar}`).join('\n\n');
      }
    }

    const systemPrompt = `أنت مساعد ذكي لمنظومة إنسان للرعاية الصحية. 
مهمتك مساعدة المرضى والعملاء بأدب واحترافية باللغة العربية.
استخدم المعلومات التالية للإجابة على سؤال المستخدم إن أمكن، ولا تخترع معلومات غير موجودة.
معلومات سياقية:
${contextStr || 'لا توجد معلومات مخصصة. أجب بشكل عام ورحب بالعميل.'}`;

    // 3. Provider Fallback Logic
    const providers = await this.prisma.aiProvider.findMany({
      where: { isActive: true },
      orderBy: { priority: 'asc' },
    });

    if (providers.length === 0) {
      return { text: "عذراً، المساعد الذكي غير متصل حالياً بأي مزود خدمة." };
    }

    const formattedMessages = [
      { role: 'system', content: systemPrompt },
      ...messages
    ];

    for (const provider of providers) {
      try {
        const reply = await this.callProvider(provider, formattedMessages);
        if (reply) return { text: reply };
      } catch (err) {
        this.logger.warn(`Provider ${provider.name} failed: ${err.message}. Trying next...`);
        // Continue to next provider in fallback chain
      }
    }

    throw new HttpException('All AI providers failed', HttpStatus.SERVICE_UNAVAILABLE);
  }

  private async callProvider(provider: AiProvider, messages: any[]): Promise<string> {
    const isGroq = provider.name.toLowerCase().includes('groq');
    const isGemini = provider.name.toLowerCase().includes('gemini');
    const isOpenAI = provider.name.toLowerCase().includes('openai');

    // OpenAI compatible endpoint (Groq, OpenAI, Together, etc)
    if (isGroq || isOpenAI || (provider.baseUrl && provider.baseUrl.includes('openai'))) {
      const url = provider.baseUrl || 'https://api.groq.com/openai/v1/chat/completions';
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
      if (!res.ok) throw new Error(`API error: ${res.statusText}`);
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
      if (!res.ok) throw new Error(`API error: ${res.statusText}`);
      const data = await res.json();
      return data.candidates[0].content.parts[0].text;
    }

    throw new Error(`Unsupported provider type: ${provider.name}`);
  }
}
