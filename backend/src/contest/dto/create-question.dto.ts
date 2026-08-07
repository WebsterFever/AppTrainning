import { IsNotEmpty, IsString } from 'class-validator';

export class CreateQuestionDto {
  @IsString()
  @IsNotEmpty()
  subject: string;

  @IsString()
  @IsNotEmpty()
  questionText: string;

  @IsString()
  @IsNotEmpty()
  correctAnswer: string;
}
