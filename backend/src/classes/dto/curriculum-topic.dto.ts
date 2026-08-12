import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CurriculumTopicDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  @IsNotEmpty()
  title: string;
}
