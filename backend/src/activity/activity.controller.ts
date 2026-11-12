import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ActivityHeartbeatDto, ActivityService } from './activity.service';

@Controller('classes/:classId/activity')
export class ActivityController {
  constructor(private readonly service: ActivityService) {}
  @Post('heartbeat')
  heartbeat(@Param('classId') classId: string, @Body() dto: ActivityHeartbeatDto) {
    return this.service.heartbeat(classId, dto);
  }
}

@UseGuards(JwtAuthGuard)
@Controller('admin/classes/:classId/activity')
export class AdminActivityController {
  constructor(private readonly service: ActivityService) {}
  @Get()
  dashboard(@Param('classId') classId: string) {
    return this.service.dashboard(classId);
  }
}
