import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GeneratedSpeech, TextToSpeechProvider, TtsGenerateOptions } from './tts-provider.interface';

// Stable, documented OpenAI TTS voice names (shared across tts-1, tts-1-hd,
// and gpt-4o-mini-tts).
export const OPENAI_VOICES = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'] as const;
const DEFAULT_VOICE = 'alloy';

// gpt-4o-mini-tts (unlike tts-1/tts-1-hd) accepts a natural-language
// "instructions" field that steers delivery style without altering the
// words spoken. Fixed here rather than admin-editable per block — every
// lesson should sound like the same teacher, and nobody should have to
// retype this to generate a voice.
const TEACHER_VOICE_INSTRUCTIONS = [
  'Speak like a warm, confident, encouraging technology teacher.',
  'Use a natural conversational tone, not an announcer or robotic voice.',
  'Speak clearly for beginner students.',
  'Use natural pauses between ideas.',
  'Sound enthusiastic when introducing a new concept, but remain professional.',
  'Avoid exaggerated emotion.',
  'Do not change, summarize, add to, or rewrite the lesson content. Speak the supplied lesson exactly as written.',
].join(' ');

@Injectable()
export class OpenAiTtsProvider implements TextToSpeechProvider {
  readonly name = 'openai';

  constructor(private readonly config: ConfigService) {}

  // OpenAI's TTS models are one multilingual model reading whatever text
  // it's given — there's no separate "French model" to check for — but no
  // major commercial TTS provider currently ships genuine Haitian Creole
  // coverage, so we don't claim support we can't back up. Unsupported
  // languages fall back to the browser voice (see AiTeacherService).
  supportsLanguage(language: 'en' | 'fr' | 'ht'): boolean {
    return language === 'en' || language === 'fr';
  }

  async generateSpeech({ text, voice, speed }: TtsGenerateOptions): Promise<GeneratedSpeech> {
    const apiKey = this.config.get<string>('OPENAI_API_KEY');
    if (!apiKey) {
      throw new Error(
        'OPENAI_API_KEY is not configured on the server — add it in Railway to enable neural voice generation.',
      );
    }

    const resolvedVoice = voice && (OPENAI_VOICES as readonly string[]).includes(voice) ? voice : DEFAULT_VOICE;
    const resolvedSpeed = Math.min(4, Math.max(0.25, speed ?? 1));

    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini-tts',
        voice: resolvedVoice,
        input: text,
        instructions: TEACHER_VOICE_INSTRUCTIONS,
        speed: resolvedSpeed,
        response_format: 'mp3',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`OpenAI text-to-speech request failed (${response.status}): ${errorText.slice(0, 300)}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return {
      buffer: Buffer.from(arrayBuffer),
      mimeType: 'audio/mpeg',
      voiceUsed: resolvedVoice,
    };
  }
}
