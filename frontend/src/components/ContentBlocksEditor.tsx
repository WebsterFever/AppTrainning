import { useState } from 'react';
import { api, AiTeacherAudioStatus, ContentBlock, ContentBlockType, GuidedVideoGeneration } from '../lib/api';
import { getVideoEmbed } from '../lib/video';
import GuidedTeacherCueEditor, { cueToForm, TeacherCueForm } from './GuidedTeacherCueEditor';
import GuidedVideoGenerator from './GuidedVideoGenerator';

export const BLOCK_TYPES: { value: ContentBlockType; label: string }[] = [
  { value: 'text', label: 'Text' },
  { value: 'video', label: 'Video' },
  { value: 'heading', label: 'Heading' },
  { value: 'image', label: 'Image' },
  { value: 'divider', label: 'Divider' },
  { value: 'code', label: 'Code' },
  { value: 'resource', label: 'Resource' },
  { value: 'exercise', label: 'Exercise' },
  { value: 'ai_teacher', label: 'AI Teacher' },
];

const AI_TEACHER_AVATAR_STYLES = ['amber', 'sage', 'coral'] as const;

// Stable OpenAI tts-1 voice names — also reused as the browser-speech
// fallback's "voice name hint" (harmless there: the browser just won't
// find a literal match and falls back to a language-appropriate voice).
const AI_TEACHER_NEURAL_VOICES = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'] as const;

export interface ContentBlockForm {
  id?: string;
  type: ContentBlockType;
  content: string;
  label: string;
  // ai_teacher-only fields — ignored (and stripped on submit) for every
  // other block type.
  language: string;
  voice: string;
  rate: string;
  avatarStyle: string;
  instructions: string;
  // Whether students also see the lesson script as readable text, or just
  // hear the robot (audio-only). Defaults to true (shown) — the original,
  // only behavior before this became optional.
  showScript: boolean;
  // Generated-audio status, read-only from the admin's point of view here
  // (set by loading an existing block, or after a successful generate call
  // — see generateVoice below). Never sent back on a normal class save.
  audioStatus?: AiTeacherAudioStatus;
  audioProvider?: string;
  audioVoice?: string;
  audioGeneratedAt?: string;
  audioError?: string;
  audioStale?: boolean;
  // video-only: Guided Video Lesson — ignored (and stripped on submit) for
  // every other block type.
  guidedTeacherEnabled: boolean;
  guidedTeacherCues: TeacherCueForm[];
  // video-only: Automatic Coding Video Generator — read-only, server-
  // managed, never sent back on a normal class save.
  guidedVideoGeneration?: GuidedVideoGeneration;
  videoStale?: boolean;
}

// Shared by ClassManager's startEdit (initial load, for both a topic's own
// contentBlocks and each of its subtopics') — keeps the server-response ->
// form conversion in exactly one place, mirroring cueToForm.
export function blockToForm(b: ContentBlock): ContentBlockForm {
  return {
    id: b.id,
    type: b.type,
    content: b.content ?? '',
    label: b.label ?? '',
    language: b.language ?? '',
    voice: b.voice ?? '',
    rate: b.rate != null ? String(b.rate) : '1',
    avatarStyle: b.avatarStyle ?? 'amber',
    instructions: b.instructions ?? '',
    showScript: b.showScript ?? true,
    audioStatus: b.audioStatus,
    audioProvider: b.audioProvider,
    audioVoice: b.audioVoice,
    audioGeneratedAt: b.audioGeneratedAt,
    audioError: b.audioError,
    audioStale: b.audioStale,
    guidedTeacherEnabled: b.guidedTeacherEnabled ?? false,
    guidedTeacherCues: (b.guidedTeacherCues ?? []).map(cueToForm),
    guidedVideoGeneration: b.guidedVideoGeneration,
    videoStale: b.videoStale,
  };
}

export function emptyBlock(): ContentBlockForm {
  return {
    type: 'text',
    content: '',
    label: '',
    language: '',
    voice: '',
    rate: '1',
    avatarStyle: 'amber',
    instructions: '',
    showScript: true,
    guidedTeacherEnabled: false,
    guidedTeacherCues: [],
  };
}

// Accepts either a materialized array or a React-style functional updater.
// The functional form is required wherever a background process (the
// Automatic Coding Video Generator's status polling, in particular) can
// call back after this component may have re-rendered several times —
// GuidedVideoGenerator's setInterval effect only refreshes its captured
// closures when `status` itself changes, so while status holds steady
// across a few polling ticks, a materialized `blocks` array captured at
// effect-creation time would go stale. Resolving updates against the
// *caller's* freshest state (see ClassManager's onChange below, which
// applies this against `prev` inside setForm) avoids that entirely,
// regardless of how stale this component's own closures get.
export type BlocksUpdate = ContentBlockForm[] | ((prev: ContentBlockForm[]) => ContentBlockForm[]);

export default function ContentBlocksEditor({
  classId,
  blocks,
  onChange,
}: {
  classId?: string;
  blocks: ContentBlockForm[];
  onChange: (update: BlocksUpdate) => void;
}) {
  const [audioUi, setAudioUi] = useState<
    Record<string, { generating?: boolean; error?: string; previewUrl?: string }>
  >({});

  const updateBlock = (bi: number, patch: Partial<ContentBlockForm>) => {
    onChange((prev) => {
      const next = [...prev];
      next[bi] = { ...next[bi], ...patch };
      return next;
    });
  };

  // Generates (or regenerates) neural voice audio for one ai_teacher block.
  // Requires the block to already exist server-side (i.e. the class has
  // been saved at least once since this block was added) — otherwise
  // there's nothing to attach the audio metadata to.
  const generateVoice = async (bi: number) => {
    if (!classId) return;
    const block = blocks[bi];
    if (!block.id) return;
    const blockId = block.id;
    setAudioUi((s) => ({ ...s, [blockId]: { generating: true } }));
    try {
      const result = await api.generateAiTeacherAudio(classId, blockId, {
        script: block.content.trim(),
        label: block.label.trim() || undefined,
        language: (block.language || 'en') as 'en' | 'fr' | 'ht',
        voice: block.voice.trim() || undefined,
        rate: block.rate.trim() ? parseFloat(block.rate) : undefined,
      });
      updateBlock(bi, {
        content: result.content ?? block.content,
        label: result.label ?? block.label,
        audioStatus: result.audioStatus,
        audioProvider: result.audioProvider,
        audioVoice: result.audioVoice,
        audioGeneratedAt: result.audioGeneratedAt,
        audioError: result.audioError,
        audioStale: false,
      });
      setAudioUi((s) => ({ ...s, [blockId]: { generating: false } }));
    } catch (err) {
      setAudioUi((s) => ({
        ...s,
        [blockId]: { generating: false, error: err instanceof Error ? err.message : 'Generation failed' },
      }));
    }
  };

  const previewVoice = async (blockId: string) => {
    if (!classId) return;
    try {
      const url = await api.previewAiTeacherAudio(classId, blockId);
      setAudioUi((s) => ({ ...s, [blockId]: { ...s[blockId], previewUrl: url, error: undefined } }));
    } catch {
      setAudioUi((s) => ({ ...s, [blockId]: { ...s[blockId], error: 'No generated audio available yet.' } }));
    }
  };

  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-mono uppercase tracking-wide text-ink/40">
        Lesson content — appears in this exact order
      </p>
      {blocks.map((block, bi) => (
        <div key={bi} className="border border-line rounded-sm p-2 bg-surface space-y-1.5">
          <div className="flex items-center gap-1.5">
            <select
              value={block.type}
              onChange={(e) => updateBlock(bi, { type: e.target.value as ContentBlockType })}
              className="input text-xs py-1 flex-1"
            >
              {BLOCK_TYPES.map((bt) => (
                <option key={bt.value} value={bt.value}>
                  {bt.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={bi === 0}
              onClick={() =>
                onChange((prev) => {
                  const next = [...prev];
                  [next[bi - 1], next[bi]] = [next[bi], next[bi - 1]];
                  return next;
                })
              }
              aria-label="Move content block up"
              className="btn-outline text-xs px-2 py-0.5 disabled:opacity-30 flex-shrink-0"
            >
              ↑
            </button>
            <button
              type="button"
              disabled={bi === blocks.length - 1}
              onClick={() =>
                onChange((prev) => {
                  const next = [...prev];
                  [next[bi + 1], next[bi]] = [next[bi], next[bi + 1]];
                  return next;
                })
              }
              aria-label="Move content block down"
              className="btn-outline text-xs px-2 py-0.5 disabled:opacity-30 flex-shrink-0"
            >
              ↓
            </button>
            <button
              type="button"
              onClick={() => onChange((prev) => prev.filter((_, j) => j !== bi))}
              aria-label="Remove this content block"
              className="btn-danger-outline text-xs px-2 py-0.5 flex-shrink-0"
            >
              ✕
            </button>
          </div>

          {block.type === 'divider' ? (
            <p className="text-[11px] text-ink/40 italic">— visual divider, no content —</p>
          ) : block.type === 'text' || block.type === 'exercise' ? (
            <textarea
              placeholder={block.type === 'exercise' ? 'Exercise instructions' : 'Study notes / paragraph text'}
              value={block.content}
              onChange={(e) => updateBlock(bi, { content: e.target.value })}
              className="input h-16 text-sm"
            />
          ) : block.type === 'heading' ? (
            <input
              placeholder="Heading text"
              value={block.content}
              onChange={(e) => updateBlock(bi, { content: e.target.value })}
              className="input text-sm"
            />
          ) : block.type === 'code' ? (
            <>
              <textarea
                placeholder="Code"
                value={block.content}
                onChange={(e) => updateBlock(bi, { content: e.target.value })}
                className="input h-16 text-sm font-mono"
              />
              <input
                placeholder="Language (optional, e.g. javascript)"
                value={block.label}
                onChange={(e) => updateBlock(bi, { label: e.target.value })}
                className="input text-xs py-1"
              />
            </>
          ) : block.type === 'ai_teacher' ? (
            <div className="space-y-1.5">
              <textarea
                placeholder="Lesson script — exactly what the robot will say"
                value={block.content}
                onChange={(e) => updateBlock(bi, { content: e.target.value })}
                className="input h-28 text-sm"
              />
              <input
                placeholder="Lesson title (optional)"
                value={block.label}
                onChange={(e) => updateBlock(bi, { label: e.target.value })}
                className="input text-xs py-1"
              />
              <div className="grid grid-cols-2 gap-1.5">
                <select
                  value={block.language}
                  onChange={(e) => updateBlock(bi, { language: e.target.value })}
                  className="input text-xs py-1"
                >
                  <option value="">Match class language</option>
                  <option value="en">English</option>
                  <option value="fr">French</option>
                  <option value="ht">Creole</option>
                </select>
                <select
                  value={block.avatarStyle}
                  onChange={(e) => updateBlock(bi, { avatarStyle: e.target.value })}
                  className="input text-xs py-1"
                >
                  {AI_TEACHER_AVATAR_STYLES.map((style) => (
                    <option key={style} value={style}>
                      {style[0].toUpperCase() + style.slice(1)} avatar
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <select
                  value={block.voice}
                  onChange={(e) => updateBlock(bi, { voice: e.target.value })}
                  className="input text-xs py-1"
                >
                  <option value="">Auto voice</option>
                  {AI_TEACHER_NEURAL_VOICES.map((v) => (
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
                  placeholder="Speed (1 = normal)"
                  value={block.rate}
                  onChange={(e) => updateBlock(bi, { rate: e.target.value })}
                  className="input text-xs py-1"
                />
              </div>
              <p className="text-[11px] text-ink/40">
                Speed and voice also drive the generated neural audio below. If a student's browser
                plays the fallback voice instead, it picks its own closest match for the chosen language.
              </p>
              <textarea
                placeholder="Instructions shown to the student (optional)"
                value={block.instructions}
                onChange={(e) => updateBlock(bi, { instructions: e.target.value })}
                className="input h-12 text-sm"
              />

              <label className="flex items-center gap-1.5 text-[11px] text-ink/60">
                <input
                  type="checkbox"
                  checked={block.showScript}
                  onChange={(e) => updateBlock(bi, { showScript: e.target.checked })}
                />
                Also show the lesson script as readable text (optional — leave unchecked for audio-only)
              </label>

              <div className="border border-line/70 rounded-sm p-2 bg-chalk space-y-1.5">
                <p className="text-[11px] font-mono uppercase tracking-wide text-ink/50">
                  Teacher Voice (neural, generated once)
                </p>
                {!block.id ? (
                  <p className="text-[11px] text-ink/40">Save the class first, then generate the voice.</p>
                ) : (
                  <>
                    {(() => {
                      const ui = audioUi[block.id] ?? {};
                      const status = block.audioStatus ?? 'none';
                      return (
                        <>
                          <p className="text-[11px]">
                            {ui.generating || status === 'generating' ? (
                              <span className="text-amber">Generating…</span>
                            ) : status === 'ready' && block.audioStale ? (
                              <span className="text-coral">⚠ Script changed — regenerate voice</span>
                            ) : status === 'ready' ? (
                              <span className="text-sage">
                                ✓ Ready{block.audioVoice ? ` (${block.audioVoice})` : ''}
                              </span>
                            ) : status === 'failed' ? (
                              <span className="text-coral">
                                ✗ Generation failed{block.audioError ? `: ${block.audioError}` : ''}
                              </span>
                            ) : (
                              <span className="text-ink/40">Not generated</span>
                            )}
                          </p>
                          {ui.error && <p className="text-[11px] text-coral">{ui.error}</p>}
                          <div className="flex flex-wrap items-center gap-1.5">
                            <button
                              type="button"
                              disabled={ui.generating || status === 'generating' || !block.content.trim()}
                              onClick={() => generateVoice(bi)}
                              className="btn-outline text-[11px] px-2 py-1"
                            >
                              {status === 'ready' || status === 'failed' ? 'Regenerate Voice' : 'Generate Voice'}
                            </button>
                            {status === 'ready' && !block.audioStale && (
                              <button
                                type="button"
                                onClick={() => previewVoice(block.id!)}
                                className="btn-outline text-[11px] px-2 py-1"
                              >
                                Load preview
                              </button>
                            )}
                          </div>
                          {ui.previewUrl && (
                            <audio controls src={ui.previewUrl} className="w-full h-8 mt-1" />
                          )}
                        </>
                      );
                    })()}
                  </>
                )}
              </div>
            </div>
          ) : (
            <>
              <input
                placeholder={
                  block.type === 'video'
                    ? 'YouTube, Vimeo, or direct .mp4 link'
                    : block.type === 'image'
                      ? 'Image URL'
                      : 'Resource/download URL'
                }
                value={block.content}
                onChange={(e) => updateBlock(bi, { content: e.target.value })}
                className="input text-sm"
              />
              {block.type === 'video' &&
                block.content.trim() &&
                (() => {
                  const preview = getVideoEmbed(block.content.trim());
                  return preview ? (
                    <div className="space-y-1.5">
                      <p className="text-[11px] text-sage">✓ Valid video link</p>
                      {preview.kind !== 'file' && (
                        <div className="w-full aspect-video rounded-sm overflow-hidden bg-black">
                          <iframe
                            src={preview.src}
                            title="Video preview"
                            className="w-full h-full"
                            allowFullScreen
                          />
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-[11px] text-coral">
                      Please enter a valid YouTube, Vimeo, or direct video URL.
                    </p>
                  );
                })()}
              <input
                placeholder={
                  block.type === 'video'
                    ? 'Video title/caption (optional)'
                    : block.type === 'image'
                      ? 'Caption/alt text (optional)'
                      : 'Label (optional, e.g. Exercise starter files)'
                }
                value={block.label}
                onChange={(e) => updateBlock(bi, { label: e.target.value })}
                className="input text-xs py-1"
              />
              {block.type === 'video' && (
                <div className="space-y-1.5">
                  <label className="flex items-center gap-1.5 text-[11px] text-ink/60">
                    <input
                      type="checkbox"
                      checked={block.guidedTeacherEnabled}
                      onChange={(e) => updateBlock(bi, { guidedTeacherEnabled: e.target.checked })}
                    />
                    Enable AI Robot Teacher (pauses the video at set times to explain what's happening)
                  </label>
                  {block.guidedTeacherEnabled && (
                    <>
                      {block.content.trim() && getVideoEmbed(block.content.trim())?.kind !== 'file' && (
                        <p className="text-[11px] text-coral">
                          Guided narration only works with a direct video file (.mp4/.webm/etc).
                          YouTube/Vimeo links will play normally without automatic pauses.
                        </p>
                      )}
                      <GuidedTeacherCueEditor
                        classId={classId}
                        blockId={block.id}
                        cues={block.guidedTeacherCues}
                        onChange={(cues) => updateBlock(bi, { guidedTeacherCues: cues })}
                      />
                      <GuidedVideoGenerator
                        classId={classId}
                        blockId={block.id}
                        cues={block.guidedTeacherCues}
                        generation={block.guidedVideoGeneration}
                        stale={block.videoStale}
                        onStatusChange={(generation) =>
                          updateBlock(bi, {
                            guidedVideoGeneration: generation,
                            videoStale: generation.status === 'ready' ? false : block.videoStale,
                          })
                        }
                        onCuesRefresh={(cues) => updateBlock(bi, { guidedTeacherCues: cues })}
                      />
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange((prev) => [...prev, emptyBlock()])}
        className="text-xs font-semibold text-amber hover:text-coral"
      >
        + Add content
      </button>
    </div>
  );
}
