import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

// Snapshot of the leaderboard's top scorer, taken when a month rolls over.
@Entity('monthly_winners')
export class MonthlyWinner {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'period_month' })
  periodMonth: string; // "YYYY-MM"

  @Column({ name: 'contestant_name' })
  contestantName: string;

  @Column({ name: 'contestant_image_url' })
  contestantImageUrl: string;

  @Column()
  points: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
