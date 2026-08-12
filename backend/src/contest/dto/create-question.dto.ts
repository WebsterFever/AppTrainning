import { IsNotEmpty, IsString } from 'class-validator';

// Every new question must be entered in all three site languages at once —
// it's one contest question with three language versions, not three
// separate questions.
export class CreateQuestionDto {
  @IsString()
  @IsNotEmpty()
  subjectEn: string;

  @IsString()
  @IsNotEmpty()
  questionTextEn: string;

  @IsString()
  @IsNotEmpty()
  correctAnswerEn: string;

  @IsString()
  @IsNotEmpty()
  subjectFr: string;

  @IsString()
  @IsNotEmpty()
  questionTextFr: string;

  @IsString()
  @IsNotEmpty()
  correctAnswerFr: string;

  @IsString()
  @IsNotEmpty()
  subjectHt: string;

  @IsString()
  @IsNotEmpty()
  questionTextHt: string;

  @IsString()
  @IsNotEmpty()
  correctAnswerHt: string;
}
