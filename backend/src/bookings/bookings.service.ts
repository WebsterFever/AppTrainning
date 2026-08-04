import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClassBooking } from './booking.entity';
import { CreateBookingDto } from './dto/create-booking.dto';

@Injectable()
export class BookingsService {
  constructor(
    @InjectRepository(ClassBooking)
    private readonly bookingsRepo: Repository<ClassBooking>,
  ) {}

  create(dto: CreateBookingDto): Promise<ClassBooking> {
    const entity = this.bookingsRepo.create({
      ...dto,
      preferredSchedule: new Date(dto.preferredSchedule),
    });
    return this.bookingsRepo.save(entity);
  }

  findAll(): Promise<ClassBooking[]> {
    return this.bookingsRepo.find({ order: { createdAt: 'DESC' } });
  }

  async remove(id: string): Promise<void> {
    const result = await this.bookingsRepo.delete(id);
    if (!result.affected) throw new NotFoundException('Booking request not found');
  }
}
