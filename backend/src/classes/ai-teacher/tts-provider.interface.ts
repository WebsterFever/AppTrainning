export interface GeneratedSpeech {
  buffer: Buffer;
  mimeType: string;
  // The actual voice used (may differ from the requested one if it fell
  // back to a default).
  voiceUsed: string;
}

export interface TtsGenerateOptions {
  text: string;
  language: 'en' | 'fr' | 'ht';
  voice?: string;
  // 0.25–4, provider-clamped. 1 = normal speed.
  speed?: number;
}

// Deliberately provider-agnostic — RobotTeacher and the rest of the app
// never talk to a TTS vendor directly, only to AiTeacherService, which
// depends on this interface. Swapping providers later (or adding a second
// one selectable per block) means writing one new class here, not touching
// the controller, the content-block schema, or the frontend.
export interface TextToSpeechProvider {
  readonly name: string;
  supportsLanguage(language: 'en' | 'fr' | 'ht'): boolean;
  generateSpeech(options: TtsGenerateOptions): Promise<GeneratedSpeech>;
}
