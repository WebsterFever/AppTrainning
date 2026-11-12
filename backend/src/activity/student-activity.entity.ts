import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('student_activity')
@Index(['classId', 'email'])
@Index(['classId', 'sessionId'], { unique: true })
export class StudentActivity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'class_id', type: 'uuid' }) classId: string;
  @Column() email: string;
  @Column({ name: 'session_id', type: 'uuid' }) sessionId: string;
  @Column({ name: 'module_id', type: 'varchar', nullable: true }) moduleId: string | null;
  @Column({ name: 'topic_id', type: 'varchar', nullable: true }) topicId: string | null;
  @Column({ name: 'subtopic_id', type: 'varchar', nullable: true }) subtopicId: string | null;
  @Column({ name: 'active_seconds', type: 'integer', default: 0 }) activeSeconds: number;
  @Column({ name: 'last_seen_at', type: 'timestamptz' }) lastSeenAt: Date;
  @CreateDateColumn({ name: 'started_at' }) startedAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}
