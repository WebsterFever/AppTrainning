import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { ClassesModule } from './classes/classes.module';
import { RegistrationsModule } from './registrations/registrations.module';
import { CommentsModule } from './comments/comments.module';
import { BookingsModule } from './bookings/bookings.module';
import { AuthModule } from './auth/auth.module';
import { ChatModule } from './chat/chat.module';
import { ContestModule } from './contest/contest.module';
import { UploadsModule } from './uploads/uploads.module';
import { PaymentsModule } from './payments/payments.module';
import { SubmissionsModule } from './submissions/submissions.module';
import { AiTeacherModule } from './classes/ai-teacher/ai-teacher.module';
import { VideoRenderModule } from './classes/video-render/video-render.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 30 }]),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        // Railway (and most managed Postgres hosts) provide a single connection
        // string. Fall back to discrete DB_* vars for local/manual setups.
        const url = config.get<string>('DATABASE_URL');
        const useSsl = config.get<string>('DB_SSL') === 'true';

        return {
          type: 'postgres',
          ...(url
            ? { url }
            : {
                host: config.get<string>('DB_HOST'),
                port: config.get<number>('DB_PORT'),
                username: config.get<string>('DB_USER'),
                password: config.get<string>('DB_PASSWORD'),
                database: config.get<string>('DB_NAME'),
              }),
          ssl: useSsl ? { rejectUnauthorized: false } : false,
          autoLoadEntities: true,
          // Use migrations in production instead of synchronize.
          synchronize: true,
        };
      },
    }),
    AuthModule,
    ClassesModule,
    RegistrationsModule,
    CommentsModule,
    BookingsModule,
    ChatModule,
    ContestModule,
    UploadsModule,
    PaymentsModule,
    SubmissionsModule,
    AiTeacherModule,
    VideoRenderModule,
  ],
})
export class AppModule {}
