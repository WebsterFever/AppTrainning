import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { ClassesService } from '../classes/classes.service';
import { TEACHER_INITIAL_PERMISSIONS } from './live-classroom-access';

/**
 * Issues a LiveKit token only to a caller authenticated by the admin JWT guard.
 * The LiveKit API secret never leaves the backend.
 */
@Injectable()
export class LiveClassroomService {
  constructor(
    private readonly config: ConfigService,
    private readonly jwt: JwtService,
    private readonly classes: ClassesService,
  ) {}

  async configurationStatus(classId: string) {
    await this.classes.getEntity(classId);
    const serverUrl = this.config.get<string>('LIVEKIT_URL');
    const apiKey = this.config.get<string>('LIVEKIT_API_KEY');
    const apiSecret = this.config.get<string>('LIVEKIT_API_SECRET');
    return {
      configured: Boolean(serverUrl && /^wss:\/\//.test(serverUrl) && apiKey && apiSecret),
      roomName: `webster-class-${classId}`,
    };
  }

  async teacherConnection(classId: string, adminId: string) {
    // Check that the requested class actually exists.
    await this.classes.getEntity(classId);
    const serverUrl = this.config.get<string>('LIVEKIT_URL');
    const apiKey = this.config.get<string>('LIVEKIT_API_KEY');
    const apiSecret = this.config.get<string>('LIVEKIT_API_SECRET');
    if (!serverUrl || !apiKey || !apiSecret || !/^wss:\/\//.test(serverUrl)) {
      throw new ServiceUnavailableException('Live classroom is not configured yet.');
    }
    // JWT payload matches LiveKit's VideoGrant protocol; role and publishing
    // permissions are signed by the server, never provided by the browser.
    const token = await this.jwt.signAsync(
      {
        name: 'Webster Technology School Teacher',
        video: {
          roomJoin: true,
          room: `webster-class-${classId}`,
          ...TEACHER_INITIAL_PERMISSIONS,
          roomAdmin: true,
        },
      },
      {
        secret: apiSecret,
        algorithm: 'HS256',
        issuer: apiKey,
        subject: `teacher-${adminId}`,
        expiresIn: '30m',
      },
    );
    return { serverUrl, token, roomName: `webster-class-${classId}` };
  }
}
