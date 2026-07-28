import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class IntegrationsService {
  private readonly encryptionKey: string;

  constructor(private prisma: PrismaService) {
    // In production, this should be a secure 32-byte key from ENV
    const secret = process.env.ENCRYPTION_KEY || 'insan-default-secret-key-32-chars!';
    
    // Ensure it's exactly 32 bytes for AES-256
    this.encryptionKey = crypto.createHash('sha256').update(String(secret)).digest('base64').substring(0, 32);
  }

  // Encrypt value
  private encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(this.encryptionKey), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
  }

  // Decrypt value
  public decrypt(text: string): string {
    try {
      const textParts = text.split(':');
      const iv = Buffer.from(textParts.shift() as string, 'hex');
      const encryptedText = Buffer.from(textParts.join(':'), 'hex');
      const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(this.encryptionKey), iv);
      let decrypted = decipher.update(encryptedText);
      decrypted = Buffer.concat([decrypted, decipher.final()]);
      return decrypted.toString();
    } catch (error) {
      console.error('Failed to decrypt value', error);
      return '';
    }
  }

  // Mask value for frontend (e.g., ••••1234)
  private maskValue(value: string): string {
    if (!value) return '';
    if (value.length <= 4) return '••••';
    return '••••' + value.slice(-4);
  }

  async getAllIntegrations() {
    const integrations = await this.prisma.integrationSetting.findMany();
    
    // Return masked values
    return integrations.map(i => {
      const decrypted = this.decrypt(i.encryptedValue);
      return {
        id: i.id,
        provider: i.provider,
        isActive: i.isActive,
        maskedValue: this.maskValue(decrypted),
      };
    });
  }

  async getIntegrationValue(provider: string): Promise<string | null> {
    const integration = await this.prisma.integrationSetting.findUnique({
      where: { provider }
    });
    
    if (!integration || !integration.isActive) return null;
    return this.decrypt(integration.encryptedValue);
  }

  async upsertIntegration(provider: string, value: string, isActive: boolean = true) {
    // Check if the value is masked (e.g. from frontend submission without changing)
    // If it's masked, we don't update the encryptedValue
    if (value.startsWith('••••')) {
      const existing = await this.prisma.integrationSetting.findUnique({ where: { provider } });
      if (!existing) throw new NotFoundException('Integration not found to update status');
      
      const updated = await this.prisma.integrationSetting.update({
        where: { provider },
        data: { isActive }
      });
      
      return {
        id: updated.id,
        provider: updated.provider,
        isActive: updated.isActive,
        maskedValue: value,
      };
    }

    const encryptedValue = this.encrypt(value);
    
    const upserted = await this.prisma.integrationSetting.upsert({
      where: { provider },
      update: { encryptedValue, isActive },
      create: { provider, encryptedValue, isActive }
    });

    return {
      id: upserted.id,
      provider: upserted.provider,
      isActive: upserted.isActive,
      maskedValue: this.maskValue(value),
    };
  }

  async deleteIntegration(provider: string) {
    await this.prisma.integrationSetting.delete({ where: { provider } });
    return { success: true };
  }
}
