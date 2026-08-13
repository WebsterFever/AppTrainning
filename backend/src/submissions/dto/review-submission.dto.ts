import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class ReviewSubmissionDto {
  @IsIn(['approved', 'changes_requested'])
  status: 'approved' | 'changes_requested';

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  adminFeedback?: string;
}
