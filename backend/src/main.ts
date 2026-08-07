import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);

  // Railway terminates TLS at its edge and forwards over plain HTTP, so
  // req.protocol needs to trust X-Forwarded-Proto to report "https" correctly
  // (otherwise uploaded-file URLs get built as http:// in production).
  app.set('trust proxy', 1);

  app.enableCors({
    origin: [
      'http://localhost:5173',
      'https://app-trainning.vercel.app',
      'https://app-trainning-6x6nyl1qb-websterfevers-projects.vercel.app',
      'https://webstertechnologyschool.com',
      'https://www.webstertechnologyschool.com',
    ],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = config.get<number>('PORT') ?? 3000;

  await app.listen(port, '0.0.0.0');

  console.log(`Webster Technology School API running on port ${port}`);
}

bootstrap();