import { IsEmail, IsNotEmpty, IsString, IsUrl } from 'class-validator';

export class SubscribeContestantDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsUrl({ require_tld: false })
  imageUrl: string;
}
