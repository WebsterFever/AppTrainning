import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('daily_questions')
export class DailyQuestion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  subject: string;

  @Column({ type: 'text', name: 'question_text' })
  questionText: string;

  @Column({ name: 'correct_answer' })
  correctAnswer: string;

  // Set once the first correct answer lands — locks the question.
  @Column({ name: 'winner_contestant_id', nullable: true })
  winnerContestantId?: string;

  @Column({ name: 'winner_name', nullable: true })
  winnerName?: string;

  @Column({ name: 'answered_at', type: 'timestamptz', nullable: true })
  answeredAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
