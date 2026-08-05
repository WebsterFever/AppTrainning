import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class AdminReplyDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  text: string;
}
