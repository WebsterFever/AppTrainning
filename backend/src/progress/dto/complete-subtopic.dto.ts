import { IsEmail } from 'class-validator';

export class CompleteSubtopicDto {
  @IsEmail()
  email: string;
}
