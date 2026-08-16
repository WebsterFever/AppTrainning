import { Type } from 'class-transformer';
import { IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';
import { ContentBlockDto } from './content-block.dto';

// A Subtopic is nested one level inside a Topic and behaves exactly like a
// Topic does today: an optional title/description plus its own ordered
// lesson content blocks. Kept intentionally shallow (no nested subtopics)
// — Module -> Topic -> Subtopic -> Content Block is the requested depth,
// not an arbitrary tree.
export class SubtopicDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ContentBlockDto)
  contentBlocks?: ContentBlockDto[];
}
