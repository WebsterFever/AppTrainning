import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
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
  videoUrl?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExtraVideoDto)
  extraVideos?: ExtraVideoDto[];

  @IsDateString()
  classDate: string;

  @IsUrl({ require_tld: false })
  zoomLink: string;

  @IsOptional()
  @IsBoolean()
  isPast?: boolean;
}
