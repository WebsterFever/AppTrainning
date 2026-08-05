import { IsNotEmpty, IsString } from 'class-validator';

export class ReplyCommentDto {
  @IsString()
  @IsNotEmpty()
  reply: string;
}
