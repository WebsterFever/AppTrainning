import { Column, Entity, PrimaryColumn } from 'typeorm';

// Singleton row (id always 1) tracking which month the contest is currently in.
@Entity('contest_settings')
export class ContestSettings {
  @PrimaryColumn({ default: 1 })
  id: number;

  @Column({ name: 'current_period_month' })
  currentPeriodMonth: string; // "YYYY-MM"
}
