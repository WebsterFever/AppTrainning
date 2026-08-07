import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class SubmitAnswerDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  answer: string;
}
