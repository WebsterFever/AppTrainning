import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IsEmail, IsInt, IsOptional, IsString, IsUUID, Max, Min, validateOrReject } from 'class-validator';
import { StudentActivity } from './student-activity.entity';
import { Registration } from '../registrations/registration.entity';
import { TrainingClass } from '../classes/class.entity';

export class ActivityHeartbeatDto {
  @IsEmail() email: string;
  @IsUUID() sessionId: string;
  @IsOptional() @IsUUID() moduleId?: string;
  @IsOptional() @IsUUID() topicId?: string;
  @IsOptional() @IsUUID() subtopicId?: string;
  @IsInt() @Min(0) @Max(30) activeSeconds: number;
}

@Injectable()
export class ActivityService {
  constructor(
    @InjectRepository(StudentActivity) private readonly activities: Repository<StudentActivity>,
    @InjectRepository(Registration) private readonly registrations: Repository<Registration>,
    @InjectRepository(TrainingClass) private readonly classes: Repository<TrainingClass>,
  ) {}

  async heartbeat(classId: string, dto: ActivityHeartbeatDto) {
    await validateOrReject(Object.assign(new ActivityHeartbeatDto(), dto)).catch(() => {
      throw new BadRequestException('Invalid activity payload');
    });
    const email = dto.email.trim().toLowerCase();
    const registered = await this.registrations.exist({ where: { trainingClass: { id: classId }, email } });
    if (!registered) throw new ForbiddenException('Registration required');
    const trainingClass = await this.classes.findOne({ where: { id: classId } });
    if (!trainingClass) throw new BadRequestException('Unknown class');
    const mod = (trainingClass.curriculumModules ?? []).find((m) => m.id === dto.moduleId);
    if (dto.moduleId && !mod) throw new BadRequestException('Unknown module');
    const topic = (mod?.topics ?? []).find((t) => t.id === dto.topicId);
    if (dto.topicId && !topic) throw new BadRequestException('Unknown topic');
    if (dto.subtopicId && !(topic?.subtopics ?? []).some((s) => s.id === dto.subtopicId)) {
      throw new BadRequestException('Unknown subtopic');
    }

    const now = new Date();
    let session = await this.activities.findOne({ where: { classId, sessionId: dto.sessionId } });
    if (session && session.email !== email) throw new ForbiddenException('Session belongs to another student');
    if (!session) {
      session = this.activities.create({
        classId, sessionId: dto.sessionId, email, activeSeconds: 0,
        moduleId: null, topicId: null, subtopicId: null, lastSeenAt: now,
      });
    } else {
      const elapsed = Math.max(0, (now.getTime() - new Date(session.lastSeenAt).getTime()) / 1000);
      // Never count time that exceeds elapsed time, and ignore stale sessions.
      dto.activeSeconds = elapsed <= 90 ? Math.min(dto.activeSeconds, Math.floor(elapsed)) : 0;
    }
    session.activeSeconds += dto.activeSeconds;
    session.lastSeenAt = now;
    session.moduleId = dto.moduleId ?? null;
    session.topicId = dto.topicId ?? null;
    session.subtopicId = dto.subtopicId ?? null;
    await this.activities.save(session);
    return { ok: true };
  }

  async dashboard(classId: string) {
    const registrations = await this.registrations.find({ where: { trainingClass: { id: classId } } });
    const sessions = await this.activities.find({ where: { classId } });
    const now = Date.now();
    return registrations.map((student) => {
      const records = sessions.filter((session) => session.email === student.email.toLowerCase());
      const latest = records.sort((a, b) => +new Date(b.lastSeenAt) - +new Date(a.lastSeenAt))[0];
      const online = records.some((s) => now - +new Date(s.lastSeenAt) < 90000);
      const totalSeconds = records.reduce((sum, s) => sum + s.activeSeconds, 0);
      return {
        name: student.name, email: student.email, registeredAt: student.registeredAt,
        online, lastSeenAt: latest?.lastSeenAt ?? null,
        moduleId: latest?.moduleId ?? null, topicId: latest?.topicId ?? null,
        subtopicId: latest?.subtopicId ?? null, activeSeconds: totalSeconds,
      };
    });
  }
}
