import { IsEmail, IsUrl } from 'class-validator';

export class CreateCheckoutDto {
  @IsEmail()
  email: string;

  // The visitor's browser origin (e.g. https://webstertechnologyschool.com),
  // used to build the success/cancel redirect URLs — avoids relying on a
  // single hardcoded FRONTEND_URL that would break Vercel preview deploys.
  @IsUrl({ require_tld: false })
  origin: string;
}
