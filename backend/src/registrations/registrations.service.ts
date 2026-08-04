import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Registration } from './registration.entity';
import { RegisterDto } from './dto/register.dto';
import { ClassesService } from '../classes/classes.service';

@Injectable()
export class RegistrationsService {
  constructor(
    @InjectRepository(Registration)
    private readonly registrationsRepo: Repository<Registration>,
    private readonly classesService: ClassesService,
  ) {}

  async register(classId: string, dto: RegisterDto) {
    const trainingClass = await this.classesService.getEntity(classId);

    const existing = await this.registrationsRepo.findOne({
      where: { trainingClass: { id: classId }, email: dto.email.toLowerCase() },
    });
    if (existing) {
      throw new ConflictException('This email is already registered for this class');
    }

    const registration = this.registrationsRepo.create({
      trainingClass,
      name: dto.name,
      email: dto.email.toLowerCase(),
    });
    await this.registrationsRepo.save(registration);

    const count = await this.registrationsRepo.count({
      where: { trainingClass: { id: classId } },
    });

    return { success: true, registrationCount: count, zoomLink: trainingClass.zoomLink };
  }
}
