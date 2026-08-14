import { useEffect, useState } from 'react';
import {
  AiTeacherAudioStatus,
  api,
  ClassItem,
  ContentBlockType,
  NewExtraVideo,
  RegistrationDetail,
} from '../lib/api';
import { formatCountdown } from '../lib/countdown';
import { useLanguage } from '../lib/i18n';
import { getVideoEmbed } from '../lib/video';
import { formatClockTimestamp, parseClockTimestamp } from '../lib/guidedVideo';
import ConfirmDialog from './ConfirmDialog';
import GuidedTeacherCueEditor, { TeacherCueForm } from './GuidedTeacherCueEditor';

const BLOCK_TYPES: { value: ContentBlockType; label: string }[] = [
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

interface ContentBlockForm {
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
}

interface TopicForm {
  id?: string;
  title: string;
  description: string;
  contentBlocks: ContentBlockForm[];
}

interface ModuleForm {
  id?: string;
  title: string;
  objective: string;
  project: string;
  topics: TopicForm[];
}

type ExtraVideoForm = Omit<NewExtraVideo, 'pdfUrl' | 'pdfName' | 'imageUrl' | 'imageName'> & {
  pdfUrl: string;
  pdfName: string;
  imageUrl: string;
  imageName: string;
  pdfFile?: File | null;
  imageFile?: File | null;
  pdfRemoved?: boolean;
  imageRemoved?: boolean;
};

function emptyExtraVideo(): ExtraVideoForm {
  return {
    title: '',
    url: '',
    notes: '',
    pdfUrl: '',
    pdfName: '',
    imageUrl: '',
    imageName: '',
    pdfFile: null,
    imageFile: null,
    pdfRemoved: false,
    imageRemoved: false,
  };
}

function emptyBlock(): ContentBlockForm {
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

function emptyTopic(): TopicForm {
  return { title: '', description: '', contentBlocks: [] };
}

function emptyModule(): ModuleForm {
  return { title: '', objective: '', project: '', topics: [emptyTopic()] };
}

function emptyForm() {
  return {
    title: '',
    description: '',
    imageUrl: '',
    videoUrl: '',
    videoNotes: '',
    videoPdfUrl: '',
    videoPdfName: '',
    videoResourceImageUrl: '',
    videoResourceImageName: '',
    videoPdfFile: null as File | null,
    videoImageFile: null as File | null,
    videoPdfRemoved: false,
    videoImageRemoved: false,
    extraVideos: [emptyExtraVideo()] as ExtraVideoForm[],
    curriculumModules: [] as ModuleForm[],
    classDate: '',
    zoomLink: '',
    price: '',
    language: '' as '' | 'en' | 'fr' | 'ht',
    allowedEmails: [''] as string[],
  };
}

async function resolveResourceUrl(
  file: File | null | undefined,
  existingUrl: string | undefined,
  removed?: boolean,
): Promise<string | null | undefined> {
  if (file) return (await api.uploadClassResource(file)).url;
  if (removed) return null;
  return existingUrl || undefined;
}

function resolveResourceName(name: string, removed?: boolean): string | null | undefined {
  if (removed) return null;
  return name.trim() || undefined;
}

// Convert an ISO date string to the local "YYYY-MM-DDTHH:mm" format a
// datetime-local input expects, using the browser's local timezone.
function toDatetimeLocal(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}


export default function ClassManager({
  isPaid,
  heading,
  listHeading,
  emptyStateLabel,
  classes,
  onChanged,
}: {
  isPaid: boolean;
  heading: string;
  listHeading: string;
  emptyStateLabel: string;
  classes: ClassItem[];
  onChanged: () => void;
}) {
  const { t } = useLanguage();
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [pendingDelete, setPendingDelete] = useState<ClassItem | null>(null);
  const [expandedClassId, setExpandedClassId] = useState<string | null>(null);
  const [registrantsByClass, setRegistrantsByClass] = useState<Record<string, RegistrationDetail[]>>({});
  const [loadingRegistrants, setLoadingRegistrants] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [audioUi, setAudioUi] = useState<
    Record<string, { generating?: boolean; error?: string; previewUrl?: string }>
  >({});

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  // Generates (or regenerates) neural voice audio for one ai_teacher block.
  // Requires the block to already exist server-side (i.e. the class has
  // been saved at least once since this block was added) — otherwise
  // there's nothing to attach the audio metadata to.
  const generateVoice = async (mi: number, ti: number, bi: number) => {
    if (!editingId) return;
    const block = form.curriculumModules[mi].topics[ti].contentBlocks[bi];
    if (!block.id) return;
    const blockId = block.id;
    setAudioUi((s) => ({ ...s, [blockId]: { generating: true } }));
    try {
      const result = await api.generateAiTeacherAudio(editingId, blockId, {
        script: block.content.trim(),
        label: block.label.trim() || undefined,
        language: (block.language || 'en') as 'en' | 'fr' | 'ht',
        voice: block.voice.trim() || undefined,
        rate: block.rate.trim() ? parseFloat(block.rate) : undefined,
      });
      const next = [...form.curriculumModules];
      const topics = [...next[mi].topics];
      const blocks = [...topics[ti].contentBlocks];
      blocks[bi] = {
        ...blocks[bi],
        content: result.content ?? blocks[bi].content,
        label: result.label ?? blocks[bi].label,
        audioStatus: result.audioStatus,
        audioProvider: result.audioProvider,
        audioVoice: result.audioVoice,
        audioGeneratedAt: result.audioGeneratedAt,
        audioError: result.audioError,
        audioStale: false,
      };
      topics[ti] = { ...topics[ti], contentBlocks: blocks };
      next[mi] = { ...next[mi], topics };
      setForm({ ...form, curriculumModules: next });
      setAudioUi((s) => ({ ...s, [blockId]: { generating: false } }));
    } catch (err) {
      setAudioUi((s) => ({
        ...s,
        [blockId]: { generating: false, error: err instanceof Error ? err.message : 'Generation failed' },
      }));
    }
  };

  const previewVoice = async (blockId: string) => {
    if (!editingId) return;
    try {
      const url = await api.previewAiTeacherAudio(editingId, blockId);
      setAudioUi((s) => ({ ...s, [blockId]: { ...s[blockId], previewUrl: url, error: undefined } }));
    } catch {
      setAudioUi((s) => ({ ...s, [blockId]: { ...s[blockId], error: 'No generated audio available yet.' } }));
    }
  };

  const toggleRegistrants = async (classId: string) => {
    if (expandedClassId === classId) {
      setExpandedClassId(null);
      return;
    }
    setExpandedClassId(classId);
    if (!registrantsByClass[classId]) {
      setLoadingRegistrants(classId);
      try {
        const list = await api.listRegistrations(classId);
        setRegistrantsByClass((current) => ({ ...current, [classId]: list }));
      } finally {
        setLoadingRegistrants(null);
      }
    }
  };

  const startEdit = (c: ClassItem) => {
    setEditingId(c.id);
    setError('');
    setForm({
      title: c.title,
      description: c.description,
      imageUrl: c.imageUrl,
      videoUrl: c.videoUrl ?? '',
      videoNotes: c.videoNotes ?? '',
      videoPdfUrl: c.videoPdfUrl ?? '',
      videoPdfName: c.videoPdfName ?? '',
      videoResourceImageUrl: c.videoResourceImageUrl ?? '',
      videoResourceImageName: c.videoResourceImageName ?? '',
      videoPdfFile: null,
      videoImageFile: null,
      videoPdfRemoved: false,
      videoImageRemoved: false,
      extraVideos: c.extraVideos?.length
        ? c.extraVideos.map((v) => ({
            id: v.id,
            title: v.title,
            url: v.url,
            notes: v.notes ?? '',
            pdfUrl: v.pdfUrl ?? '',
            pdfName: v.pdfName ?? '',
            imageUrl: v.imageUrl ?? '',
            imageName: v.imageName ?? '',
            pdfFile: null,
            imageFile: null,
            pdfRemoved: false,
            imageRemoved: false,
          }))
        : [emptyExtraVideo()],
      curriculumModules: c.curriculumModules?.length
        ? c.curriculumModules.map((m) => ({
            id: m.id,
            title: m.title ?? '',
            objective: m.objective ?? '',
            project: m.project ?? '',
            topics: m.topics.length
              ? m.topics.map((t) => ({
                  id: t.id,
                  title: t.title ?? '',
                  description: t.description ?? '',
                  contentBlocks: (t.contentBlocks ?? []).map((b) => ({
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
                    guidedTeacherCues: (b.guidedTeacherCues ?? []).map((cue) => ({
                      id: cue.id,
                      timestamp: formatClockTimestamp(cue.timestampSeconds),
                      script: cue.script,
                      language: cue.language ?? '',
                      voice: cue.voice ?? '',
                      rate: cue.rate != null ? String(cue.rate) : '1',
                      audioStatus: cue.audioStatus,
                      audioVoice: cue.audioVoice,
                      audioError: cue.audioError,
                      audioStale: cue.audioStale,
                    })),
                  })),
                }))
              : [emptyTopic()],
          }))
        : [],
      classDate: toDatetimeLocal(c.classDate),
      zoomLink: c.zoomLink ?? '',
      price: c.priceCents != null ? (c.priceCents / 100).toString() : '',
      language: c.language ?? '',
      allowedEmails: c.allowedEmails?.length ? c.allowedEmails : [''],
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setError('');
    setForm(emptyForm());
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const [videoPdfUrl, videoResourceImageUrl] = await Promise.all([
        resolveResourceUrl(form.videoPdfFile, form.videoPdfUrl, form.videoPdfRemoved),
        resolveResourceUrl(form.videoImageFile, form.videoResourceImageUrl, form.videoImageRemoved),
      ]);
      const videoPdfName = resolveResourceName(form.videoPdfName, form.videoPdfRemoved);
      const videoResourceImageName = resolveResourceName(form.videoResourceImageName, form.videoImageRemoved);

      const extraVideos = (
        await Promise.all(
          form.extraVideos.map(async (v) => ({
            id: v.id,
            title: v.title.trim(),
            url: v.url.trim(),
            notes: (v.notes ?? '').trim(),
            pdfUrl: await resolveResourceUrl(v.pdfFile, v.pdfUrl, v.pdfRemoved),
            pdfName: resolveResourceName(v.pdfName, v.pdfRemoved),
            imageUrl: await resolveResourceUrl(v.imageFile, v.imageUrl, v.imageRemoved),
            imageName: resolveResourceName(v.imageName, v.imageRemoved),
          })),
        )
      )
        .filter((v) => v.url)
        .map((v, i) => ({
          id: v.id,
          title: v.title || `Video ${i + 2}`,
          url: v.url,
          notes: v.notes || undefined,
          pdfUrl: v.pdfUrl,
          pdfName: v.pdfName,
          imageUrl: v.imageUrl,
          imageName: v.imageName,
        }));

      const curriculumModules = form.curriculumModules
        .map((m) => ({
          id: m.id,
          title: m.title.trim() || undefined,
          objective: m.objective.trim() || undefined,
          project: m.project.trim() || undefined,
          topics: m.topics
            .map((t) => ({
              id: t.id,
              title: t.title.trim() || undefined,
              description: t.description.trim() || undefined,
              contentBlocks: t.contentBlocks
                .map((b) => ({
                  id: b.id,
                  type: b.type,
                  content: b.content.trim() || undefined,
                  label: b.label.trim() || undefined,
                  ...(b.type === 'ai_teacher'
                    ? {
                        language: (b.language || undefined) as 'en' | 'fr' | 'ht' | undefined,
                        voice: b.voice.trim() || undefined,
                        rate: b.rate.trim() ? parseFloat(b.rate) : undefined,
                        avatarStyle: b.avatarStyle || undefined,
                        instructions: b.instructions.trim() || undefined,
                        showScript: b.showScript,
                      }
                    : {}),
                  ...(b.type === 'video'
                    ? {
                        guidedTeacherEnabled: b.guidedTeacherEnabled,
                        guidedTeacherCues: b.guidedTeacherCues
                          .map((cue) => ({
                            id: cue.id,
                            timestampSeconds: parseClockTimestamp(cue.timestamp) ?? 0,
                            script: cue.script.trim(),
                            language: (cue.language || undefined) as 'en' | 'fr' | 'ht' | undefined,
                            voice: cue.voice.trim() || undefined,
                            rate: cue.rate.trim() ? parseFloat(cue.rate) : undefined,
                          }))
                          .filter((cue) => cue.script),
                      }
                    : {}),
                }))
                // A divider needs no content to be meaningful; every other
                // block type does.
                .filter((b) => b.type === 'divider' || b.content),
            }))
            .filter((t) => t.title || t.description || t.contentBlocks.length),
        }))
        .filter((m) => m.title || m.objective || m.project || m.topics.length);

      const payload = {
        title: form.title,
        description: form.description,
        imageUrl: form.imageUrl,
        // The datetime-local input has no timezone attached — resolve it
        // against the browser's own timezone before sending, so the server
        // (which may run in a different timezone) can't reinterpret it.
        classDate: form.classDate ? new Date(form.classDate).toISOString() : undefined,
        // Blank always means "remove it" for these plain text fields — they
        // have no separate "untouched" state like the file uploads below,
        // so null (clear) vs undefined (leave alone) has no purpose.
        zoomLink: form.zoomLink.trim() || null,
        videoUrl: form.videoUrl.trim() || null,
        videoNotes: form.videoNotes.trim() || null,
        videoPdfUrl,
        videoPdfName,
        videoResourceImageUrl,
        videoResourceImageName,
        extraVideos: extraVideos.length ? extraVideos : undefined,
        curriculumModules: curriculumModules.length ? curriculumModules : undefined,
        isPaid,
        language: form.language || null,
        ...(isPaid
          ? {
              allowedEmails: form.allowedEmails.map((e) => e.trim()).filter(Boolean),
              priceCents: form.price.trim() ? Math.round(parseFloat(form.price) * 100) : null,
            }
          : {}),
      };
      if (editingId) {
        await api.updateClass(editingId, payload);
      } else {
        await api.createClass(payload);
      }
      setEditingId(null);
      setForm(emptyForm());
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save class');
    } finally {
      setSaving(false);
    }
  };

  const togglePast = async (c: ClassItem) => {
    await api.markPast(c.id, !c.isPast);
    onChanged();
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    await api.deleteClass(pendingDelete.id);
    if (editingId === pendingDelete.id) cancelEdit();
    setPendingDelete(null);
    onChanged();
  };

  const upcomingCount = classes.filter((c) => !c.isPast).length;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10 grid md:grid-cols-[320px_1fr] gap-6 md:gap-10">
      <form onSubmit={submit} className="bg-surface border border-line rounded-sm p-5 h-fit md:sticky md:top-24">
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-display text-xl text-ink">
            {editingId ? 'Edit class' : heading}
          </h2>
          {editingId && (
            <button
              type="button"
              onClick={cancelEdit}
              className="text-xs font-mono text-ink/50 hover:text-ink"
            >
              Cancel
            </button>
          )}
        </div>
        <p className="text-xs text-ink/50 mb-4">
          {editingId
            ? 'Changes are saved to the live class page.'
            : isPaid
              ? 'Publishes immediately, but only granted emails can register.'
              : 'Publishes immediately to the public site.'}
        </p>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-mono uppercase tracking-wide text-ink/50 mb-1">
              Title
            </label>
            <input
              required
              placeholder="Advanced React Patterns"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="input"
            />
          </div>
          <div>
            <label className="block text-xs font-mono uppercase tracking-wide text-ink/50 mb-1">
              Description
            </label>
            <textarea
              required
              placeholder="What will people learn?"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="input h-24"
            />
          </div>
          <div>
            <label className="block text-xs font-mono uppercase tracking-wide text-ink/50 mb-1">
              Image URL
            </label>
            <input
              required
              placeholder="https://…"
              value={form.imageUrl}
              onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
              className="input"
            />
            {form.imageUrl && (
              <img
                src={form.imageUrl}
                alt=""
                className="w-full h-24 object-cover rounded-sm border border-line mt-2"
                onError={(e) => (e.currentTarget.style.display = 'none')}
                onLoad={(e) => (e.currentTarget.style.display = 'block')}
              />
            )}
          </div>
          <div>
            <label className="block text-xs font-mono uppercase tracking-wide text-ink/50 mb-1">
              Marketing video URL <span className="normal-case text-ink/30">(optional)</span>
            </label>
            <input
              placeholder="YouTube, Vimeo, or direct .mp4 link"
              value={form.videoUrl}
              onChange={(e) => setForm({ ...form, videoUrl: e.target.value })}
              className="input"
            />
            <p className="text-[11px] text-ink/40 mt-1">
              Shown instead of the image on the class page when set.
            </p>
          </div>
          <div>
            <label className="block text-xs font-mono uppercase tracking-wide text-ink/50 mb-1">
              Study notes for this video{' '}
              <span className="normal-case text-ink/30">(optional)</span>
            </label>
            <textarea
              placeholder="Documentation, links, or reading material for students to study alongside the video"
              value={form.videoNotes}
              onChange={(e) => setForm({ ...form, videoNotes: e.target.value })}
              className="input h-20"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wide text-ink/50 mb-1">
                PDF <span className="normal-case text-ink/30">(optional)</span>
              </label>
              <input
                type="file"
                accept="application/pdf"
                onChange={(e) =>
                  setForm({
                    ...form,
                    videoPdfFile: e.target.files?.[0] ?? null,
                    videoPdfRemoved: false,
                  })
                }
                className="input text-xs file:mr-2"
              />
              {(form.videoPdfFile || (form.videoPdfUrl && !form.videoPdfRemoved)) && (
                <>
                  <p className="text-[11px] text-sage mt-1">
                    ✓ {form.videoPdfFile?.name ?? 'PDF attached'}
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    <input
                      placeholder="Label (optional)"
                      value={form.videoPdfName}
                      onChange={(e) => setForm({ ...form, videoPdfName: e.target.value })}
                      className="input text-xs py-1 flex-1"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setForm({
                          ...form,
                          videoPdfFile: null,
                          videoPdfUrl: '',
                          videoPdfName: '',
                          videoPdfRemoved: true,
                        })
                      }
                      className="text-[11px] text-coral hover:underline flex-shrink-0"
                    >
                      ✕ Remove
                    </button>
                  </div>
                </>
              )}
            </div>
            <div>
              <label className="block text-xs font-mono uppercase tracking-wide text-ink/50 mb-1">
                Picture <span className="normal-case text-ink/30">(optional)</span>
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) =>
                  setForm({
                    ...form,
                    videoImageFile: e.target.files?.[0] ?? null,
                    videoImageRemoved: false,
                  })
                }
                className="input text-xs file:mr-2"
              />
              {(form.videoImageFile || (form.videoResourceImageUrl && !form.videoImageRemoved)) && (
                <>
                  <p className="text-[11px] text-sage mt-1">
                    ✓ {form.videoImageFile?.name ?? 'Picture attached'}
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    <input
                      placeholder="Label (optional)"
                      value={form.videoResourceImageName}
                      onChange={(e) => setForm({ ...form, videoResourceImageName: e.target.value })}
                      className="input text-xs py-1 flex-1"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setForm({
                          ...form,
                          videoImageFile: null,
                          videoResourceImageUrl: '',
                          videoResourceImageName: '',
                          videoImageRemoved: true,
                        })
                      }
                      className="text-[11px] text-coral hover:underline flex-shrink-0"
                    >
                      ✕ Remove
                    </button>
                  </div>
                </>
              )}
            </div>
            <p className="col-span-2 text-[11px] text-ink/40">
              Downloadable resources for students, shown with the main video.
            </p>
          </div>
          <div>
            <label className="block text-xs font-mono uppercase tracking-wide text-ink/50 mb-1">
              Additional videos <span className="normal-case text-ink/30">(optional)</span>
            </label>
            <div className="space-y-3">
              {form.extraVideos.map((video, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <div className="flex-1 space-y-1.5">
                    <input
                      placeholder={`Title (e.g. "Behind the scenes")`}
                      value={video.title}
                      onChange={(e) => {
                        const next = [...form.extraVideos];
                        next[i] = { ...next[i], title: e.target.value };
                        setForm({ ...form, extraVideos: next });
                      }}
                      className="input"
                    />
                    <input
                      placeholder="YouTube, Vimeo, or direct .mp4 link"
                      value={video.url}
                      onChange={(e) => {
                        const next = [...form.extraVideos];
                        next[i] = { ...next[i], url: e.target.value };
                        setForm({ ...form, extraVideos: next });
                      }}
                      className="input"
                    />
                    <textarea
                      placeholder="Study notes for this video (optional)"
                      value={video.notes ?? ''}
                      onChange={(e) => {
                        const next = [...form.extraVideos];
                        next[i] = { ...next[i], notes: e.target.value };
                        setForm({ ...form, extraVideos: next });
                      }}
                      className="input h-16 text-sm"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <input
                          type="file"
                          accept="application/pdf"
                          onChange={(e) => {
                            const next = [...form.extraVideos];
                            next[i] = {
                              ...next[i],
                              pdfFile: e.target.files?.[0] ?? null,
                              pdfRemoved: false,
                            };
                            setForm({ ...form, extraVideos: next });
                          }}
                          className="input text-xs file:mr-2"
                        />
                        {(video.pdfFile || (video.pdfUrl && !video.pdfRemoved)) && (
                          <>
                            <p className="text-[11px] text-sage mt-1">
                              ✓ {video.pdfFile?.name ?? 'PDF attached'}
                            </p>
                            <div className="flex items-center gap-1 mt-1">
                              <input
                                placeholder="Label (optional)"
                                value={video.pdfName}
                                onChange={(e) => {
                                  const next = [...form.extraVideos];
                                  next[i] = { ...next[i], pdfName: e.target.value };
                                  setForm({ ...form, extraVideos: next });
                                }}
                                className="input text-xs py-1 flex-1"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const next = [...form.extraVideos];
                                  next[i] = {
                                    ...next[i],
                                    pdfFile: null,
                                    pdfUrl: '',
                                    pdfName: '',
                                    pdfRemoved: true,
                                  };
                                  setForm({ ...form, extraVideos: next });
                                }}
                                className="text-[11px] text-coral hover:underline flex-shrink-0"
                              >
                                ✕ Remove
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                      <div>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const next = [...form.extraVideos];
                            next[i] = {
                              ...next[i],
                              imageFile: e.target.files?.[0] ?? null,
                              imageRemoved: false,
                            };
                            setForm({ ...form, extraVideos: next });
                          }}
                          className="input text-xs file:mr-2"
                        />
                        {(video.imageFile || (video.imageUrl && !video.imageRemoved)) && (
                          <>
                            <p className="text-[11px] text-sage mt-1">
                              ✓ {video.imageFile?.name ?? 'Picture attached'}
                            </p>
                            <div className="flex items-center gap-1 mt-1">
                              <input
                                placeholder="Label (optional)"
                                value={video.imageName}
                                onChange={(e) => {
                                  const next = [...form.extraVideos];
                                  next[i] = { ...next[i], imageName: e.target.value };
                                  setForm({ ...form, extraVideos: next });
                                }}
                                className="input text-xs py-1 flex-1"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const next = [...form.extraVideos];
                                  next[i] = {
                                    ...next[i],
                                    imageFile: null,
                                    imageUrl: '',
                                    imageName: '',
                                    imageRemoved: true,
                                  };
                                  setForm({ ...form, extraVideos: next });
                                }}
                                className="text-[11px] text-coral hover:underline flex-shrink-0"
                              >
                                ✕ Remove
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  {form.extraVideos.length > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        setForm({
                          ...form,
                          extraVideos: form.extraVideos.filter((_, j) => j !== i),
                        })
                      }
                      aria-label="Remove this video"
                      className="btn-outline text-xs px-2.5 flex-shrink-0"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() =>
                setForm({
                  ...form,
                  extraVideos: [...form.extraVideos, emptyExtraVideo()],
                })
              }
              className="text-xs font-semibold text-amber hover:text-coral mt-2"
            >
              + Add another video
            </button>
            <p className="text-[11px] text-ink/40 mt-1">
              Appear as an expandable section below the main video on the class page.
            </p>
          </div>

          <div>
            <label className="block text-xs font-mono uppercase tracking-wide text-ink/50 mb-1">
              Course content <span className="normal-case text-ink/30">(optional)</span>
            </label>
            <p className="text-[11px] text-ink/40 mb-2">
              Organize the course into modules → topics → lesson content. Module/topic titles
              and descriptions are shown publicly as a curriculum preview. The lesson content
              inside each topic (text, video, etc.) stays protected until a student registers
              or unlocks the class.
            </p>
            <div className="space-y-3">
              {form.curriculumModules.map((mod, mi) => (
                <div key={mi} className="border border-line rounded-sm p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono uppercase tracking-wide text-amber">
                      M{mi + 1}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={mi === 0}
                        onClick={() => {
                          const next = [...form.curriculumModules];
                          [next[mi - 1], next[mi]] = [next[mi], next[mi - 1]];
                          setForm({ ...form, curriculumModules: next });
                        }}
                        aria-label="Move module up"
                        className="btn-outline text-xs px-2 py-0.5 disabled:opacity-30"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        disabled={mi === form.curriculumModules.length - 1}
                        onClick={() => {
                          const next = [...form.curriculumModules];
                          [next[mi + 1], next[mi]] = [next[mi], next[mi + 1]];
                          setForm({ ...form, curriculumModules: next });
                        }}
                        aria-label="Move module down"
                        className="btn-outline text-xs px-2 py-0.5 disabled:opacity-30"
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setForm({
                            ...form,
                            curriculumModules: form.curriculumModules.filter((_, j) => j !== mi),
                          })
                        }
                        aria-label="Remove this module"
                        className="btn-danger-outline text-xs px-2 py-0.5"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                  <input
                    placeholder="Module title (e.g. Web Development Fundamentals)"
                    value={mod.title}
                    onChange={(e) => {
                      const next = [...form.curriculumModules];
                      next[mi] = { ...next[mi], title: e.target.value };
                      setForm({ ...form, curriculumModules: next });
                    }}
                    className="input"
                  />
                  <textarea
                    placeholder="Objective (optional)"
                    value={mod.objective}
                    onChange={(e) => {
                      const next = [...form.curriculumModules];
                      next[mi] = { ...next[mi], objective: e.target.value };
                      setForm({ ...form, curriculumModules: next });
                    }}
                    className="input h-16 text-sm"
                  />

                  <div className="space-y-2">
                    <p className="text-[11px] font-mono uppercase tracking-wide text-ink/40">
                      Topics
                    </p>
                    {mod.topics.map((topic, ti) => (
                      <div key={ti} className="border border-line/70 rounded-sm p-2.5 space-y-2 bg-chalk">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-mono text-ink/40">Topic {ti + 1}</span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              disabled={ti === 0}
                              onClick={() => {
                                const next = [...form.curriculumModules];
                                const topics = [...next[mi].topics];
                                [topics[ti - 1], topics[ti]] = [topics[ti], topics[ti - 1]];
                                next[mi] = { ...next[mi], topics };
                                setForm({ ...form, curriculumModules: next });
                              }}
                              aria-label="Move topic up"
                              className="btn-outline text-xs px-2 py-0.5 disabled:opacity-30"
                            >
                              ↑
                            </button>
                            <button
                              type="button"
                              disabled={ti === mod.topics.length - 1}
                              onClick={() => {
                                const next = [...form.curriculumModules];
                                const topics = [...next[mi].topics];
                                [topics[ti + 1], topics[ti]] = [topics[ti], topics[ti + 1]];
                                next[mi] = { ...next[mi], topics };
                                setForm({ ...form, curriculumModules: next });
                              }}
                              aria-label="Move topic down"
                              className="btn-outline text-xs px-2 py-0.5 disabled:opacity-30"
                            >
                              ↓
                            </button>
                            {mod.topics.length > 1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const next = [...form.curriculumModules];
                                  next[mi] = {
                                    ...next[mi],
                                    topics: next[mi].topics.filter((_, j) => j !== ti),
                                  };
                                  setForm({ ...form, curriculumModules: next });
                                }}
                                aria-label="Remove this topic"
                                className="btn-danger-outline text-xs px-2 py-0.5"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        </div>
                        <input
                          placeholder="Topic title (e.g. Introduction to HTML)"
                          value={topic.title}
                          onChange={(e) => {
                            const next = [...form.curriculumModules];
                            const topics = [...next[mi].topics];
                            topics[ti] = { ...topics[ti], title: e.target.value };
                            next[mi] = { ...next[mi], topics };
                            setForm({ ...form, curriculumModules: next });
                          }}
                          className="input text-sm"
                        />
                        <textarea
                          placeholder="Topic description (optional)"
                          value={topic.description}
                          onChange={(e) => {
                            const next = [...form.curriculumModules];
                            const topics = [...next[mi].topics];
                            topics[ti] = { ...topics[ti], description: e.target.value };
                            next[mi] = { ...next[mi], topics };
                            setForm({ ...form, curriculumModules: next });
                          }}
                          className="input h-12 text-sm"
                        />

                        <div className="space-y-1.5">
                          <p className="text-[10px] font-mono uppercase tracking-wide text-ink/40">
                            Lesson content — appears in this exact order
                          </p>
                          {topic.contentBlocks.map((block, bi) => (
                            <div key={bi} className="border border-line rounded-sm p-2 bg-surface space-y-1.5">
                              <div className="flex items-center gap-1.5">
                                <select
                                  value={block.type}
                                  onChange={(e) => {
                                    const next = [...form.curriculumModules];
                                    const topics = [...next[mi].topics];
                                    const blocks = [...topics[ti].contentBlocks];
                                    blocks[bi] = { ...blocks[bi], type: e.target.value as ContentBlockType };
                                    topics[ti] = { ...topics[ti], contentBlocks: blocks };
                                    next[mi] = { ...next[mi], topics };
                                    setForm({ ...form, curriculumModules: next });
                                  }}
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
                                  onClick={() => {
                                    const next = [...form.curriculumModules];
                                    const topics = [...next[mi].topics];
                                    const blocks = [...topics[ti].contentBlocks];
                                    [blocks[bi - 1], blocks[bi]] = [blocks[bi], blocks[bi - 1]];
                                    topics[ti] = { ...topics[ti], contentBlocks: blocks };
                                    next[mi] = { ...next[mi], topics };
                                    setForm({ ...form, curriculumModules: next });
                                  }}
                                  aria-label="Move content block up"
                                  className="btn-outline text-xs px-2 py-0.5 disabled:opacity-30 flex-shrink-0"
                                >
                                  ↑
                                </button>
                                <button
                                  type="button"
                                  disabled={bi === topic.contentBlocks.length - 1}
                                  onClick={() => {
                                    const next = [...form.curriculumModules];
                                    const topics = [...next[mi].topics];
                                    const blocks = [...topics[ti].contentBlocks];
                                    [blocks[bi + 1], blocks[bi]] = [blocks[bi], blocks[bi + 1]];
                                    topics[ti] = { ...topics[ti], contentBlocks: blocks };
                                    next[mi] = { ...next[mi], topics };
                                    setForm({ ...form, curriculumModules: next });
                                  }}
                                  aria-label="Move content block down"
                                  className="btn-outline text-xs px-2 py-0.5 disabled:opacity-30 flex-shrink-0"
                                >
                                  ↓
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const next = [...form.curriculumModules];
                                    const topics = [...next[mi].topics];
                                    topics[ti] = {
                                      ...topics[ti],
                                      contentBlocks: topics[ti].contentBlocks.filter((_, j) => j !== bi),
                                    };
                                    next[mi] = { ...next[mi], topics };
                                    setForm({ ...form, curriculumModules: next });
                                  }}
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
                                  placeholder={
                                    block.type === 'exercise'
                                      ? 'Exercise instructions'
                                      : 'Study notes / paragraph text'
                                  }
                                  value={block.content}
                                  onChange={(e) => {
                                    const next = [...form.curriculumModules];
                                    const topics = [...next[mi].topics];
                                    const blocks = [...topics[ti].contentBlocks];
                                    blocks[bi] = { ...blocks[bi], content: e.target.value };
                                    topics[ti] = { ...topics[ti], contentBlocks: blocks };
                                    next[mi] = { ...next[mi], topics };
                                    setForm({ ...form, curriculumModules: next });
                                  }}
                                  className="input h-16 text-sm"
                                />
                              ) : block.type === 'heading' ? (
                                <input
                                  placeholder="Heading text"
                                  value={block.content}
                                  onChange={(e) => {
                                    const next = [...form.curriculumModules];
                                    const topics = [...next[mi].topics];
                                    const blocks = [...topics[ti].contentBlocks];
                                    blocks[bi] = { ...blocks[bi], content: e.target.value };
                                    topics[ti] = { ...topics[ti], contentBlocks: blocks };
                                    next[mi] = { ...next[mi], topics };
                                    setForm({ ...form, curriculumModules: next });
                                  }}
                                  className="input text-sm"
                                />
                              ) : block.type === 'code' ? (
                                <>
                                  <textarea
                                    placeholder="Code"
                                    value={block.content}
                                    onChange={(e) => {
                                      const next = [...form.curriculumModules];
                                      const topics = [...next[mi].topics];
                                      const blocks = [...topics[ti].contentBlocks];
                                      blocks[bi] = { ...blocks[bi], content: e.target.value };
                                      topics[ti] = { ...topics[ti], contentBlocks: blocks };
                                      next[mi] = { ...next[mi], topics };
                                      setForm({ ...form, curriculumModules: next });
                                    }}
                                    className="input h-16 text-sm font-mono"
                                  />
                                  <input
                                    placeholder="Language (optional, e.g. javascript)"
                                    value={block.label}
                                    onChange={(e) => {
                                      const next = [...form.curriculumModules];
                                      const topics = [...next[mi].topics];
                                      const blocks = [...topics[ti].contentBlocks];
                                      blocks[bi] = { ...blocks[bi], label: e.target.value };
                                      topics[ti] = { ...topics[ti], contentBlocks: blocks };
                                      next[mi] = { ...next[mi], topics };
                                      setForm({ ...form, curriculumModules: next });
                                    }}
                                    className="input text-xs py-1"
                                  />
                                </>
                              ) : block.type === 'ai_teacher' ? (
                                <div className="space-y-1.5">
                                  <textarea
                                    placeholder="Lesson script — exactly what the robot will say"
                                    value={block.content}
                                    onChange={(e) => {
                                      const next = [...form.curriculumModules];
                                      const topics = [...next[mi].topics];
                                      const blocks = [...topics[ti].contentBlocks];
                                      blocks[bi] = { ...blocks[bi], content: e.target.value };
                                      topics[ti] = { ...topics[ti], contentBlocks: blocks };
                                      next[mi] = { ...next[mi], topics };
                                      setForm({ ...form, curriculumModules: next });
                                    }}
                                    className="input h-28 text-sm"
                                  />
                                  <input
                                    placeholder="Lesson title (optional)"
                                    value={block.label}
                                    onChange={(e) => {
                                      const next = [...form.curriculumModules];
                                      const topics = [...next[mi].topics];
                                      const blocks = [...topics[ti].contentBlocks];
                                      blocks[bi] = { ...blocks[bi], label: e.target.value };
                                      topics[ti] = { ...topics[ti], contentBlocks: blocks };
                                      next[mi] = { ...next[mi], topics };
                                      setForm({ ...form, curriculumModules: next });
                                    }}
                                    className="input text-xs py-1"
                                  />
                                  <div className="grid grid-cols-2 gap-1.5">
                                    <select
                                      value={block.language}
                                      onChange={(e) => {
                                        const next = [...form.curriculumModules];
                                        const topics = [...next[mi].topics];
                                        const blocks = [...topics[ti].contentBlocks];
                                        blocks[bi] = { ...blocks[bi], language: e.target.value };
                                        topics[ti] = { ...topics[ti], contentBlocks: blocks };
                                        next[mi] = { ...next[mi], topics };
                                        setForm({ ...form, curriculumModules: next });
                                      }}
                                      className="input text-xs py-1"
                                    >
                                      <option value="">Match class language</option>
                                      <option value="en">English</option>
                                      <option value="fr">French</option>
                                      <option value="ht">Creole</option>
                                    </select>
                                    <select
                                      value={block.avatarStyle}
                                      onChange={(e) => {
                                        const next = [...form.curriculumModules];
                                        const topics = [...next[mi].topics];
                                        const blocks = [...topics[ti].contentBlocks];
                                        blocks[bi] = { ...blocks[bi], avatarStyle: e.target.value };
                                        topics[ti] = { ...topics[ti], contentBlocks: blocks };
                                        next[mi] = { ...next[mi], topics };
                                        setForm({ ...form, curriculumModules: next });
                                      }}
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
                                      onChange={(e) => {
                                        const next = [...form.curriculumModules];
                                        const topics = [...next[mi].topics];
                                        const blocks = [...topics[ti].contentBlocks];
                                        blocks[bi] = { ...blocks[bi], voice: e.target.value };
                                        topics[ti] = { ...topics[ti], contentBlocks: blocks };
                                        next[mi] = { ...next[mi], topics };
                                        setForm({ ...form, curriculumModules: next });
                                      }}
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
                                      onChange={(e) => {
                                        const next = [...form.curriculumModules];
                                        const topics = [...next[mi].topics];
                                        const blocks = [...topics[ti].contentBlocks];
                                        blocks[bi] = { ...blocks[bi], rate: e.target.value };
                                        topics[ti] = { ...topics[ti], contentBlocks: blocks };
                                        next[mi] = { ...next[mi], topics };
                                        setForm({ ...form, curriculumModules: next });
                                      }}
                                      className="input text-xs py-1"
                                    />
                                  </div>
                                  <p className="text-[11px] text-ink/40">
                                    Speed and voice also drive the generated neural audio below. If a
                                    student's browser plays the fallback voice instead, it picks its own
                                    closest match for the chosen language.
                                  </p>
                                  <textarea
                                    placeholder="Instructions shown to the student (optional)"
                                    value={block.instructions}
                                    onChange={(e) => {
                                      const next = [...form.curriculumModules];
                                      const topics = [...next[mi].topics];
                                      const blocks = [...topics[ti].contentBlocks];
                                      blocks[bi] = { ...blocks[bi], instructions: e.target.value };
                                      topics[ti] = { ...topics[ti], contentBlocks: blocks };
                                      next[mi] = { ...next[mi], topics };
                                      setForm({ ...form, curriculumModules: next });
                                    }}
                                    className="input h-12 text-sm"
                                  />

                                  <label className="flex items-center gap-1.5 text-[11px] text-ink/60">
                                    <input
                                      type="checkbox"
                                      checked={block.showScript}
                                      onChange={(e) => {
                                        const next = [...form.curriculumModules];
                                        const topics = [...next[mi].topics];
                                        const blocks = [...topics[ti].contentBlocks];
                                        blocks[bi] = { ...blocks[bi], showScript: e.target.checked };
                                        topics[ti] = { ...topics[ti], contentBlocks: blocks };
                                        next[mi] = { ...next[mi], topics };
                                        setForm({ ...form, curriculumModules: next });
                                      }}
                                    />
                                    Also show the lesson script as readable text (optional — leave
                                    unchecked for audio-only)
                                  </label>

                                  <div className="border border-line/70 rounded-sm p-2 bg-chalk space-y-1.5">
                                    <p className="text-[11px] font-mono uppercase tracking-wide text-ink/50">
                                      Teacher Voice (neural, generated once)
                                    </p>
                                    {!block.id ? (
                                      <p className="text-[11px] text-ink/40">
                                        Save the class first, then generate the voice.
                                      </p>
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
                                                  <span className="text-coral">
                                                    ⚠ Script changed — regenerate voice
                                                  </span>
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
                                                  onClick={() => generateVoice(mi, ti, bi)}
                                                  className="btn-outline text-[11px] px-2 py-1"
                                                >
                                                  {status === 'ready' || status === 'failed'
                                                    ? 'Regenerate Voice'
                                                    : 'Generate Voice'}
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
                                    onChange={(e) => {
                                      const next = [...form.curriculumModules];
                                      const topics = [...next[mi].topics];
                                      const blocks = [...topics[ti].contentBlocks];
                                      blocks[bi] = { ...blocks[bi], content: e.target.value };
                                      topics[ti] = { ...topics[ti], contentBlocks: blocks };
                                      next[mi] = { ...next[mi], topics };
                                      setForm({ ...form, curriculumModules: next });
                                    }}
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
                                    onChange={(e) => {
                                      const next = [...form.curriculumModules];
                                      const topics = [...next[mi].topics];
                                      const blocks = [...topics[ti].contentBlocks];
                                      blocks[bi] = { ...blocks[bi], label: e.target.value };
                                      topics[ti] = { ...topics[ti], contentBlocks: blocks };
                                      next[mi] = { ...next[mi], topics };
                                      setForm({ ...form, curriculumModules: next });
                                    }}
                                    className="input text-xs py-1"
                                  />
                                  {block.type === 'video' && (
                                    <div className="space-y-1.5">
                                      <label className="flex items-center gap-1.5 text-[11px] text-ink/60">
                                        <input
                                          type="checkbox"
                                          checked={block.guidedTeacherEnabled}
                                          onChange={(e) => {
                                            const next = [...form.curriculumModules];
                                            const topics = [...next[mi].topics];
                                            const blocks = [...topics[ti].contentBlocks];
                                            blocks[bi] = { ...blocks[bi], guidedTeacherEnabled: e.target.checked };
                                            topics[ti] = { ...topics[ti], contentBlocks: blocks };
                                            next[mi] = { ...next[mi], topics };
                                            setForm({ ...form, curriculumModules: next });
                                          }}
                                        />
                                        Enable AI Robot Teacher (pauses the video at set times to explain
                                        what's happening)
                                      </label>
                                      {block.guidedTeacherEnabled && (
                                        <>
                                          {block.content.trim() &&
                                            getVideoEmbed(block.content.trim())?.kind !== 'file' && (
                                              <p className="text-[11px] text-coral">
                                                Guided narration only works with a direct video file
                                                (.mp4/.webm/etc). YouTube/Vimeo links will play normally
                                                without automatic pauses.
                                              </p>
                                            )}
                                          <GuidedTeacherCueEditor
                                            classId={editingId ?? undefined}
                                            blockId={block.id}
                                            cues={block.guidedTeacherCues}
                                            onChange={(cues) => {
                                              const next = [...form.curriculumModules];
                                              const topics = [...next[mi].topics];
                                              const blocks = [...topics[ti].contentBlocks];
                                              blocks[bi] = { ...blocks[bi], guidedTeacherCues: cues };
                                              topics[ti] = { ...topics[ti], contentBlocks: blocks };
                                              next[mi] = { ...next[mi], topics };
                                              setForm({ ...form, curriculumModules: next });
                                            }}
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
                            onClick={() => {
                              const next = [...form.curriculumModules];
                              const topics = [...next[mi].topics];
                              topics[ti] = {
                                ...topics[ti],
                                contentBlocks: [...topics[ti].contentBlocks, emptyBlock()],
                              };
                              next[mi] = { ...next[mi], topics };
                              setForm({ ...form, curriculumModules: next });
                            }}
                            className="text-xs font-semibold text-amber hover:text-coral"
                          >
                            + Add content
                          </button>
                        </div>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        const next = [...form.curriculumModules];
                        next[mi] = { ...next[mi], topics: [...next[mi].topics, emptyTopic()] };
                        setForm({ ...form, curriculumModules: next });
                      }}
                      className="text-xs font-semibold text-amber hover:text-coral"
                    >
                      + Add topic
                    </button>
                  </div>

                  <textarea
                    placeholder="Project / practical exercise (optional)"
                    value={mod.project}
                    onChange={(e) => {
                      const next = [...form.curriculumModules];
                      next[mi] = { ...next[mi], project: e.target.value };
                      setForm({ ...form, curriculumModules: next });
                    }}
                    className="input h-16 text-sm"
                  />
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() =>
                setForm({
                  ...form,
                  curriculumModules: [...form.curriculumModules, emptyModule()],
                })
              }
              className="text-xs font-semibold text-amber hover:text-coral mt-2"
            >
              + Add module
            </button>
          </div>

          <div>
            <label className="block text-xs font-mono uppercase tracking-wide text-ink/50 mb-1">
              Date &amp; time <span className="normal-case text-ink/30">(optional)</span>
            </label>
            <input
              type="datetime-local"
              value={form.classDate}
              onChange={(e) => setForm({ ...form, classDate: e.target.value })}
              className="input"
            />
          </div>
          <div>
            <label className="block text-xs font-mono uppercase tracking-wide text-ink/50 mb-1">
              Zoom link <span className="normal-case text-ink/30">(optional)</span>
            </label>
            <input
              placeholder="https://zoom.us/j/…"
              value={form.zoomLink}
              onChange={(e) => setForm({ ...form, zoomLink: e.target.value })}
              className="input"
            />
          </div>
          <div>
            <label className="block text-xs font-mono uppercase tracking-wide text-ink/50 mb-1">
              Audience language
            </label>
            <select
              required
              value={form.language}
              onChange={(e) => setForm({ ...form, language: e.target.value as typeof form.language })}
              className="input"
            >
              <option value="" disabled>
                Choose a language…
              </option>
              <option value="en">English</option>
              <option value="fr">French</option>
              <option value="ht">Creole</option>
            </select>
            <p className="text-[11px] text-ink/40 mt-1">
              This class only shows to visitors browsing the site in this language — never in
              the other two.
            </p>
          </div>

          {isPaid && (
            <div>
              <label className="block text-xs font-mono uppercase tracking-wide text-ink/50 mb-1">
                Price (USD) <span className="normal-case text-ink/30">(optional)</span>
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="49.99"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                className="input"
              />
              <p className="text-[11px] text-ink/40 mt-1">
                If set, students can pay with card or PayPal to unlock this class themselves.
                Leave blank to only grant access manually via the email list below.
              </p>
            </div>
          )}

          {isPaid && (
            <div>
              <label className="block text-xs font-mono uppercase tracking-wide text-ink/50 mb-1">
                Emails allowed to access this class
              </label>
              <div className="space-y-1.5">
                {form.allowedEmails.map((email, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <input
                      type="email"
                      placeholder="student@example.com"
                      value={email}
                      onChange={(e) => {
                        const next = [...form.allowedEmails];
                        next[i] = e.target.value;
                        setForm({ ...form, allowedEmails: next });
                      }}
                      className="input flex-1"
                    />
                    {form.allowedEmails.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          setForm({
                            ...form,
                            allowedEmails: form.allowedEmails.filter((_, j) => j !== i),
                          })
                        }
                        aria-label="Remove this email"
                        className="btn-outline text-xs px-2.5 flex-shrink-0"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() =>
                  setForm({ ...form, allowedEmails: [...form.allowedEmails, ''] })
                }
                className="text-xs font-semibold text-amber hover:text-coral mt-2"
              >
                + Add another email
              </button>
              <p className="text-[11px] text-ink/40 mt-1">
                Only these emails can register to unlock this class.
              </p>
            </div>
          )}

          {error && <p className="text-coral text-xs">{error}</p>}
          <button disabled={saving} className="btn-primary w-full text-sm">
            {saving ? 'Saving…' : editingId ? 'Save changes' : isPaid ? 'Publish paid class' : 'Publish class'}
          </button>
        </div>
      </form>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl text-ink">{listHeading}</h2>
          <span className="text-xs font-mono text-ink/50">
            {upcomingCount} upcoming · {classes.length} total
          </span>
        </div>
        <div className="space-y-3">
          {classes.map((c) => (
            <div
              key={c.id}
              className={`bg-surface border rounded-sm p-4 transition-colors ${
                editingId === c.id ? 'border-amber' : 'border-line hover:border-ink/20'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={c.imageUrl}
                    alt=""
                    className="w-14 h-14 sm:w-16 sm:h-16 object-cover rounded-sm border border-line flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-ink truncate">{c.title}</p>
                    <p className="text-xs text-ink/50 font-mono mt-0.5">
                      {c.classDate
                        ? new Date(c.classDate).toLocaleString('en-US', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })
                        : 'No fixed date'}
                      {' · '}
                      {c.registrationCount} registered
                      {c.isPast && <span className="text-sage"> · PAST</span>}
                    </p>
                    {!c.isPast && c.classDate && (
                      <p className="text-xs text-amber font-mono mt-0.5">
                        {formatCountdown(c.classDate, now, t)}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 sm:flex-shrink-0 flex-wrap">
                  <button
                    onClick={() => toggleRegistrants(c.id)}
                    className="btn-outline text-xs px-2 py-1 flex-1 sm:flex-initial"
                  >
                    {expandedClassId === c.id ? 'Hide' : 'Registrants'}
                  </button>
                  <button
                    onClick={() => startEdit(c)}
                    className="btn-outline text-xs px-2 py-1 flex-1 sm:flex-initial"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => togglePast(c)}
                    className="btn-outline text-xs px-2 py-1 flex-1 sm:flex-initial"
                  >
                    {c.isPast ? 'Mark upcoming' : 'Mark past'}
                  </button>
                  <button
                    onClick={() => setPendingDelete(c)}
                    className="btn-danger-outline text-xs px-2 py-1 flex-1 sm:flex-initial"
                  >
                    Delete
                  </button>
                </div>
              </div>

              {isPaid && c.allowedEmails && c.allowedEmails.length > 0 && (
                <div className="mt-3 pt-3 border-t border-line">
                  <p className="text-[11px] font-mono uppercase tracking-wide text-ink/40 mb-1.5">
                    Access granted to
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {c.allowedEmails.map((email) => (
                      <span
                        key={email}
                        className="badge bg-chalk border border-line text-ink/70 normal-case tracking-normal"
                      >
                        {email}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {expandedClassId === c.id && (
                <div className="mt-3 pt-3 border-t border-line">
                  {loadingRegistrants === c.id ? (
                    <p className="text-xs text-ink/40">Loading registrants…</p>
                  ) : (registrantsByClass[c.id]?.length ?? 0) === 0 ? (
                    <p className="text-xs text-ink/40">No one has registered yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {registrantsByClass[c.id].map((r) => (
                        <div
                          key={r.id}
                          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-0.5 sm:gap-2 text-sm"
                        >
                          <div className="min-w-0">
                            <span className="font-medium text-ink">{r.name}</span>{' '}
                            <span className="text-ink/50 font-mono text-xs">{r.email}</span>
                          </div>
                          <span className="text-xs text-ink/40 font-mono flex-shrink-0">
                            Registered{' '}
                            {new Date(r.registeredAt).toLocaleString('en-US', {
                              dateStyle: 'medium',
                              timeStyle: 'short',
                            })}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
          {classes.length === 0 && (
            <div className="bg-surface border border-dashed border-line rounded-sm p-10 text-center">
              <p className="text-ink/50 text-sm">{emptyStateLabel}</p>
            </div>
          )}
        </div>
      </div>

      {pendingDelete && (
        <ConfirmDialog
          title="Delete this class?"
          message={`"${pendingDelete.title}" and all its registrations will be permanently removed. This can't be undone.`}
          confirmLabel="Delete"
          danger
          onConfirm={confirmDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </div>
  );
}
