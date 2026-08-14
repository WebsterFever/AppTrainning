import { IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

// Cost/abuse protection — also comfortably under OpenAI's ~4096-character
// single-request input limit for tts-1.
export const MAX_SCRIPT_LENGTH = 4000;

// Generation always operates on the exact values sent here (the admin's
// current draft), and persists them onto the block together with the audio
// — so "Generate Voice" can't leave the saved script and the generated
// audio out of sync with each other.
export class GenerateAudioDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(MAX_SCRIPT_LENGTH)
  script: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  label?: string;

  @IsIn(['en', 'fr', 'ht'])
  language: 'en' | 'fr' | 'ht';

  @IsOptional()
  @IsString()
  voice?: string;

  @IsOptional()
  @IsNumber()
  @Min(0.5)
  @Max(2)
  rate?: number;
}
