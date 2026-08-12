import { Type } from 'class-transformer';
import { IsArray, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { CurriculumTopicDto } from './curriculum-topic.dto';

export class CurriculumModuleDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsOptional()
  @IsString()
  objective?: string;

  @IsOptional()
  @IsString()
  project?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CurriculumTopicDto)
  topics: CurriculumTopicDto[];
}
