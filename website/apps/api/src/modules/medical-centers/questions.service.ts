import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBookingQuestionDto } from './dto/create-booking-question.dto';
import { UpdateBookingQuestionDto } from './dto/update-booking-question.dto';

@Injectable()
export class QuestionsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(medicalCenterId: string) {
    const questions = await this.prisma.bookingQuestion.findMany({
      where: { medicalCenterId },
      orderBy: { order: 'asc' },
    });
    return { success: true, data: questions };
  }

  async get(id: string) {
    const question = await this.prisma.bookingQuestion.findUnique({
      where: { id },
    });
    if (!question) throw new NotFoundException('Question not found');
    return { success: true, data: question };
  }

  async create(medicalCenterId: string, dto: CreateBookingQuestionDto) {
    // Verify medical center exists
    const mc = await this.prisma.medicalCenter.findUnique({ where: { id: medicalCenterId } });
    if (!mc) throw new NotFoundException('Medical center not found');

    const question = await this.prisma.bookingQuestion.create({
      data: {
        medicalCenterId,
        questionText: dto.questionText as any,
        questionType: dto.questionType,
        options: dto.options ? (dto.options as any) : null,
        isRequired: dto.isRequired ?? true,
        order: dto.order ?? 0,
        isActive: dto.isActive ?? true,
      },
    });
    return { success: true, data: question };
  }

  async update(id: string, dto: UpdateBookingQuestionDto) {
    const question = await this.prisma.bookingQuestion.update({
      where: { id },
      data: {
        questionText: dto.questionText ? (dto.questionText as any) : undefined,
        questionType: dto.questionType,
        options: dto.options !== undefined ? (dto.options as any) : undefined,
        isRequired: dto.isRequired,
        order: dto.order,
        isActive: dto.isActive,
      },
    });
    return { success: true, data: question };
  }

  async delete(id: string) {
    await this.prisma.bookingQuestion.delete({ where: { id } });
    return { success: true };
  }

  async copyTo(sourceCenterId: string, targetCenterIds: string[], questionIds?: string[]) {
    // Get source questions
    let whereClause: any = { medicalCenterId: sourceCenterId };
    if (questionIds && questionIds.length > 0) {
      whereClause.id = { in: questionIds };
    }

    const sourceQuestions = await this.prisma.bookingQuestion.findMany({
      where: whereClause,
      orderBy: { order: 'asc' },
    });

    if (sourceQuestions.length === 0) {
      return { success: true, count: 0 };
    }

    let totalCopied = 0;

    // For each target center, copy the questions
    for (const targetId of targetCenterIds) {
      if (targetId === sourceCenterId) continue;
      
      // Optional: Delete existing questions in target first to avoid duplicates?
      // For now, we just append them.
      
      const newQuestions = sourceQuestions.map(q => ({
        medicalCenterId: targetId,
        questionText: q.questionText as any,
        questionType: q.questionType,
        options: q.options as any,
        isRequired: q.isRequired,
        order: q.order,
        isActive: q.isActive,
      }));

      const res = await this.prisma.bookingQuestion.createMany({
        data: newQuestions,
      });
      totalCopied += res.count;
    }

    return { success: true, count: totalCopied };
  }
}
