import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ModuleSubmission } from './module-submission.entity';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { ReviewSubmissionDto } from './dto/review-submission.dto';
import { ClassesService } from '../classes/classes.service';
import { Registration } from '../registrations/registration.entity';
import { TrainingClass } from '../classes/class.entity';

export interface ModuleAccessEntry {
  moduleId: string;
  unlocked: boolean;
  submission?: {
    id: string;
    githubUrl: string;
    studentNotes?: string;
    status: ModuleSubmission['status'];
    adminFeedback?: string;
    submittedAt: Date;
    reviewedAt?: Date;
  };
}

@Injectable()
export class SubmissionsService {
  constructor(
    @InjectRepository(ModuleSubmission)
    private readonly submissionsRepo: Repository<ModuleSubmission>,
    @InjectRepository(Registration)
    private readonly registrationsRepo: Repository<Registration>,
    private readonly classesService: ClassesService,
  ) {}

  private toEntry(sub?: ModuleSubmission): ModuleAccessEntry['submission'] {
    if (!sub) return undefined;
    return {
      id: sub.id,
      githubUrl: sub.githubUrl,
      studentNotes: sub.studentNotes,
      status: sub.status,
      adminFeedback: sub.adminFeedback,
      submittedAt: sub.submittedAt,
      reviewedAt: sub.reviewedAt,
    };
  }

  // Per-student, per-module unlock state, in module order. The first module
  // is always unlocked once registered; each subsequent module unlocks only
  // once the previous module's submission has been approved by an admin —
  // submitting alone never unlocks anything.
  async getModuleAccess(classId: string, email: string): Promise<ModuleAccessEntry[]> {
    const trainingClass = await this.classesService.getEntity(classId);
    const modules = trainingClass.curriculumModules ?? [];
    if (modules.length === 0) return [];

    const normalizedEmail = email.toLowerCase();
    const submissions = await this.submissionsRepo.find({
      where: { trainingClass: { id: classId }, email: normalizedEmail },
    });
    const byModule = new Map(submissions.map((s) => [s.moduleId, s]));

    let previousApproved = true;
    return modules.map((m) => {
      const sub = byModule.get(m.id);
      const unlocked = previousApproved;
      previousApproved = unlocked && sub?.status === 'approved';
      return { moduleId: m.id, unlocked, submission: this.toEntry(sub) };
    });
  }

  async submit(classId: string, moduleId: string, dto: CreateSubmissionDto) {
    const trainingClass = await this.classesService.getEntity(classId);
    const moduleExists = trainingClass.curriculumModules?.some((m) => m.id === moduleId);
    if (!moduleExists) throw new NotFoundException('Module not found');

    const email = dto.email.toLowerCase();
    const isRegistered = await this.registrationsRepo.exist({
      where: { trainingClass: { id: classId }, email },
    });
    if (!isRegistered) {
      throw new ForbiddenException('You must register for this class before submitting a project.');
    }

    // Server-side enforcement of the sequential unlock — a student can't
    // submit for a module they haven't unlocked, even by calling the API
    // directly.
    const access = await this.getModuleAccess(classId, email);
    const entry = access.find((a) => a.moduleId === moduleId);
    if (!entry?.unlocked) {
      throw new ForbiddenException('Complete and get approval on the previous module first.');
    }

    let submission = await this.submissionsRepo.findOne({
      where: { trainingClass: { id: classId }, moduleId, email },
    });

    if (submission) {
      // Resubmission — resets to pending for another review pass. Prior
      // admin feedback is left in place until the admin reviews again.
      submission.name = dto.name;
      submission.githubUrl = dto.githubUrl;
      submission.studentNotes = dto.studentNotes;
      submission.status = 'pending';
      submission.submittedAt = new Date();
    } else {
      submission = this.submissionsRepo.create({
        trainingClass,
        moduleId,
        name: dto.name,
        email,
        githubUrl: dto.githubUrl,
        studentNotes: dto.studentNotes,
        status: 'pending',
        submittedAt: new Date(),
      });
    }

    const saved = await this.submissionsRepo.save(submission);
    return this.toEntry(saved);
  }

  // Admin only: every submission across every class, newest first.
  async listAll() {
    const submissions = await this.submissionsRepo.find({
      relations: ['trainingClass'],
      order: { submittedAt: 'DESC' },
    });

    return submissions.map((s) => ({
      id: s.id,
      classId: s.trainingClass.id,
      classTitle: s.trainingClass.title,
      moduleId: s.moduleId,
      moduleTitle: this.moduleTitle(s.trainingClass, s.moduleId),
      name: s.name,
      email: s.email,
      githubUrl: s.githubUrl,
      studentNotes: s.studentNotes,
      status: s.status,
      adminFeedback: s.adminFeedback,
      submittedAt: s.submittedAt,
      reviewedAt: s.reviewedAt,
      approvedAt: s.approvedAt,
    }));
  }

  // Admin only: approve or request changes. Only approval unlocks the next
  // module for that student (see getModuleAccess above).
  async review(id: string, dto: ReviewSubmissionDto) {
    const submission = await this.submissionsRepo.findOne({ where: { id } });
    if (!submission) throw new NotFoundException('Submission not found');

    submission.status = dto.status;
    submission.adminFeedback = dto.adminFeedback;
    submission.reviewedAt = new Date();
    if (dto.status === 'approved') submission.approvedAt = new Date();

    const saved = await this.submissionsRepo.save(submission);
    return this.toEntry(saved);
  }

  private moduleTitle(trainingClass: TrainingClass, moduleId: string): string {
    return trainingClass.curriculumModules?.find((m) => m.id === moduleId)?.title ?? 'Module';
  }
}
