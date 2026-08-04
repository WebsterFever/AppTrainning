import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('class_bookings')
export class ClassBooking {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  email: string;

  @Column()
  phone: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ name: 'preferred_schedule', type: 'timestamptz' })
  preferredSchedule: Date;

  @Column({ name: 'zoom_link' })
  zoomLink: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
