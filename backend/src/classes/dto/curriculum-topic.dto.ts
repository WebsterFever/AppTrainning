import { Type } from 'class-transformer';
import { IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';
import { ContentBlockDto } from './content-block.dto';

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
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ContentBlockDto)
  contentBlocks?: ContentBlockDto[];
}
