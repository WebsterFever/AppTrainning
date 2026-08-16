import { useEffect, useMemo, useRef, useState } from 'react';
import { api, TeacherCue } from '../lib/api';
import { useLanguage, localeFor } from '../lib/i18n';
import { RobotAvatar, accentColor, PLAYBACK_START_EVENT, PlaybackStatus } from './RobotTeacher';

export default function GuidedVideoTeacher({
  videoSrc,
  label,
  cues,
  classId,
  blockId,
  studentEmail,
  // True for an auto-generated coding video (always exactly 1280x720,
  // i.e. 16:9) — uses a responsive aspect-ratio box instead of the fixed
  // short banner height + object-cover crop that's meant for arbitrary
  // manually-uploaded lesson video aspect ratios.
  fixedAspectRatio,
}: {
  videoSrc: string;
  label?: string;
  cues: TeacherCue[];
  classId: string;
  blockId: string;
  studentEmail?: string;
  fixedAspectRatio?: boolean;
}) {
  const { t, language: siteLanguage } = useLanguage();
  const sortedCues = useMemo(() => [...cues].sort((a, b) => a.timestampSeconds - b.timestampSeconds), [cues]);

  const [status, setStatus] = useState<PlaybackStatus>('idle');
  const [activeCueId, setActiveCueId] = useState<string | null>(null);
  const [triggeredCueIds, setTriggeredCueIds] = useState<Set<string>>(new Set());
  const [audioLoadError, setAudioLoadError] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);
  const stoppingRef = useRef(false);
  const highWaterMarkRef = useRef(0);
  // Chromium fires a `timeupdate` event *during* a programmatic seek —
  // between `seeking` and `seeked` — even though playback never actually
  // advanced through the intervening time. Without this guard, that stray
  // timeupdate reads currentTime post-seek but triggeredCueIds pre-seek,
  // triggering whatever cue the seek jumped past instead of the one the
  // seek was skipping over.
  const seekingRef = useRef(false);
  const instanceId = useRef(`guided-${blockId}-${Math.random().toString(36).slice(2)}`).current;

  const speechSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;
  const activeCue = sortedCues.find((c) => c.id === activeCueId) ?? null;
  const activeCueHasGeneratedAudio = !!(
    activeCue &&
    activeCue.audioStatus === 'ready' &&
    !activeCue.audioStale &&
    studentEmail
  );

  useEffect(() => {
    if (!speechSupported) return;
    const load = () => {
      voicesRef.current = window.speechSynthesis.getVoices();
    };
    load();
    window.speechSynthesis.addEventListener('voiceschanged', load);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', load);
  }, [speechSupported]);

  // Stop narration + release the video when this block unmounts.
  useEffect(() => {
    return () => {
      if (speechSupported) window.speechSynthesis.cancel();
      audioRef.current?.pause();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blockId]);

  const finishCue = () => {
    setActiveCueId(null);
    setStatus('idle');
    videoRef.current?.play().catch(() => {});
  };

  const broadcastStart = () => {
    window.dispatchEvent(new CustomEvent(PLAYBACK_START_EVENT, { detail: instanceId }));
  };

  const startBrowserSpeechForCue = (cue: TeacherCue) => {
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(cue.script);
    const localeCode = localeFor(cue.language ?? siteLanguage);
    const prefix = localeCode.split('-')[0].toLowerCase();
    const match = voicesRef.current.find((v) => v.lang.toLowerCase().startsWith(prefix));
    if (match) utter.voice = match;
    utter.lang = match?.lang ?? localeCode;
    utter.rate = cue.rate ?? 1;
    utter.onend = finishCue;
    utter.onerror = finishCue;
    utteranceRef.current = utter;
    setStatus('speaking');
    window.speechSynthesis.speak(utter);
  };

  // Called once per cue, the moment normal forward playback crosses its
  // timestamp (see onTimeUpdate below) — never for a cue already in
  // triggeredCueIds, so it can't refire while the video sits at/near that
  // timestamp, and never for a cue skipped over by a forward seek (see
  // onSeeked, which marks those as triggered without ever calling this).
  const triggerCue = (cue: TeacherCue) => {
    const hasGenerated = cue.audioStatus === 'ready' && !cue.audioStale && !!studentEmail;
    setTriggeredCueIds((prev) => new Set(prev).add(cue.id));
    highWaterMarkRef.current = Math.max(highWaterMarkRef.current, cue.timestampSeconds);

    if (!hasGenerated && !speechSupported) {
      // Nothing can narrate this cue on this device/browser — don't
      // interrupt the video for a pause that would go nowhere.
      return;
    }

    videoRef.current?.pause();
    setAudioLoadError(false);
    setActiveCueId(cue.id);
    setStatus('speaking');
    broadcastStart();
    if (!hasGenerated) startBrowserSpeechForCue(cue);
    // Generated-audio playback is started by the effect below once the
    // <audio> element has the right src (keyed on activeCueId).
  };

  useEffect(() => {
    if (!activeCue || !activeCueHasGeneratedAudio) return;
    const el = audioRef.current;
    if (!el) return;
    el.currentTime = 0;
    el.play().catch(() => setAudioLoadError(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCueId]);

  // Normal forward playback — the only path that ever triggers a cue.
  const onTimeUpdate = () => {
    if (activeCueId || seekingRef.current) return; // narrating, or mid-seek — see seekingRef above
    const t = videoRef.current?.currentTime ?? 0;
    const next = sortedCues.find((c) => c.timestampSeconds <= t && !triggeredCueIds.has(c.id));
    if (next) {
      triggerCue(next);
      return;
    }
    highWaterMarkRef.current = Math.max(highWaterMarkRef.current, t);
  };

  const onSeeking = () => {
    seekingRef.current = true;
  };

  // Seeking (forward or backward) never itself triggers a cue — only
  // crossing one via ordinary playback does (see onTimeUpdate). A backward
  // seek un-marks cues ahead of the new position so they can fire again on
  // the next pass; a forward seek marks skipped cues as triggered so they
  // don't suddenly all fire at once.
  const onSeeked = () => {
    seekingRef.current = false;
    const newTime = videoRef.current?.currentTime ?? 0;
    const prevHigh = highWaterMarkRef.current;
    if (newTime < prevHigh) {
      setTriggeredCueIds((prev) => {
        const next = new Set(prev);
        for (const cue of sortedCues) if (cue.timestampSeconds >= newTime) next.delete(cue.id);
        return next;
      });
    } else if (newTime > prevHigh) {
      setTriggeredCueIds((prev) => {
        const next = new Set(prev);
        for (const cue of sortedCues) {
          if (cue.timestampSeconds > prevHigh && cue.timestampSeconds <= newTime) next.add(cue.id);
        }
        return next;
      });
    }
    highWaterMarkRef.current = newTime;
  };

  const onGeneratedPause = () => {
    if (stoppingRef.current) {
      stoppingRef.current = false;
      finishCue();
    } else {
      setStatus('paused');
    }
  };

  const pauseTeacher = () => {
    if (activeCueHasGeneratedAudio) {
      audioRef.current?.pause();
    } else if (speechSupported) {
      window.speechSynthesis.pause();
      setStatus('paused');
    }
  };

  const resumeTeacher = () => {
    broadcastStart();
    if (activeCueHasGeneratedAudio) {
      audioRef.current?.play().catch(() => setAudioLoadError(true));
    } else if (speechSupported) {
      window.speechSynthesis.resume();
      setStatus('speaking');
    }
  };

  const skipExplanation = () => {
    if (activeCueHasGeneratedAudio) {
      const el = audioRef.current;
      if (el && !el.paused) {
        stoppingRef.current = true;
        el.pause();
      } else {
        finishCue();
      }
    } else if (speechSupported) {
      window.speechSynthesis.cancel();
      finishCue();
    } else {
      finishCue();
    }
  };

  // Any other AI Teacher (standalone or another Guided Video) starting
  // elsewhere on the page stops this one's narration too — treated exactly
  // like Skip so the student is never left with a paused video and no way
  // to continue.
  useEffect(() => {
    const onOtherStart = (e: Event) => {
      const startedId = (e as CustomEvent<string>).detail;
      if (startedId === instanceId || !activeCueId) return;
      skipExplanation();
    };
    window.addEventListener(PLAYBACK_START_EVENT, onOtherStart);
    return () => window.removeEventListener(PLAYBACK_START_EVENT, onOtherStart);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instanceId, activeCueId, activeCueHasGeneratedAudio, speechSupported]);

  const accent = accentColor('sage');
  const panelVisible = !!activeCue;

  return (
    <div>
      <div className={panelVisible ? 'md:flex md:items-start md:gap-4' : undefined}>
        <div className={panelVisible ? 'md:flex-1 md:min-w-0' : undefined}>
          {label && <p className="text-sm font-medium text-ink mb-1.5">{label}</p>}
          <video
            ref={videoRef}
            src={videoSrc}
            controls
            onTimeUpdate={onTimeUpdate}
            onSeeking={onSeeking}
            onSeeked={onSeeked}
            className={
              fixedAspectRatio
                ? 'w-full aspect-video max-w-full object-contain rounded-sm bg-black mx-auto'
                : 'w-full h-56 sm:h-64 md:h-72 object-cover rounded-sm bg-black'
            }
          />
        </div>

        {panelVisible && activeCue && (
          <div className="mt-3 md:mt-0 md:w-72 md:flex-shrink-0">
            {activeCueHasGeneratedAudio && (
              <audio
                ref={audioRef}
                src={api.guidedCueAudioUrl(classId, blockId, activeCue.id, studentEmail!)}
                preload="none"
                onPlay={() => setStatus('speaking')}
                onPause={onGeneratedPause}
                onEnded={finishCue}
                onError={() => setAudioLoadError(true)}
                className="hidden"
              />
            )}
            <div className="bg-midnight rounded-sm px-4 py-5 flex flex-col items-center text-center">
              <span className="text-[11px] font-mono uppercase tracking-widest text-white/70 mb-2">
                🤖 {t('aiTeacherLabel')}
              </span>
              <RobotAvatar status={status} glow={accent} />
              <p className="text-xs font-mono text-white/80 mt-1 h-4">
                {status === 'speaking' ? t('robotSpeaking') : status === 'paused' ? t('robotPaused') : ''}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2 mt-3">
                {status === 'speaking' && (
                  <button
                    onClick={pauseTeacher}
                    className="btn-outline text-xs px-3 py-1.5 border-chalk/30 text-white hover:border-chalk/60 hover:text-white"
                  >
                    ⏸ {t('pauseLesson')}
                  </button>
                )}
                {status === 'paused' && (
                  <button onClick={resumeTeacher} className="btn-primary text-xs px-3 py-1.5">
                    ▶ {t('resumeLesson')}
                  </button>
                )}
                <button
                  onClick={skipExplanation}
                  className="btn-outline text-xs px-3 py-1.5 border-chalk/30 text-white hover:border-chalk/60 hover:text-white"
                >
                  ⏭ {t('skipExplanation')}
                </button>
              </div>
              {audioLoadError && (
                <p className="text-xs text-coral mt-2 max-w-xs">{t('audioUnavailable')}</p>
              )}
              {activeCue.code && (
                <div className="w-full mt-3 text-left">
                  <p className="text-[10px] font-mono uppercase tracking-widest text-white/70 mb-1">
                    {t('codeBeingExplained')}
                    {activeCue.codeLanguage ? ` — ${activeCue.codeLanguage}` : ''}
                  </p>
                  <pre className="bg-black/40 border border-chalk/10 text-white rounded-sm p-2.5 overflow-x-auto text-xs font-mono whitespace-pre">
                    {activeCue.code}
                  </pre>
                </div>
              )}
              <p className="text-sm text-white/80 leading-relaxed mt-3 whitespace-pre-line">
                {activeCue.script}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
