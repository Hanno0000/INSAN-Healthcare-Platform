import { PartialType } from '@nestjs/mapped-types';
import { CreateBookingQuestionDto } from './create-booking-question.dto';

export class UpdateBookingQuestionDto extends PartialType(CreateBookingQuestionDto) {}
