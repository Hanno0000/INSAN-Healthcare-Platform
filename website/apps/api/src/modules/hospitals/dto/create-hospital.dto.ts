import {
  IsString,
  IsOptional,
  Matches,
  ValidateNested,
  IsEnum,
  IsArray,
  IsObject,
  ArrayMaxSize,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { BilingualDto } from '../../../common/dto/bilingual.dto';
import { ContentStatus } from '@prisma/client';

/** تعبير منتظم يقبل روابط تضمين خرائط جوجل الرسمية فقط */
const MAPS_EMBED = /^https:\/\/(www\.)?google\.com\/maps\/embed/;

export class HospitalDepartmentDto {
  @IsString()
  @Matches(/^[a-z0-9-]+$/, { message: 'slug must be lowercase letters, numbers, and hyphens only' })
  slug: string;

  @ValidateNested()
  @Type(() => BilingualDto)
  name: BilingualDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => BilingualDto)
  shortDescription?: BilingualDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => BilingualDto)
  description?: BilingualDto;

  @IsOptional()
  @IsString()
  image?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  doctorIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  // These hold arrays of bilingual objects — { ar, en }.
  //
  // They are deliberately typed `any`, not `any[]`. The global ValidationPipe
  // runs with `enableImplicitConversion`, which reads the reflected design
  // type: an `any[]` property reflects as `Array`, so class-transformer
  // coerces every *element* to an array too and each { ar, en } arrives as [].
  // Typing them `any` reflects as `Object` and leaves the payload untouched —
  // this is why the equivalent fields on CreateMedicalCenterDto never broke.
  @IsOptional()
  @IsArray()
  equipment?: any;

  @IsOptional()
  @IsArray()
  services?: any;

  @IsOptional()
  @IsArray()
  features?: any;

  @IsOptional()
  @IsString()
  videoUrl?: string;

  @IsOptional()
  @IsObject()
  customFields?: Record<string, any>;
}

export class CreateHospitalDto {
  @IsString()
  @Matches(/^[a-z0-9-]+$/, { message: 'slug must be lowercase letters, numbers, and hyphens only' })
  slug: string;

  @ValidateNested()
  @Type(() => BilingualDto)
  name: BilingualDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => BilingualDto)
  shortDescription?: BilingualDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => BilingualDto)
  description?: BilingualDto;

  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsOptional()
  @IsString()
  heroImage?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  heroImages?: string[];

  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'brandColor must be a valid hex color' })
  brandColor?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  @Matches(MAPS_EMBED, {
    message: 'googleMapsUrl must be an official Google Maps embed URL (https://www.google.com/maps/embed...)',
  })
  googleMapsUrl?: string;

  @IsOptional()
  @IsEnum(ContentStatus)
  status?: ContentStatus;

  @IsOptional()
  @ValidateNested()
  @Type(() => BilingualDto)
  metaTitle?: BilingualDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => BilingualDto)
  metaDescription?: BilingualDto;

  @IsOptional()
  @IsObject()
  customFields?: Record<string, any>;

  // ─── حقول صفحة المستشفى الجديدة (6) ───

  @IsOptional()
  @ValidateNested()
  @Type(() => BilingualDto)
  heroTagline?: BilingualDto;

  // `any`, not `any[]` — see the note on equipment/services/features below.
  // An `any[]` here would flatten every { value, suffix, label } stat to [].
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(3)
  heroStats?: any;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => HospitalDepartmentDto)
  departments?: HospitalDepartmentDto[];

  // `any`, not `any[]` — each { name, mapsUrl } would otherwise arrive as [].
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  locations?: any;

  @IsOptional()
  @IsObject()
  contactInfo?: Record<string, any>;

  // `any`, not `any[]` — each { icon, title, desc } would otherwise arrive as [].
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(4)
  journeySteps?: any;
}
