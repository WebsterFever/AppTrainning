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
}
