import { useEffect, useState } from 'react';
import { api, ClassItem, NewExtraVideo, RegistrationDetail } from '../lib/api';
import ConfirmDialog from './ConfirmDialog';

function emptyForm() {
  return {
    title: '',
    description: '',
    imageUrl: '',
    videoUrl: '',
    videoNotes: '',
    extraVideos: [{ title: '', url: '', notes: '' }] as NewExtraVideo[],
    classDate: '',
    zoomLink: '',
    allowedEmails: [''] as string[],
  };
}

// Convert an ISO date string to the local "YYYY-MM-DDTHH:mm" format a
// datetime-local input expects, using the browser's local timezone.
function toDatetimeLocal(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatCountdown(classDate: string, now: Date): string {
  const diffMs = new Date(classDate).getTime() - now.getTime();
  if (diffMs <= 0) return 'Starting now';
  const totalMinutes = Math.floor(diffMs / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;
  const parts: string[] = [];
  if (days) parts.push(`${days}d`);
  if (days || hours) parts.push(`${hours}h`);
  parts.push(`${minutes}m`);
  return `Starts in ${parts.join(' ')}`;
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
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [pendingDelete, setPendingDelete] = useState<ClassItem | null>(null);
  const [expandedClassId, setExpandedClassId] = useState<string | null>(null);
  const [registrantsByClass, setRegistrantsByClass] = useState<Record<string, RegistrationDetail[]>>({});
  const [loadingRegistrants, setLoadingRegistrants] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

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
      extraVideos: c.extraVideos?.length
        ? c.extraVideos.map((v) => ({ id: v.id, title: v.title, url: v.url, notes: v.notes ?? '' }))
        : [{ title: '', url: '', notes: '' }],
      classDate: toDatetimeLocal(c.classDate),
      zoomLink: c.zoomLink ?? '',
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
      const extraVideos = form.extraVideos
        .map((v) => ({
          id: v.id,
          title: v.title.trim(),
          url: v.url.trim(),
          notes: (v.notes ?? '').trim(),
        }))
        .filter((v) => v.url)
        .map((v, i) => ({
          id: v.id,
          title: v.title || `Video ${i + 2}`,
          url: v.url,
          notes: v.notes || undefined,
        }));
      const payload = {
        title: form.title,
        description: form.description,
        imageUrl: form.imageUrl,
        classDate: form.classDate || undefined,
        zoomLink: form.zoomLink.trim() || undefined,
        videoUrl: form.videoUrl.trim() || undefined,
        videoNotes: form.videoNotes.trim() || undefined,
        extraVideos: extraVideos.length ? extraVideos : undefined,
        isPaid,
        ...(isPaid
          ? { allowedEmails: form.allowedEmails.map((e) => e.trim()).filter(Boolean) }
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
                  extraVideos: [...form.extraVideos, { title: '', url: '', notes: '' }],
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
                        {formatCountdown(c.classDate, now)}
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
