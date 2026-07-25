import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateBrandDto } from './create-brand.dto';

// code is immutable after creation
export class UpdateBrandDto extends PartialType(OmitType(CreateBrandDto, ['code'] as const)) {}
