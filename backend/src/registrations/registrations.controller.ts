import { Body, Controller, Param, Post } from '@nestjs/common';
import { RegistrationsService } from './registrations.service';
import { RegisterDto } from './dto/register.dto';

@Controller('classes/:classId/register')
export class RegistrationsController {
  constructor(private readonly registrationsService: RegistrationsService) {}

  @Post()
  register(@Param('classId') classId: string, @Body() dto: RegisterDto) {
    return this.registrationsService.register(classId, dto);
  }
}
