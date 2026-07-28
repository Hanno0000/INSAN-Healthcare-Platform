import { IsEnum, IsOptional } from 'class-validator';
import { AppointmentStatus } from '@prisma/client';

export class UpdateAppointmentStatusDto {
  @IsEnum(AppointmentStatus)
  status: AppointmentStatus;

  @IsOptional()
  notes?: string;
}

export class MarkContactReadDto {
  @IsOptional()
  isRead?: boolean;
}
