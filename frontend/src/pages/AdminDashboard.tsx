import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, authToken, Booking, ClassItem, NewExtraVideo } from '../lib/api';
import ConfirmDialog from '../components/ConfirmDialog';
import ThemeToggle from '../components/ThemeToggle';
import AdminComments from '../components/AdminComments';

const emptyForm = {
  title: '',
  description: '',
  imageUrl: '',
  videoUrl: '',
  videoNotes: '',
  extraVideos: [{ title: '', url: '', notes: '' }] as NewExtraVideo[],
  classDate: '',
  zoomLink: '',
};

// Convert an ISO date string to the local "YYYY-MM-DDTHH:mm" format a
// datetime-local input expects, using the browser's local timezone.
function toDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function AdminDashboard() {
  const [authed, setAuthed] = useState<boolean | undefined>(undefined);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [pendingDelete, setPendingDelete] = useState<ClassItem | null>(null);
  const [pendingBookingDelete, setPendingBookingDelete] = useState<Booking | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const hasToken = !!authToken.get();
    setAuthed(hasToken);
    if (!hasToken) navigate('/admin');
  }, [navigate]);

  const load = () => api.listClassesAdmin().then(setClasses);
  const loadBookings = () => api.listBookings().then(setBookings);

  useEffect(() => {
    if (authed) {
      load();
      loadBookings();
    }
  }, [authed]);

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
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setError('');
    setForm(emptyForm);
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
        ...form,
        videoUrl: form.videoUrl.trim() || undefined,
        videoNotes: form.videoNotes.trim() || undefined,
        extraVideos: extraVideos.length ? extraVideos : undefined,
      };
      if (editingId) {
        await api.updateClass(editingId, payload);
      } else {
        await api.createClass(payload);
      }
      setEditingId(null);
      setForm(emptyForm);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save class');
    } finally {
      setSaving(false);
    }
  };

  const togglePast = async (c: ClassItem) => {
    await api.markPast(c.id, !c.isPast);
    load();
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    await api.deleteClass(pendingDelete.id);
    if (editingId === pendingDelete.id) cancelEdit();
    setPendingDelete(null);
    load();
  };

  const confirmBookingDelete = async () => {
    if (!pendingBookingDelete) return;
    await api.deleteBooking(pendingBookingDelete.id);
    setPendingBookingDelete(null);
    loadBookings();
  };

  if (authed === undefined) return null;

  const signOut = () => {
    authToken.clear();
    navigate('/admin');
  };

  const upcomingCount = classes.filter((c) => !c.isPast).length;

  return (
    <div className="min-h-screen bg-chalk">
      <header className="border-b border-line bg-chalk/90 backdrop-blur sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-2 sm:py-3 flex flex-wrap items-center justify-between gap-3">
          <span className="flex items-center gap-2">
            <img
              src="/logoLightMode.png"
              alt="Webster Technology School"
              className="h-12 sm:h-14 w-auto dark:hidden"
            />
            <img
              src="/logoDarkMode.png"
              alt="Webster Technology School"
              className="h-12 sm:h-14 w-auto hidden dark:block"
            />
            <span className="font-display text-base sm:text-xl text-ink/40">· Admin</span>
          </span>
          <div className="flex items-center gap-2 sm:gap-4">
            <a
              href="/"
              className="text-sm font-mono text-ink/50 hover:text-ink hidden sm:inline"
            >
              View site ↗
            </a>
            <ThemeToggle />
            <button onClick={signOut} className="btn-outline text-sm">
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10 grid md:grid-cols-[320px_1fr] gap-6 md:gap-10">
        <form onSubmit={submit} className="bg-surface border border-line rounded-sm p-5 h-fit md:sticky md:top-24">
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-display text-xl text-ink">
              {editingId ? 'Edit class' : 'Add a class'}
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
                Date &amp; time
              </label>
              <input
                required
                type="datetime-local"
                value={form.classDate}
                onChange={(e) => setForm({ ...form, classDate: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="block text-xs font-mono uppercase tracking-wide text-ink/50 mb-1">
                Zoom link
              </label>
              <input
                required
                placeholder="https://zoom.us/j/…"
                value={form.zoomLink}
                onChange={(e) => setForm({ ...form, zoomLink: e.target.value })}
                className="input"
              />
            </div>
            {error && <p className="text-coral text-xs">{error}</p>}
            <button disabled={saving} className="btn-primary w-full text-sm">
              {saving ? 'Saving…' : editingId ? 'Save changes' : 'Publish class'}
            </button>
          </div>
        </form>

        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl text-ink">All classes</h2>
            <span className="text-xs font-mono text-ink/50">
              {upcomingCount} upcoming · {classes.length} total
            </span>
          </div>
          <div className="space-y-3">
            {classes.map((c) => (
              <div
                key={c.id}
                className={`bg-surface border rounded-sm p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 transition-colors ${
                  editingId === c.id ? 'border-amber' : 'border-line hover:border-ink/20'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={c.imageUrl}
                    alt=""
                    className="w-14 h-14 sm:w-16 sm:h-16 object-cover rounded-sm border border-line flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-ink truncate">{c.title}</p>
                    <p className="text-xs text-ink/50 font-mono mt-0.5">
                      {new Date(c.classDate).toLocaleString('en-US', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                      {' · '}
                      {c.registrationCount} registered
                      {c.isPast && <span className="text-sage"> · PAST</span>}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 sm:flex-shrink-0">
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
            ))}
            {classes.length === 0 && (
              <div className="bg-surface border border-dashed border-line rounded-sm p-10 text-center">
                <p className="text-ink/50 text-sm">No classes yet — publish your first one on the left.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-10 sm:pb-14">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl text-ink">Class booking requests</h2>
          <span className="text-xs font-mono text-ink/50">{bookings.length} total</span>
        </div>
        <div className="space-y-3">
          {bookings.map((b) => (
            <div key={b.id} className="bg-surface border border-line rounded-sm p-4">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-ink">{b.name}</p>
                  <p className="text-xs text-ink/50 font-mono mt-0.5">
                    {b.email} · {b.phone}
                  </p>
                  <p className="text-xs text-ink/50 font-mono mt-0.5">
                    Wants:{' '}
                    {new Date(b.preferredSchedule).toLocaleString('en-US', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </p>
                </div>
                <button
                  onClick={() => setPendingBookingDelete(b)}
                  className="btn-danger-outline text-xs px-2 py-1 flex-shrink-0"
                >
                  Dismiss
                </button>
              </div>
              <p className="text-sm text-ink/70 mt-3 whitespace-pre-line">{b.description}</p>
              {b.zoomLink && (
                <p className="text-xs font-mono text-ink/60 mt-2">
                  Zoom:{' '}
                  <a href={b.zoomLink} className="text-amber hover:text-coral">
                    {b.zoomLink}
                  </a>
                </p>
              )}
            </div>
          ))}
          {bookings.length === 0 && (
            <div className="bg-surface border border-dashed border-line rounded-sm p-10 text-center">
              <p className="text-ink/50 text-sm">No class requests yet.</p>
            </div>
          )}
        </div>
      </div>

      <AdminComments />

      {pendingBookingDelete && (
        <ConfirmDialog
          title="Dismiss this request?"
          message={`The booking request from "${pendingBookingDelete.name}" will be removed. This can't be undone.`}
          confirmLabel="Dismiss"
          danger
          onConfirm={confirmBookingDelete}
          onCancel={() => setPendingBookingDelete(null)}
        />
      )}

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
