import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { TrainingClass } from '../classes/class.entity';

// Per-student completion record for one Subtopic. References an id inside
// TrainingClass.curriculumModules (subtopics live in a JSON column, not
// their own table) — same convention as ModuleSubmission.moduleId: a plain
// string ref rather than a foreign key. A row's mere existence means
// "completed"; there is no partial/in-progress state persisted server-side
// (see ProgressService for why — completion only happens on an explicit
// Next/Complete click, never just from opening a subtopic).
@Entity('subtopic_progress')
@Unique(['trainingClass', 'subtopicId', 'email'])
export class SubtopicProgress {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => TrainingClass, { onDelete: 'CASCADE' })
  trainingClass: TrainingClass;

  @Column({ name: 'subtopic_id' })
  subtopicId: string;

  @Column()
  email: string;

  @Column({ type: 'timestamptz', name: 'completed_at' })
  completedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
