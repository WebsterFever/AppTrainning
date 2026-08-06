import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

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