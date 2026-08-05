import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('chat_messages')
export class ChatMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  email: string;

  @Column({ type: 'enum', enum: ['student', 'admin'] })
  sender: 'student' | 'admin';

  @Column({ type: 'text' })
  text: string;

  @Column({ name: 'read_by_admin', default: false })
  readByAdmin: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
