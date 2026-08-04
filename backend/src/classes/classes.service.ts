import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TrainingClass } from './class.entity';
import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';

export interface ClassWithCount {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  videoUrl?: string;
  classDate: Date;
  zoomLink: string;
  isPast: boolean;
  registrationCount: number;
  registeredNames?: string[];
}

@Injectable()
export class ClassesService {
  constructor(
    @InjectRepository(TrainingClass)
    private readonly classesRepo: Repository<TrainingClass>,
  ) {}

  async findAll(status?: 'upcoming' | 'past'): Promise<ClassWithCount[]> {
    const qb = this.classesRepo
      .createQueryBuilder('class')
      .loadRelationCountAndMap('class.registrationCount', 'class.registrations')
      .orderBy('class.classDate', status === 'past' ? 'DESC' : 'ASC');

    if (status === 'upcoming') qb.where('class.isPast = false');
    if (status === 'past') qb.where('class.isPast = true');

    const rows = await qb.getMany();
    return rows.map((row) => this.toPublicShape(row));
  }

  async findOne(id: string): Promise<ClassWithCount> {
    const row = await this.classesRepo
      .createQueryBuilder('class')
      .leftJoin('class.registrations', 'registration')
      .addSelect(['registration.id', 'registration.name'])
      .orderBy('registration.registeredAt', 'ASC')
      .where('class.id = :id', { id })
      .getOne();

    if (!row) throw new NotFoundException('Class not found');
    return this.toPublicShape(row, true);
  }

  async create(dto: CreateClassDto): Promise<TrainingClass> {
    const entity = this.classesRepo.create({
      ...dto,
      classDate: new Date(dto.classDate),
    });
    return this.classesRepo.save(entity);
  }

  async update(id: string, dto: UpdateClassDto): Promise<TrainingClass> {
    const existing = await this.classesRepo.findOne({ where: { id } });
    if (!existing) throw new NotFoundException('Class not found');

    Object.assign(existing, {
      ...dto,
      classDate: dto.classDate ? new Date(dto.classDate) : existing.classDate,
    });
    return this.classesRepo.save(existing);
  }

  async markPast(id: string, isPast: boolean): Promise<TrainingClass> {
    return this.update(id, { isPast } as UpdateClassDto);
  }

  async remove(id: string): Promise<void> {
    const result = await this.classesRepo.delete(id);
    if (!result.affected) throw new NotFoundException('Class not found');
  }

  async getEntity(id: string): Promise<TrainingClass> {
    const row = await this.classesRepo.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Class not found');
    return row;
  }

  private toPublicShape(
    row: TrainingClass & { registrationCount?: number },
    includeNames = false,
  ): ClassWithCount {
    const names = includeNames ? (row.registrations ?? []).map((r) => r.name) : undefined;
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      imageUrl: row.imageUrl,
      videoUrl: row.videoUrl,
      classDate: row.classDate,
      zoomLink: row.isPast ? row.zoomLink : undefined, // hide link publicly pre-registration
      isPast: row.isPast,
      registrationCount: includeNames ? (names?.length ?? 0) : (row.registrationCount ?? 0),
      ...(names ? { registeredNames: names } : {}),
    } as ClassWithCount;
  }
}
