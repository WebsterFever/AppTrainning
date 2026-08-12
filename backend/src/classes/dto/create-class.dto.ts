import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Min,
  ValidateNested,
} from 'class-validator';
import { ExtraVideoDto } from './extra-video.dto';

export class CreateClassDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsUrl()
  imageUrl: string;

  @IsOptional()
  @IsUrl()
  videoUrl?: string | null;

  @IsOptional()
  @IsString()
  videoNotes?: string | null;

  @IsOptional()
  @IsUrl({ require_tld: false })
  videoPdfUrl?: string | null;

  @IsOptional()
  @IsString()
  videoPdfName?: string | null;

  @IsOptional()
  @IsUrl({ require_tld: false })
  videoResourceImageUrl?: string | null;

  @IsOptional()
  @IsString()
  videoResourceImageName?: string | null;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExtraVideoDto)
  extraVideos?: ExtraVideoDto[];

  @IsOptional()
  @IsDateString()
  classDate?: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  zoomLink?: string | null;

  @IsOptional()
  @IsBoolean()
  isPast?: boolean;

  @IsOptional()
  @IsBoolean()
  isPaid?: boolean;

  // Required — a class only shows to visitors browsing the site in this
  // language (see ClassesService.findAll's language filter). Without a
  // required, always-explicit value here, an admin could accidentally
  // leave it unset and have the class leak into every language section.
  @IsIn(['en', 'fr', 'ht'])
  language: 'en' | 'fr' | 'ht';

  @IsOptional()
  @IsInt()
  @Min(0)
  priceCents?: number | null;

  @IsOptional()
  @IsArray()
  @Transform(({ value }) => (Array.isArray(value) ? value.map((v: string) => v.trim()) : value))
  @IsEmail({}, { each: true })
  allowedEmails?: string[];
}
