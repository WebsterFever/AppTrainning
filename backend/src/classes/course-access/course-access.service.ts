import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Registration } from '../../registrations/registration.entity';
import { SubmissionsService } from '../../submissions/submissions.service';

// Shared by every protected lesson-asset stream (standalone AI Teacher
// audio, Guided Video cue audio, and generated coding video): the
// requesting email must be registered for this class AND the module
// containing the asset must be unlocked for that email — the same check
// RegistrationsService.register uses to decide whether to include
// contentBlocks at all. Extracted out of AiTeacherService so a third
// consumer (VideoRenderService) reuses this exact logic instead of a third
// copy that could quietly drift from the other two.
@Injectable()
export class CourseAccessService {
  constructor(
    @InjectRepository(Registration)
    private readonly registrationsRepo: Repository<Registration>,
    private readonly submissionsService: SubmissionsService,
  ) {}

  async assertStudentAccess(classId: string, moduleId: string, email: string): Promise<void> {
    const normalizedEmail = email.toLowerCase();
    const isRegistered = await this.registrationsRepo.exist({
      where: { trainingClass: { id: classId }, email: normalizedEmail },
    });
    if (!isRegistered) {
      throw new ForbiddenException('You must register for this class before accessing this lesson.');
    }

    const access = await this.submissionsService.getModuleAccess(classId, normalizedEmail);
    const moduleEntry = access.find((a) => a.moduleId === moduleId);
    // No entry means this class doesn't use module-gated progression at all
    // (e.g. no submission requirement configured) — default to allowed,
    // matching how the frontend treats a missing moduleAccess entry.
    if (moduleEntry && !moduleEntry.unlocked) {
      throw new ForbiddenException('This module is locked until the previous one is approved.');
    }
  }
}
