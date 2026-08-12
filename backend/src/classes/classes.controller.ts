import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ClassesService } from './classes.service';
import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('classes')
export class ClassesController {
  constructor(private readonly classesService: ClassesService) {}

  // Public: list classes, optionally filtered to upcoming/past and/or to a
  // single audience language (classes with no language — legacy rows only,
  // since new ones require it — are excluded unless language is omitted).
  @Get()
  findAll(
    @Query('status') status?: 'upcoming' | 'past',
    @Query('language') language?: 'en' | 'fr' | 'ht',
  ) {
    return this.classesService.findAll(status, language);
  }

  // Public: single class detail (includes live registration count).
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.classesService.findOne(id);
  }

  // Admin only: create a new class.
  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() dto: CreateClassDto) {
    return this.classesService.create(dto);
  }

  // Admin only: edit any field, including marking a class past.
  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateClassDto) {
    return this.classesService.update(id, dto);
  }

  // Admin only: quick toggle for the "mark as past" action.
  @UseGuards(JwtAuthGuard)
  @Patch(':id/mark-past')
  markPast(@Param('id') id: string, @Body('isPast') isPast: boolean) {
    return this.classesService.markPast(id, isPast ?? true);
  }

  // Admin only: delete a class entirely.
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.classesService.remove(id);
  }
}
