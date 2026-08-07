import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('contestants')
export class Contestant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  @Column()
  phone: string;

  @Column({ name: 'image_url' })
  imageUrl: string;

  @Column({ default: 0 })
  points: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
