import { ForbiddenException, Injectable } from '@nestjs/common';
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
    const email = dto.email.toLowerCase();

    if (trainingClass.isPaid) {
      const allowed = (trainingClass.allowedEmails ?? []).map((e) => e.toLowerCase());
      if (!allowed.includes(email)) {
        throw new ForbiddenException(
          "This is a paid class and this email hasn't been granted access. Contact Webster Technology School.",
        );
      }
    }

    const existing = await this.registrationsRepo.findOne({
      where: { trainingClass: { id: classId }, email },
    });

    // Re-registering with the same email is idempotent — it always hands
    // back the Zoom link, so a returning visitor can retrieve it anytime.
    if (!existing) {
      const registration = this.registrationsRepo.create({
        trainingClass,
        name: dto.name,
        email,
      });
      await this.registrationsRepo.save(registration);
    }

    const count = await this.registrationsRepo.count({
      where: { trainingClass: { id: classId } },
    });

    return {
      success: true,
      registrationCount: count,
      zoomLink: trainingClass.zoomLink,
      // Full lesson content (with contentBlocks), unredacted — mirrors
      // zoomLink above. The public GET /classes/:id only ever returns the
      // marketing preview (titles/descriptions, no contentBlocks) until
      // this proves the visitor actually has access.
      curriculumModules: trainingClass.curriculumModules,
      alreadyRegistered: !!existing,
    };
  }

  // Admin only: full registrant list for a class, including email and
  // registration date (never exposed on the public endpoints).
  async listForClass(classId: string) {
    const registrations = await this.registrationsRepo.find({
      where: { trainingClass: { id: classId } },
      order: { registeredAt: 'ASC' },
    });

    return registrations.map((r) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      registeredAt: r.registeredAt,
    }));
  }
}
