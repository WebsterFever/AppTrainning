import { IsBoolean, IsDateString, IsNotEmpty, IsOptional, IsString, IsUrl } from 'class-validator';

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

  @IsDateString()
  classDate: string;

  @IsUrl({ require_tld: false })
  zoomLink: string;

  @IsOptional()
  @IsBoolean()
  isPast?: boolean;
}
