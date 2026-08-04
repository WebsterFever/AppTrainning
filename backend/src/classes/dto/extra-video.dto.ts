import { IsNotEmpty, IsString, IsUrl } from 'class-validator';

export class ExtraVideoDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsUrl()
  url: string;
}
