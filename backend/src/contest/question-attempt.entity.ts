import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';

// One attempt per contestant per question — prevents repeated guessing.
@Entity('question_attempts')
@Unique(['questionId', 'contestantId'])
export class QuestionAttempt {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'question_id' })
  questionId: string;

  @Column({ name: 'contestant_id' })
  contestantId: string;

  @Column({ name: 'submitted_answer' })
  submittedAnswer: string;

  @Column({ name: 'is_correct' })
  isCorrect: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
