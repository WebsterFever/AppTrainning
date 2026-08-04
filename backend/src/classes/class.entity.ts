import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Registration } from '../registrations/registration.entity';

@Entity('classes')
export class TrainingClass {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ name: 'image_url' })
  imageUrl: string;

  @Column({ name: 'video_url', nullable: true })
  videoUrl?: string;

  @Column({ name: 'class_date', type: 'timestamptz' })
  classDate: Date;

  @Column({ name: 'zoom_link' })
  zoomLink: string;

  @Column({ name: 'is_past', default: false })
  isPast: boolean;

  @OneToMany(() => Registration, (registration) => registration.trainingClass)
  registrations: Registration[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
