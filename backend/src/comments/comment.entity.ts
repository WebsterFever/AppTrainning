import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { TrainingClass } from '../classes/class.entity';

@Entity('comments')
export class VideoComment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => TrainingClass, { onDelete: 'CASCADE' })
  trainingClass: TrainingClass;

  @Column({ name: 'video_ref' })
  videoRef: string;

  @Column()
  name: string;

  @Column()
  email: string;

  @Column({ type: 'text' })
  text: string;

  @Column({ type: 'text', name: 'reply', nullable: true })
  reply?: string;

  @Column({ name: 'replied_at', type: 'timestamptz', nullable: true })
  repliedAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
