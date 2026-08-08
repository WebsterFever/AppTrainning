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

  @Column({ type: 'text', name: 'video_notes', nullable: true })
  videoNotes?: string;

  // Downloadable resources attached to the main video. Nullable so an admin
  // can explicitly clear one (distinct from "not sent" on partial updates).
  @Column({ type: 'varchar', name: 'video_pdf_url', nullable: true })
  videoPdfUrl?: string | null;

  @Column({ type: 'varchar', name: 'video_pdf_name', nullable: true })
  videoPdfName?: string | null;

  @Column({ type: 'varchar', name: 'video_resource_image_url', nullable: true })
  videoResourceImageUrl?: string | null;

  @Column({ type: 'varchar', name: 'video_resource_image_name', nullable: true })
  videoResourceImageName?: string | null;

  @Column('simple-json', { name: 'extra_videos', nullable: true })
  extraVideos?: {
    id: string;
    title: string;
    url: string;
    notes?: string;
    pdfUrl?: string;
    pdfName?: string;
    imageUrl?: string;
    imageName?: string;
  }[];

  // Optional: paid classes may not have a fixed live session (e.g. self-paced content).
  @Column({ name: 'class_date', type: 'timestamptz', nullable: true })
  classDate?: Date;

  @Column({ name: 'zoom_link', nullable: true })
  zoomLink?: string;

  @Column({ name: 'is_past', default: false })
  isPast: boolean;

  @Column({ name: 'is_paid', default: false })
  isPaid: boolean;

  // Admin-managed allowlist: only these emails can register for a paid class.
  @Column('simple-json', { name: 'allowed_emails', nullable: true })
  allowedEmails?: string[];

  @OneToMany(() => Registration, (registration) => registration.trainingClass)
  registrations: Registration[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
