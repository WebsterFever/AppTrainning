import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Registration } from './registration.entity';
import { RegisterDto } from './dto/register.dto';
import { ClassesService } from '../classes/classes.service';
import { SubmissionsService } from '../submissions/submissions.service';

@Injectable()
export class RegistrationsService {
  constructor(
    @InjectRepository(Registration)
    private readonly registrationsRepo: Repository<Registration>,
    private readonly classesService: ClassesService,
    private readonly submissionsService: SubmissionsService,
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

    // Per-student sequential module unlock: module 1 is open once
    // registered; each module after that only unlocks once the previous
    // module's GitHub submission has been admin-approved. A locked module
    // still gets its marketing-curriculum preview (title/objective/topics/
    // project) — just not the actual lesson content (contentBlocks).
    const moduleAccess = await this.submissionsService.getModuleAccess(classId, email);
    const unlockedModuleIds = new Set(moduleAccess.filter((a) => a.unlocked).map((a) => a.moduleId));
    const curriculumModules = trainingClass.curriculumModules?.map((m) =>
      unlockedModuleIds.has(m.id) ? m : this.classesService.previewModule(m),
    );

    return {
      success: true,
      registrationCount: count,
      zoomLink: trainingClass.zoomLink,
      curriculumModules,
      moduleAccess,
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
