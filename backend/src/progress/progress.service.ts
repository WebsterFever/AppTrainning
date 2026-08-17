import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SubtopicProgress } from './subtopic-progress.entity';
import { ClassesService } from '../classes/classes.service';
import { CourseAccessService } from '../classes/course-access/course-access.service';
import { TrainingClass } from '../classes/class.entity';

@Injectable()
export class ProgressService {
  constructor(
    @InjectRepository(SubtopicProgress)
    private readonly progressRepo: Repository<SubtopicProgress>,
    private readonly classesService: ClassesService,
    private readonly courseAccessService: CourseAccessService,
  ) {}

  // Every subtopic id this student has completed for this class, regardless
  // of which module/topic it lives under — the frontend already has the
  // full curriculum tree and derives Topic/Module percentages from this
  // flat set itself (completed / total subtopics in that Topic/Module), so
  // the backend only needs to hand back "which ids are done."
  async getCompletedSubtopicIds(classId: string, email: string): Promise<string[]> {
    const rows = await this.progressRepo.find({
      where: { trainingClass: { id: classId }, email: email.toLowerCase() },
    });
    return rows.map((r) => r.subtopicId);
  }

  // Finds which module a subtopic belongs to — needed to reuse the exact
  // same "is this module unlocked for this student" check every other
  // protected lesson asset already uses (CourseAccessService), so marking
  // progress can't be used to prove a locked module's structure or bypass
  // its gating.
  private findOwningModuleId(trainingClass: TrainingClass, subtopicId: string): string | null {
    for (const mod of trainingClass.curriculumModules ?? []) {
      for (const topic of mod.topics ?? []) {
        for (const subtopic of topic.subtopics ?? []) {
          if (subtopic.id === subtopicId) return mod.id;
        }
      }
    }
    return null;
  }

  // Marks one subtopic complete for this student. Idempotent — completing
  // an already-completed subtopic again is a no-op, not an error (the
  // frontend calls this every time "Next" is clicked, including on a
  // subtopic reached via Previous/re-navigation).
  async markComplete(classId: string, subtopicId: string, email: string): Promise<string[]> {
    const trainingClass = await this.classesService.getEntity(classId);
    const moduleId = this.findOwningModuleId(trainingClass, subtopicId);
    if (!moduleId) throw new NotFoundException('Subtopic not found');

    const normalizedEmail = email.toLowerCase();
    // Registered + module-unlocked, same as every other protected lesson
    // asset (audio, video, generated coding video).
    await this.courseAccessService.assertStudentAccess(classId, moduleId, normalizedEmail);

    const existing = await this.progressRepo.findOne({
      where: { trainingClass: { id: classId }, subtopicId, email: normalizedEmail },
    });
    if (!existing) {
      await this.progressRepo.save(
        this.progressRepo.create({
          trainingClass,
          subtopicId,
          email: normalizedEmail,
          completedAt: new Date(),
        }),
      );
    }

    return this.getCompletedSubtopicIds(classId, normalizedEmail);
  }
}
