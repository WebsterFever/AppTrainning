import { Controller, Get, UseGuards } from '@nestjs/common';
import { ClassesService } from './classes.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

// Admin only: same data as the public class list, but never redacts the
// Zoom link — needed so the admin can see/edit it for upcoming classes too.
@UseGuards(JwtAuthGuard)
@Controller('admin/classes')
export class AdminClassesController {
  constructor(private readonly classesService: ClassesService) {}

  @Get()
  findAll() {
    return this.classesService.findAllForAdmin();
  }
}
