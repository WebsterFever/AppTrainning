import { useState } from 'react';
import { api, AiTeacherAudioStatus } from '../lib/api';
import { formatClockTimestamp, parseClockTimestamp } from '../lib/guidedVideo';

// Stable OpenAI neural voice names — same list ClassManager uses for
// standalone ai_teacher blocks.
const NEURAL_VOICES = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'] as const;

export interface TeacherCueForm {
  id?: string;
  // Friendly "MM:SS" input — converted to seconds on submit (see
  // ClassManager's submit()), never sent to the API in this form.
  timestamp: string;
  script: string;
  language: string; // '' = match class language, same convention as ai_teacher blocks
  voice: string;
  rate: string;
  // Read-only, mirrors ContentBlockForm's own audio* fields.
  audioStatus?: AiTeacherAudioStatus;
  audioVoice?: string;
  audioError?: string;
  audioStale?: boolean;
}

export function emptyCue(): TeacherCueForm {
  return { timestamp: '', script: '', language: '', voice: '', rate: '1' };
}

export default function GuidedTeacherCueEditor({
  classId,
  blockId,
  cues,
  onChange,
}: {
  classId?: string;
  blockId?: string;
  cues: TeacherCueForm[];
  onChange: (cues: TeacherCueForm[]) => void;
}) {
  const [audioUi, setAudioUi] = useState<
    Record<string, { generating?: boolean; error?: string; previewUrl?: string }>
  >({});

  const updateCue = (ci: number, patch: Partial<TeacherCueForm>) => {
    const next = [...cues];
    next[ci] = { ...next[ci], ...patch };
    onChange(next);
  };

  const generateVoice = async (ci: number) => {
    const cue = cues[ci];
    if (!classId || !blockId || !cue.id) return;
    const cueId = cue.id;
    const uiKey = `${blockId}:${cueId}`;
    setAudioUi((s) => ({ ...s, [uiKey]: { generating: true } }));
    try {
      const result = await api.generateGuidedCueAudio(classId, blockId, cueId, {
        script: cue.script.trim(),
        language: (cue.language || 'en') as 'en' | 'fr' | 'ht',
        voice: cue.voice.trim() || undefined,
        rate: cue.rate.trim() ? parseFloat(cue.rate) : undefined,
      });
      updateCue(ci, {
        script: result.script ?? cue.script,
        audioStatus: result.audioStatus,
        audioVoice: result.audioVoice,
        audioError: result.audioError,
        audioStale: false,
      });
      setAudioUi((s) => ({ ...s, [uiKey]: { generating: false } }));
    } catch (err) {
      setAudioUi((s) => ({
        ...s,
        [uiKey]: { generating: false, error: err instanceof Error ? err.message : 'Generation failed' },
      }));
    }
  };

  const previewVoice = async (cueId: string) => {
    if (!classId || !blockId) return;
    const uiKey = `${blockId}:${cueId}`;
    try {
      const url = await api.previewGuidedCueAudio(classId, blockId, cueId);
      setAudioUi((s) => ({ ...s, [uiKey]: { ...s[uiKey], previewUrl: url, error: undefined } }));
    } catch {
      setAudioUi((s) => ({ ...s, [uiKey]: { ...s[uiKey], error: 'No generated audio available yet.' } }));
    }
  };

  return (
    <div className="border border-line/70 rounded-sm p-2.5 bg-chalk space-y-2">
      <p className="text-[11px] font-mono uppercase tracking-wide text-ink/50">
        Teacher explanations — appear in timestamp order regardless of the list order below
      </p>
      {!blockId && (
        <p className="text-[11px] text-ink/40">Save the class first, then add explanations.</p>
      )}
      {blockId && cues.length === 0 && (
        <p className="text-[11px] text-ink/40">No explanations yet.</p>
      )}
      <div className="space-y-2">
        {cues.map((cue, ci) => {
          const uiKey = cue.id ? `${blockId}:${cue.id}` : undefined;
          const ui = uiKey ? (audioUi[uiKey] ?? {}) : {};
          const status = cue.audioStatus ?? 'none';
          return (
            <div key={ci} className="border border-line rounded-sm p-2 bg-surface space-y-1.5">
              <div className="flex items-center gap-1.5">
                <input
                  placeholder="00:25"
                  value={cue.timestamp}
                  onChange={(e) => updateCue(ci, { timestamp: e.target.value })}
                  className="input text-xs py-1 w-20 flex-shrink-0 font-mono"
                  aria-label="Timestamp (MM:SS)"
                />
                {cue.timestamp && parseClockTimestamp(cue.timestamp) == null && (
                  <span className="text-[11px] text-coral flex-shrink-0">Invalid — use MM:SS</span>
                )}
                <div className="flex-1" />
                <button
                  type="button"
                  disabled={ci === 0}
                  onClick={() => {
                    const next = [...cues];
                    [next[ci - 1], next[ci]] = [next[ci], next[ci - 1]];
                    onChange(next);
                  }}
                  aria-label="Move explanation up"
                  className="btn-outline text-xs px-2 py-0.5 disabled:opacity-30 flex-shrink-0"
                >
                  ↑
                </button>
                <button
                  type="button"
                  disabled={ci === cues.length - 1}
                  onClick={() => {
                    const next = [...cues];
                    [next[ci + 1], next[ci]] = [next[ci], next[ci + 1]];
                    onChange(next);
                  }}
                  aria-label="Move explanation down"
                  className="btn-outline text-xs px-2 py-0.5 disabled:opacity-30 flex-shrink-0"
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => onChange(cues.filter((_, j) => j !== ci))}
                  aria-label="Remove this explanation"
                  className="btn-danger-outline text-xs px-2 py-0.5 flex-shrink-0"
                >
                  ✕
                </button>
              </div>
              <textarea
                placeholder="What the robot explains at this moment in the video"
                value={cue.script}
                onChange={(e) => updateCue(ci, { script: e.target.value })}
                className="input h-16 text-sm"
              />
              <div className="grid grid-cols-3 gap-1.5">
                <select
                  value={cue.language}
                  onChange={(e) => updateCue(ci, { language: e.target.value })}
                  className="input text-xs py-1"
                >
                  <option value="">Match class language</option>
                  <option value="en">English</option>
                  <option value="fr">French</option>
                  <option value="ht">Creole</option>
                </select>
                <select
                  value={cue.voice}
                  onChange={(e) => updateCue(ci, { voice: e.target.value })}
                  className="input text-xs py-1"
                >
                  <option value="">Auto voice</option>
                  {NEURAL_VOICES.map((v) => (
                    <option key={v} value={v}>
                      {v[0].toUpperCase() + v.slice(1)}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min={0.5}
                  max={2}
                  step={0.1}
                  placeholder="Speed"
                  value={cue.rate}
                  onChange={(e) => updateCue(ci, { rate: e.target.value })}
                  className="input text-xs py-1"
                />
              </div>

              {!cue.id ? (
                <p className="text-[11px] text-ink/40">Save the class first, then generate the voice.</p>
              ) : (
                <div className="border border-line/70 rounded-sm p-1.5 bg-chalk space-y-1">
                  <p className="text-[11px]">
                    {ui.generating || status === 'generating' ? (
                      <span className="text-amber">Generating…</span>
                    ) : status === 'ready' && cue.audioStale ? (
                      <span className="text-coral">⚠ Script changed — regenerate voice</span>
                    ) : status === 'ready' ? (
                      <span className="text-sage">✓ Ready{cue.audioVoice ? ` (${cue.audioVoice})` : ''}</span>
                    ) : status === 'failed' ? (
                      <span className="text-coral">✗ Generation failed{cue.audioError ? `: ${cue.audioError}` : ''}</span>
                    ) : (
                      <span className="text-ink/40">Not generated</span>
                    )}
                  </p>
                  {ui.error && <p className="text-[11px] text-coral">{ui.error}</p>}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      disabled={ui.generating || status === 'generating' || !cue.script.trim()}
                      onClick={() => generateVoice(ci)}
                      className="btn-outline text-[11px] px-2 py-1"
                    >
                      {status === 'ready' || status === 'failed' ? 'Regenerate Voice' : 'Generate Voice'}
                    </button>
                    {status === 'ready' && !cue.audioStale && (
                      <button
                        type="button"
                        onClick={() => previewVoice(cue.id!)}
                        className="btn-outline text-[11px] px-2 py-1"
                      >
                        Load preview
                      </button>
                    )}
                  </div>
                  {ui.previewUrl && <audio controls src={ui.previewUrl} className="w-full h-8 mt-1" />}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <button
        type="button"
        onClick={() => onChange([...cues, { timestamp: '', script: '', language: '', voice: '', rate: '1' }])}
        className="text-xs font-semibold text-amber hover:text-coral"
      >
        + Add explanation
      </button>
      <p className="text-[11px] text-ink/40">
        Example: <span className="font-mono">{formatClockTimestamp(85)}</span> for 1 minute 25 seconds in.
      </p>
    </div>
  );
}
