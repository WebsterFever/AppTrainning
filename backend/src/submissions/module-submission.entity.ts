import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { TrainingClass } from '../classes/class.entity';

export type SubmissionStatus = 'pending' | 'approved' | 'changes_requested';

@Entity('module_submissions')
export class ModuleSubmission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => TrainingClass, { onDelete: 'CASCADE' })
  trainingClass: TrainingClass;

  // References an id inside TrainingClass.curriculumModules — modules live
  // in a JSON column, not their own table, so this is a plain string ref
  // rather than a foreign key (same convention as VideoComment.videoRef).
  @Column({ name: 'module_id' })
  moduleId: string;

  @Column()
  name: string;

  @Column()
  email: string;

  @Column({ name: 'github_url' })
  githubUrl: string;

  @Column({ type: 'text', name: 'student_notes', nullable: true })
  studentNotes?: string;

  @Column({ default: 'pending' })
  status: SubmissionStatus;

  @Column({ type: 'text', name: 'admin_feedback', nullable: true })
  adminFeedback?: string;

  // Distinct from createdAt below: this is reset to "now" on every
  // resubmission, whereas createdAt marks when the row was first inserted.
  @Column({ type: 'timestamptz', name: 'submitted_at' })
  submittedAt: Date;

  @Column({ type: 'timestamptz', name: 'reviewed_at', nullable: true })
  reviewedAt?: Date;

  @Column({ type: 'timestamptz', name: 'approved_at', nullable: true })
  approvedAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
