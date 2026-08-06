import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { RegistrationsService } from './registrations.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

// Admin only: full registrant list (name, email, registration date) for a class.
@UseGuards(JwtAuthGuard)
@Controller('admin/classes/:classId/registrations')
export class AdminRegistrationsController {
  constructor(private readonly registrationsService: RegistrationsService) {}

  @Get()
  list(@Param('classId') classId: string) {
    return this.registrationsService.listForClass(classId);
  }
}
