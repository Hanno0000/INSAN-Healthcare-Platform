import { IsObject } from 'class-validator';

export class UpdateAppointmentAnswersDto {
  @IsObject()
  answers: Record<string, any>;
}
