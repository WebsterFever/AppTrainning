import { Type } from 'class-transformer';
import { IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';
import { CurriculumTopicDto } from './curriculum-topic.dto';

// All fields optional — admins can save a module with just a title, or a
// fully-fleshed-out one with objective/project/topics all filled in.
export class CurriculumModuleDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  objective?: string;

  @IsOptional()
  @IsString()
  project?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CurriculumTopicDto)
  topics?: CurriculumTopicDto[];
}
