import { IsDateString, IsEmail, IsNotEmpty, IsString, IsUrl } from 'class-validator';

export class CreateBookingDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsDateString()
  preferredSchedule: string;

  @IsUrl({ require_tld: false })
  zoomLink: string;
}
