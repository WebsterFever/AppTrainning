import { useEffect, useMemo, useRef, useState } from 'react';
import { api, AiTeacherAudioStatus } from '../lib/api';
import { useLanguage, localeFor, Language } from '../lib/i18n';

export interface RobotTeacherBlock {
  id: string;
  content?: string; // the lesson script
  label?: string; // optional lesson title
  language?: Language;
  voice?: string; // best-effort admin voice-name hint (browser fallback)
  rate?: number;
  avatarStyle?: string;
  instructions?: string;
  // Undefined means "show it" — the original, only behavior before this
  // became optional. Admin can turn it off for an audio-only experience.
  showScript?: boolean;
  audioStatus?: AiTeacherAudioStatus;
  audioStale?: boolean;
}

type PlaybackStatus = 'idle' | 'speaking' | 'paused';

const ACCENTS: Record<string, string> = {
  amber: '#E8A33D',
  sage: '#4F7965',
  coral: '#E4572E',
};

export function accentColor(style?: string): string {
  return ACCENTS[style ?? 'amber'] ?? ACCENTS.amber;
}

// Only one AI Teacher lesson plays at a time anywhere on the page — whether
// it's a standalone ai_teacher block, a Guided Video Lesson cue, using
// generated audio, or the browser voice. Starting one broadcasts this event
// so every other mounted instance (RobotTeacher or GuidedVideoTeacher)
// stops itself, regardless of which playback mode it's in.
export const PLAYBACK_START_EVENT = 'ai-teacher-playback-start';

// Splits into rough sentences with their character offset in the original
// script, so a `boundary` event's charIndex can be mapped back to "which
// sentence is being read right now" — a coarser, more robust signal than
// trying to track individual words (browser word-boundary timing is
// inconsistent across engines). Only used for the browser-voice path —
// generated audio has no alignment data to sync against (see below).
function splitSentences(text: string): { text: string; start: number }[] {
  if (!text.trim()) return [];
  const results: { text: string; start: number }[] = [];
  const re = /[^.!?\n]+[.!?]*(?:\s+|\n+|$)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text))) {
    const trimmed = match[0].trim();
    if (trimmed) results.push({ text: trimmed, start: match.index });
  }
  return results.length ? results : [{ text: text.trim(), start: 0 }];
}

export type { PlaybackStatus };

export function RobotAvatar({ status, glow }: { status: PlaybackStatus; glow: string }) {
  return (
    <div className={`relative ${status === 'idle' ? 'animate-robot-idle' : ''}`}>
      <svg viewBox="0 0 160 160" className="w-24 h-24 sm:w-32 sm:h-32" role="img" aria-label="AI robot teacher avatar">
        <defs>
          <linearGradient id="robotHead" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#242A4D" />
            <stop offset="100%" stopColor="#151B3B" />
          </linearGradient>
        </defs>
        {/* antenna */}
        <line x1="80" y1="10" x2="80" y2="27" stroke="#5B6280" strokeWidth="3" strokeLinecap="round" />
        <circle cx="80" cy="8" r="5" fill={glow} className={status === 'speaking' ? 'animate-robot-glow' : ''} />
        {/* head */}
        <rect x="18" y="27" width="124" height="102" rx="26" fill="url(#robotHead)" stroke="#2A2F55" strokeWidth="2" />
        {/* ears */}
        <rect x="6" y="62" width="12" height="28" rx="4" fill="#2A2F55" />
        <rect x="142" y="62" width="12" height="28" rx="4" fill="#2A2F55" />
        {/* eyes (blink) */}
        <circle cx="60" cy="70" r="11" fill={glow} className="animate-robot-blink" opacity="0.95" />
        <circle cx="100" cy="70" r="11" fill={glow} className="animate-robot-blink" opacity="0.95" />
        {/* mouth */}
        <rect
          x="54"
          y="96"
          width="52"
          height="10"
          rx="5"
          fill={glow}
          opacity={status === 'paused' ? 0.5 : 0.9}
          className={status === 'speaking' ? 'animate-robot-talk' : ''}
        />
      </svg>
      {status === 'speaking' && (
        <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
          <span
            className="absolute inline-flex h-full w-full rounded-full opacity-75 animate-robot-glow"
            style={{ backgroundColor: glow }}
          />
          <span className="relative inline-flex rounded-full h-4 w-4" style={{ backgroundColor: glow }} />
        </span>
      )}
    </div>
  );
}

export default function RobotTeacher({
  block,
  classId,
  studentEmail,
}: {
  block: RobotTeacherBlock;
  classId: string;
  studentEmail?: string;
}) {
  const { t, language: siteLanguage } = useLanguage();
  const script = (block.content ?? '').trim();
  const glow = accentColor(block.avatarStyle);
  const lessonLanguage = block.language ?? siteLanguage;
  const localeCode = localeFor(lessonLanguage);
  // Undefined/omitted means "show it" — existing blocks (saved before this
  // became optional) keep their original always-shown behavior.
  const showScript = block.showScript !== false;

  // Priority: ready (non-stale) generated audio > browser speechSynthesis >
  // script text only. A stale or failed generation falls back to the
  // browser voice rather than playing audio that no longer matches the
  // script.
  const hasGeneratedAudio = block.audioStatus === 'ready' && !block.audioStale && !!studentEmail;
  const speechSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;
  const mode: 'generated' | 'browser' | 'text-only' = hasGeneratedAudio
    ? 'generated'
    : speechSupported
      ? 'browser'
      : 'text-only';

  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [status, setStatus] = useState<PlaybackStatus>('idle');
  const [hasStarted, setHasStarted] = useState(false);
  const [activeSentence, setActiveSentence] = useState(-1);
  const [rate, setRate] = useState(block.rate ?? 1);
  const [volume, setVolume] = useState(1);
  const [voiceName, setVoiceName] = useState(block.voice ?? '');
  const [audioLoadError, setAudioLoadError] = useState(false);

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const stoppingRef = useRef(false);
  const instanceId = useRef(`${block.id}-${Math.random().toString(36).slice(2)}`).current;

  const sentences = useMemo(() => splitSentences(script), [script]);
  const audioSrc = hasGeneratedAudio ? api.aiTeacherAudioUrl(classId, block.id, studentEmail!) : undefined;

  useEffect(() => {
    if (mode !== 'browser') return;
    const load = () => setVoices(window.speechSynthesis.getVoices());
    load();
    window.speechSynthesis.addEventListener('voiceschanged', load);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', load);
  }, [mode]);

  // Stop narration when this block unmounts (student navigates away or the
  // topic/module list re-renders around a different lesson).
  useEffect(() => {
    return () => {
      if (speechSupported) window.speechSynthesis.cancel();
      audioRef.current?.pause();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [block.id]);

  // Only one lesson (generated audio OR browser voice, in any block on the
  // page) plays at a time — when another instance claims playback, this one
  // stops itself.
  useEffect(() => {
    const onOtherStart = (e: Event) => {
      const startedId = (e as CustomEvent<string>).detail;
      if (startedId === instanceId) return;
      if (mode === 'generated') {
        const el = audioRef.current;
        if (el && !el.paused) {
          stoppingRef.current = true;
          el.pause();
        } else {
          resetToIdle();
        }
      } else if (mode === 'browser' && speechSupported) {
        window.speechSynthesis.cancel();
        setStatus('idle');
        setActiveSentence(-1);
      }
    };
    window.addEventListener(PLAYBACK_START_EVENT, onOtherStart);
    return () => window.removeEventListener(PLAYBACK_START_EVENT, onOtherStart);
  }, [instanceId, mode, speechSupported]);

  const broadcastStart = () => {
    window.dispatchEvent(new CustomEvent(PLAYBACK_START_EVENT, { detail: instanceId }));
  };

  const matchingVoices = useMemo(() => {
    const prefix = localeCode.split('-')[0].toLowerCase();
    return voices.filter((v) => v.lang.toLowerCase().startsWith(prefix));
  }, [voices, localeCode]);

  const resolveVoice = (): SpeechSynthesisVoice | undefined => {
    if (voiceName) {
      const byName = voices.find((v) => v.name === voiceName);
      if (byName) return byName;
    }
    // No voice matches the requested name (or none was set) — fall back to
    // the closest available voice for this lesson's language, then to
    // whatever the browser offers rather than failing silently.
    if (matchingVoices.length > 0) return matchingVoices[0];
    return voices[0];
  };

  const resetToIdle = () => {
    setStatus('idle');
    setActiveSentence(-1);
  };

  // --- Browser speechSynthesis controls ---
  const startBrowserSpeech = () => {
    if (!speechSupported || !script) return;
    broadcastStart();
    window.speechSynthesis.cancel();

    const utter = new SpeechSynthesisUtterance(script);
    const voice = resolveVoice();
    if (voice) utter.voice = voice;
    utter.lang = voice?.lang ?? localeCode;
    utter.rate = rate;
    utter.volume = volume;
    utter.onboundary = (event) => {
      if (!sentences.length) return;
      let idx = 0;
      for (let i = 0; i < sentences.length; i++) {
        if (sentences[i].start <= event.charIndex) idx = i;
        else break;
      }
      setActiveSentence(idx);
    };
    utter.onend = resetToIdle;
    utter.onerror = resetToIdle;
    utteranceRef.current = utter;

    setHasStarted(true);
    setStatus('speaking');
    window.speechSynthesis.speak(utter);
  };

  const pauseBrowserSpeech = () => {
    window.speechSynthesis.pause();
    setStatus('paused');
  };
  const resumeBrowserSpeech = () => {
    window.speechSynthesis.resume();
    setStatus('speaking');
  };
  const stopBrowserSpeech = () => {
    window.speechSynthesis.cancel();
    resetToIdle();
  };

  // --- Generated <audio> controls ---
  const startGeneratedAudio = () => {
    const el = audioRef.current;
    if (!el) return;
    broadcastStart();
    setAudioLoadError(false);
    el.currentTime = 0;
    el.playbackRate = rate;
    el.volume = volume;
    setHasStarted(true);
    el.play().catch(() => setAudioLoadError(true));
  };
  const pauseGeneratedAudio = () => audioRef.current?.pause();
  const resumeGeneratedAudio = () => {
    broadcastStart();
    audioRef.current?.play().catch(() => setAudioLoadError(true));
  };
  const stopGeneratedAudio = () => {
    const el = audioRef.current;
    if (!el) return;
    if (el.paused) {
      // Already paused (e.g. Pause was clicked, then Stop) — calling
      // .pause() again fires no new 'pause' event, so nothing would ever
      // reset the status. Reset directly instead of waiting for one.
      el.currentTime = 0;
      resetToIdle();
    } else {
      stoppingRef.current = true;
      el.pause();
      el.currentTime = 0;
    }
  };

  // Live volume/speed updates while playing — the <audio> element supports
  // this natively, unlike the browser-speech utterance.
  useEffect(() => {
    if (mode === 'generated' && audioRef.current) audioRef.current.volume = volume;
  }, [mode, volume]);
  useEffect(() => {
    if (mode === 'generated' && audioRef.current) audioRef.current.playbackRate = rate;
  }, [mode, rate]);

  const start = mode === 'generated' ? startGeneratedAudio : startBrowserSpeech;
  const pause = mode === 'generated' ? pauseGeneratedAudio : pauseBrowserSpeech;
  const resume = mode === 'generated' ? resumeGeneratedAudio : resumeBrowserSpeech;
  const stop = mode === 'generated' ? stopGeneratedAudio : stopBrowserSpeech;

  if (!script) {
    return (
      <div className="border border-line rounded-sm p-4 bg-surface text-sm text-ink/50">
        {t('noScriptYet')}
      </div>
    );
  }

  return (
    <div className="border border-line rounded-sm overflow-hidden bg-surface">
      {mode === 'generated' && (
        <audio
          ref={audioRef}
          src={audioSrc}
          preload="none"
          onPlay={() => setStatus('speaking')}
          onPause={() => {
            if (stoppingRef.current) {
              stoppingRef.current = false;
              resetToIdle();
            } else {
              setStatus('paused');
            }
          }}
          onEnded={resetToIdle}
          onError={() => setAudioLoadError(true)}
          className="hidden"
        />
      )}

      {/* Stage — deliberately a fixed dark panel regardless of site theme,
          same convention as the black video-embed backgrounds elsewhere. */}
      <div className="bg-midnight px-4 py-6 sm:px-6 sm:py-8 flex flex-col items-center text-center">
        <span className="text-[11px] font-mono uppercase tracking-widest text-white/70 mb-3">
          🤖 {t('aiTeacherLabel')}
        </span>
        <RobotAvatar status={status} glow={glow} />
        {block.label && (
          <p className="font-display text-lg text-white mt-4">{block.label}</p>
        )}
        <p className="text-xs font-mono text-white/80 mt-1 h-4">
          {status === 'speaking' ? t('robotSpeaking') : status === 'paused' ? t('robotPaused') : ''}
        </p>

        {mode === 'text-only' ? (
          <p className="text-xs text-coral mt-3 max-w-xs">{t('speechNotSupported')}</p>
        ) : (
          <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
            {status === 'idle' && !hasStarted && (
              <button onClick={start} className="btn-primary text-sm px-4 py-2">
                ▶ {t('startLesson')}
              </button>
            )}
            {status === 'idle' && hasStarted && (
              <button onClick={start} className="btn-primary text-sm px-4 py-2">
                ↻ {t('replayLesson')}
              </button>
            )}
            {status === 'speaking' && (
              <>
                <button onClick={pause} className="btn-outline text-sm px-4 py-2 border-chalk/30 text-white hover:border-chalk/60 hover:text-white">
                  ⏸ {t('pauseLesson')}
                </button>
                <button onClick={stop} className="btn-outline text-sm px-4 py-2 border-chalk/30 text-white hover:border-chalk/60 hover:text-white">
                  ⏹ {t('stopLesson')}
                </button>
              </>
            )}
            {status === 'paused' && (
              <>
                <button onClick={resume} className="btn-primary text-sm px-4 py-2">
                  ▶ {t('resumeLesson')}
                </button>
                <button onClick={start} className="btn-outline text-sm px-4 py-2 border-chalk/30 text-white hover:border-chalk/60 hover:text-white">
                  ↻ {t('replayLesson')}
                </button>
                <button onClick={stop} className="btn-outline text-sm px-4 py-2 border-chalk/30 text-white hover:border-chalk/60 hover:text-white">
                  ⏹ {t('stopLesson')}
                </button>
              </>
            )}
          </div>
        )}

        {audioLoadError && (
          <p className="text-xs text-coral mt-2 max-w-xs">{t('audioUnavailable')}</p>
        )}

        {mode !== 'text-only' && (
          <div className="flex flex-wrap items-center justify-center gap-4 mt-4 text-white/70">
            <label className="flex items-center gap-1.5 text-xs">
              🔊 {t('volumeLabel')}
              <input
                type="range"
                min={0}
                max={1}
                step={0.1}
                value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="w-16 sm:w-20 accent-amber"
                aria-label={t('volumeLabel')}
              />
            </label>
            <label className="flex items-center gap-1.5 text-xs">
              {t('speedLabel')}
              <select
                value={rate}
                onChange={(e) => setRate(parseFloat(e.target.value))}
                className="bg-transparent border border-chalk/30 rounded-sm text-xs py-0.5"
              >
                <option value={0.75}>0.75x</option>
                <option value={1}>1x</option>
                <option value={1.25}>1.25x</option>
                <option value={1.5}>1.5x</option>
              </select>
            </label>
            {mode === 'browser' && matchingVoices.length > 1 && (
              <label className="flex items-center gap-1.5 text-xs">
                {t('voiceLabel')}
                <select
                  value={voiceName}
                  onChange={(e) => setVoiceName(e.target.value)}
                  className="bg-transparent border border-chalk/30 rounded-sm text-xs py-0.5 max-w-[9rem]"
                >
                  <option value="">{t('autoVoiceOption')}</option>
                  {matchingVoices.map((v) => (
                    <option key={v.name} value={v.name}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
        )}
      </div>

      {/* Script panel — the transcript itself is optional (admin-controlled);
          instructions are a separate "what to do" note and always shown.
          If speech isn't playable at all here, the transcript is the only
          way to reach the lesson, so it's shown regardless of the setting
          rather than leaving the student with nothing. */}
      {(block.instructions || showScript || mode === 'text-only') && (
        <div className="p-4 sm:p-5">
          {block.instructions && (
            <div className={showScript ? 'mb-3' : undefined}>
              <p className="font-mono text-[11px] tracking-widest text-ink/40 uppercase mb-1">
                {t('instructionsLabel')}
              </p>
              <p className="text-sm text-ink/70 whitespace-pre-line">{block.instructions}</p>
            </div>
          )}
          {(showScript || mode === 'text-only') &&
            (mode === 'browser' ? (
              <p className="text-sm text-ink/80 leading-relaxed whitespace-pre-line">
                {sentences.map((s, i) => (
                  <span
                    key={i}
                    className={i === activeSentence ? 'bg-amber/20 rounded px-0.5 transition-colors' : undefined}
                  >
                    {s.text}{' '}
                  </span>
                ))}
              </p>
            ) : (
              <p className="text-sm text-ink/80 leading-relaxed whitespace-pre-line">{script}</p>
            ))}
        </div>
      )}
    </div>
  );
}
