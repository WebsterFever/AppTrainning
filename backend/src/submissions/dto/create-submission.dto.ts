import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

// https://github.com/{username}/{repository} — optionally with a trailing
// slash. Deliberately doesn't accept random websites as the project URL.
const GITHUB_REPO_PATTERN = /^https:\/\/github\.com\/[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?\/[A-Za-z0-9._-]+\/?$/;

export class CreateSubmissionDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEmail()
  email: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim().replace(/\/+$/, '') : value))
  @Matches(GITHUB_REPO_PATTERN, {
    message: 'Enter a valid GitHub repository URL, e.g. https://github.com/username/project-name',
  })
  githubUrl: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  studentNotes?: string;
}
