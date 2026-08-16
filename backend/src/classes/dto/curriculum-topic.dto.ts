import { Type } from 'class-transformer';
import { IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';
import { ContentBlockDto } from './content-block.dto';
import { SubtopicDto } from './subtopic.dto';

// All fields optional — a topic can exist as a bare title while the admin
// fills in lesson content later.
export class CurriculumTopicDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  // The actual lesson: an ordered sequence of blocks (text, video, image,
  // etc.) — array order is display order. Private content, gated the same
  // way zoomLink is (see ClassesService.toPublicShape).
  //
  // A topic may hold content directly here (the original, still fully
  // supported shape — every existing course keeps working exactly as
  // before) and/or organize it into `subtopics` below. Both can coexist:
  // this isn't a migration, just an additional optional nesting level.
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ContentBlockDto)
  contentBlocks?: ContentBlockDto[];

  // Optional one-level-deeper grouping (Module -> Topic -> Subtopic ->
  // Content Block). Each subtopic behaves exactly like a topic: its own
  // title/description and its own ordered content blocks.
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SubtopicDto)
  subtopics?: SubtopicDto[];
}
