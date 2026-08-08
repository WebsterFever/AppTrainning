import { IsNotEmpty, IsOptional, IsString, IsUrl } from 'class-validator';

export class ExtraVideoDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsUrl()
  url: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  pdfUrl?: string | null;

  @IsOptional()
  @IsString()
  pdfName?: string | null;

  @IsOptional()
  @IsUrl({ require_tld: false })
  imageUrl?: string | null;

  @IsOptional()
  @IsString()
  imageName?: string | null;
}
