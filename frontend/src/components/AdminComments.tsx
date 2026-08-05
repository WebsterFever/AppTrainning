import { useEffect, useState } from 'react';
import { AdminComment, api, SCHOOL_NAME } from '../lib/api';
import ConfirmDialog from './ConfirmDialog';

export default function AdminComments() {
  const [comments, setComments] = useState<AdminComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<AdminComment | null>(null);

  const load = () =>
    api
      .listAllComments()
      .then((data) => {
        setComments(data);
        setDrafts((current) => {
          const next = { ...current };
          data.forEach((c) => {
            if (next[c.id] === undefined) next[c.id] = c.reply ?? '';
          });
          return next;
        });
      })
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  const saveReply = async (id: string) => {
    const reply = (drafts[id] ?? '').trim();
    if (!reply) return;
    setSavingId(id);
    try {
      await api.replyToComment(id, reply);
      await load();
    } finally {
      setSavingId(null);
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    await api.deleteComment(pendingDelete.id);
    setPendingDelete(null);
    load();
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-10 sm:pb-14">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-xl text-ink">Comments</h2>
        <span className="text-xs font-mono text-ink/50">{comments.length} total</span>
      </div>

      {loading ? (
        <p className="text-sm text-ink/40">Loading comments…</p>
      ) : (
        <div className="space-y-3">
          {comments.map((c) => (
            <div key={c.id} className="bg-surface border border-line rounded-sm p-4">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-mono text-ink/40 uppercase tracking-wide">
                    {c.classTitle} · {c.videoLabel}
                  </p>
                  <p className="font-medium text-ink mt-1">{c.name}</p>
                  <p className="text-xs text-ink/50 font-mono">{c.email}</p>
                </div>
                <button
                  onClick={() => setPendingDelete(c)}
                  className="btn-danger-outline text-xs px-2 py-1 flex-shrink-0"
                >
                  Delete
                </button>
              </div>
              <p className="text-sm text-ink/70 mt-3 whitespace-pre-line">{c.text}</p>

              {c.reply && (
                <div className="mt-3 ml-3 pl-3 border-l-2 border-amber">
                  <p className="text-xs font-medium text-amber">{SCHOOL_NAME}</p>
                  <p className="text-sm text-ink/70 mt-0.5 whitespace-pre-line">{c.reply}</p>
                </div>
              )}

              <div className="mt-3 flex flex-col sm:flex-row gap-2">
                <textarea
                  placeholder={`Reply as ${SCHOOL_NAME}…`}
                  value={drafts[c.id] ?? ''}
                  onChange={(e) => setDrafts({ ...drafts, [c.id]: e.target.value })}
                  className="input text-sm h-16 flex-1"
                />
                <button
                  onClick={() => saveReply(c.id)}
                  disabled={savingId === c.id || !(drafts[c.id] ?? '').trim()}
                  className="btn-outline text-xs sm:self-end"
                >
                  {savingId === c.id ? 'Saving…' : c.reply ? 'Update reply' : 'Reply'}
                </button>
              </div>
            </div>
          ))}
          {comments.length === 0 && (
            <div className="bg-surface border border-dashed border-line rounded-sm p-10 text-center">
              <p className="text-ink/50 text-sm">No comments yet.</p>
            </div>
          )}
        </div>
      )}

      {pendingDelete && (
        <ConfirmDialog
          title="Delete this comment?"
          message={`The comment from "${pendingDelete.name}" will be permanently removed. This can't be undone.`}
          confirmLabel="Delete"
          danger
          onConfirm={confirmDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </div>
  );
}
