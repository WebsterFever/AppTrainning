import { useEffect, useRef, useState } from 'react';
import { api, GuidedVideoGeneration, VideoGenerationStatus } from '../lib/api';
import { cueToForm, TeacherCueForm } from './GuidedTeacherCueEditor';

// Mirrors backend/src/classes/video-render/render-limits.ts. That file is
// the source of truth (server-side validation happens there) — these are
// only for the admin UI's own input constraints and copy.
const FIXED_WIDTH = 1280;
const FIXED_HEIGHT = 720;
const FIXED_FPS = 12;
const MIN_TYPING_CPS = 5;
const MAX_TYPING_CPS = 40;
const DEFAULT_TYPING_CPS = 15;

const IN_PROGRESS_STATUSES: VideoGenerationStatus[] = ['queued', 'rendering', 'encoding', 'uploading'];

const STATUS_LABELS: Record<VideoGenerationStatus, string> = {
  idle: 'Not generated yet',
  queued: 'Queued…',
  rendering: 'Rendering code…',
  encoding: 'Encoding video…',
  uploading: 'Uploading video…',
  ready: 'Ready',
  failed: 'Generation failed',
  interrupted: 'Interrupted by a server restart',
};

export default function GuidedVideoGenerator({
  classId,
  blockId,
  cues,
  generation,
  stale,
  onStatusChange,
  onCuesRefresh,
}: {
  classId?: string;
  blockId?: string;
  cues: TeacherCueForm[];
  generation?: GuidedVideoGeneration;
  stale?: boolean;
  onStatusChange: (generation: GuidedVideoGeneration) => void;
  onCuesRefresh: (cues: TeacherCueForm[]) => void;
}) {
  const [typingCps, setTypingCps] = useState(generation?.typingCharsPerSecond ?? DEFAULT_TYPING_CPS);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [cueCount, setCueCount] = useState<number | undefined>();
  const wasInProgress = useRef(false);

  const status = generation?.status ?? 'idle';
  const stepCount = cues.filter((c) => c.code.trim()).length;

  // Poll every 2s while a render is in progress. When it lands in a
  // terminal state, fetch the block's fresh cues (the render job writes
  // brand-new timestamps onto them server-side) so the admin's open form
  // picks them up without a manual reload.
  useEffect(() => {
    if (!classId || !blockId) return;
    if (!IN_PROGRESS_STATUSES.includes(status)) {
      wasInProgress.current = false;
      return;
    }
    wasInProgress.current = true;
    const timer = setInterval(async () => {
      try {
        const result = await api.getGuidedVideoStatus(classId, blockId);
        setCueCount(result.cueCount);
        onStatusChange(result);
        if (wasInProgress.current && !IN_PROGRESS_STATUSES.includes(result.status)) {
          wasInProgress.current = false;
          if (result.status === 'ready') {
            const freshClasses = await api.listClassesAdmin();
            const freshBlock = freshClasses
              .find((c) => c.id === classId)
              ?.curriculumModules?.flatMap((m) => m.topics)
              .flatMap((t) => t.contentBlocks ?? [])
              .find((b) => b.id === blockId);
            if (freshBlock?.guidedTeacherCues) {
              onCuesRefresh(freshBlock.guidedTeacherCues.map(cueToForm));
            }
          }
        }
      } catch {
        // Transient network hiccup — the next tick retries.
      }
    }, 2000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId, blockId, status]);

  const generate = async () => {
    if (!classId || !blockId) return;
    setBusy(true);
    setError('');
    setPreviewUrl('');
    try {
      const result = await api.generateGuidedVideo(classId, blockId, {
        typingCharsPerSecond: typingCps,
        fps: FIXED_FPS,
        width: FIXED_WIDTH,
        height: FIXED_HEIGHT,
      });
      setCueCount(result.cueCount);
      onStatusChange(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start generation');
    } finally {
      setBusy(false);
    }
  };

  const loadPreview = async () => {
    if (!classId || !blockId) return;
    try {
      const url = await api.previewGuidedVideo(classId, blockId);
      setPreviewUrl(url);
      setError('');
    } catch {
      setError('No generated video available yet.');
    }
  };

  const remove = async () => {
    if (!classId || !blockId) return;
    if (!confirm('Delete the generated coding video? The cue timestamps stay as-is; you can regenerate later.')) {
      return;
    }
    setBusy(true);
    setError('');
    setPreviewUrl('');
    try {
      const result = await api.deleteGuidedVideo(classId, blockId);
      onStatusChange(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete video');
    } finally {
      setBusy(false);
    }
  };

  const inProgress = IN_PROGRESS_STATUSES.includes(status);

  return (
    <div className="border border-line/70 rounded-sm p-2.5 bg-chalk space-y-2">
      <p className="text-[11px] font-mono uppercase tracking-wide text-ink/50">
        Automatic Coding Video Generator
      </p>
      {!blockId && (
        <p className="text-[11px] text-ink/40">Save the class first, then generate a coding video.</p>
      )}
      {blockId && (
        <>
          <p className="text-[11px] text-ink/60">
            Types out the code from every explanation above (in order) as a silent, deterministic typing
            animation, then writes the exact finish-timestamp of each step back into that explanation. Add
            code to the explanations above first — currently{' '}
            <span className="font-semibold">{stepCount}</span> step{stepCount === 1 ? '' : 's'} with code.
          </p>
          <div className="flex items-center gap-2">
            <label className="text-[11px] text-ink/60 flex-shrink-0">Typing speed</label>
            <input
              type="number"
              min={MIN_TYPING_CPS}
              max={MAX_TYPING_CPS}
              value={typingCps}
              disabled={inProgress || busy}
              onChange={(e) => setTypingCps(Number(e.target.value))}
              className="input text-xs py-1 w-20"
            />
            <span className="text-[11px] text-ink/40">chars/sec ({MIN_TYPING_CPS}-{MAX_TYPING_CPS})</span>
            <div className="flex-1" />
            <span className="text-[11px] text-ink/40">
              {FIXED_WIDTH}×{FIXED_HEIGHT} @ {FIXED_FPS}fps
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <p className="text-[11px]">
              {inProgress ? (
                <span className="text-amber">{STATUS_LABELS[status]}</span>
              ) : status === 'ready' && stale ? (
                <span className="text-coral">⚠ Code/steps changed — regenerate video</span>
              ) : status === 'ready' ? (
                <span className="text-sage">
                  ✓ {STATUS_LABELS[status]}
                  {generation?.durationSeconds != null ? ` — ${Math.round(generation.durationSeconds)}s` : ''}
                  {cueCount != null ? `, ${cueCount} cue${cueCount === 1 ? '' : 's'} timestamped` : ''}
                </span>
              ) : status === 'failed' ? (
                <span className="text-coral">
                  ✗ {STATUS_LABELS[status]}
                  {generation?.error ? `: ${generation.error}` : ''}
                </span>
              ) : status === 'interrupted' ? (
                <span className="text-coral">
                  ⚠ Video generation was interrupted by a server restart. Please generate the video again.
                </span>
              ) : (
                <span className="text-ink/40">{STATUS_LABELS[status]}</span>
              )}
            </p>
          </div>
          {error && <p className="text-[11px] text-coral">{error}</p>}

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              disabled={inProgress || busy || stepCount === 0}
              onClick={generate}
              className="btn-outline text-[11px] px-2 py-1"
            >
              {status === 'ready' || status === 'failed' || status === 'interrupted'
                ? 'Regenerate Video'
                : 'Generate Video'}
            </button>
            {status === 'ready' && !inProgress && (
              <button type="button" onClick={loadPreview} className="btn-outline text-[11px] px-2 py-1">
                Load preview
              </button>
            )}
            {status === 'ready' && !inProgress && (
              <button
                type="button"
                disabled={busy}
                onClick={remove}
                className="btn-danger-outline text-[11px] px-2 py-1"
              >
                Delete Video
              </button>
            )}
          </div>
          {previewUrl && (
            // eslint-disable-next-line jsx-a11y/media-has-caption
            <video controls src={previewUrl} className="w-full mt-1 rounded-sm" style={{ maxHeight: 240 }} />
          )}
        </>
      )}
    </div>
  );
}
