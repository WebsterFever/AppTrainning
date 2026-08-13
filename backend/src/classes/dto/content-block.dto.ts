import { IsIn, IsOptional, IsString } from 'class-validator';

export const CONTENT_BLOCK_TYPES = [
  'text',
  'video',
  'heading',
  'image',
  'divider',
  'code',
  'resource',
  'exercise',
] as const;

export type ContentBlockType = (typeof CONTENT_BLOCK_TYPES)[number];

// All fields optional — admins can save a lesson mid-draft (e.g. a block
// with a type chosen but content not yet filled in).
export class ContentBlockDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsOptional()
  @IsIn(CONTENT_BLOCK_TYPES)
  type?: ContentBlockType;

  // Body text (text/heading/code/exercise), or the URL (video/image/resource).
  @IsOptional()
  @IsString()
  content?: string;

  // Secondary label: video/resource title, image alt text, code language.
  @IsOptional()
  @IsString()
  label?: string;
}
