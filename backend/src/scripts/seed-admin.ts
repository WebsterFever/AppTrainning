import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../app.module';
import { UsersService } from '../users/users.service';

async function seed() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const config = app.get(ConfigService);
  const usersService = app.get(UsersService);

  const email = config.get<string>('ADMIN_EMAIL');
  const password = config.get<string>('ADMIN_PASSWORD');

  if (!email || !password) {
    console.error('Set ADMIN_EMAIL and ADMIN_PASSWORD in backend/.env before seeding.');
    await app.close();
    process.exit(1);
  }

  const existing = await usersService.findByEmail(email);
  if (existing) {
    console.log(`Admin ${email} already exists — nothing to do.`);
    await app.close();
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await usersService.create(email, passwordHash);
  console.log(`Created admin user ${email}.`);
  await app.close();
}

seed();
