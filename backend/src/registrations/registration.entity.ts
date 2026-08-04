import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { TrainingClass } from '../classes/class.entity';

@Entity('registrations')
@Unique(['trainingClass', 'email'])
export class Registration {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => TrainingClass, (trainingClass) => trainingClass.registrations, {
    onDelete: 'CASCADE',
  })
  trainingClass: TrainingClass;

  @Column()
  name: string;

  @Column()
  email: string;

  @CreateDateColumn({ name: 'registered_at' })
  registeredAt: Date;
}
