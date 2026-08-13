import { useEffect, useState } from 'react';
import { AdminSubmission, api } from '../lib/api';

function statusBadge(status: AdminSubmission['status']) {
  if (status === 'approved') {
    return <span className="badge bg-sage text-chalk normal-case tracking-normal">Approved</span>;
  }
  if (status === 'changes_requested') {
    return <span className="badge bg-coral text-chalk normal-case tracking-normal">Needs changes</span>;
  }
  return <span className="badge bg-amber text-midnight normal-case tracking-normal">Pending review</span>;
}

export default function AdminSubmissions() {
  const [submissions, setSubmissions] = useState<AdminSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedbackDrafts, setFeedbackDrafts] = useState<Record<string, string>>({});
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  const load = () =>
    api
      .listAllSubmissions()
      .then(setSubmissions)
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  const review = async (id: string, status: 'approved' | 'changes_requested') => {
    setReviewingId(id);
    try {
      await api.reviewSubmission(id, status, (feedbackDrafts[id] ?? '').trim() || undefined);
      await load();
    } finally {
      setReviewingId(null);
    }
  };

  const pendingCount = submissions.filter((s) => s.status === 'pending').length;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-10 sm:pb-14">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-xl text-ink">Module project submissions</h2>
        <span className="text-xs font-mono text-ink/50">
          {pendingCount} pending · {submissions.length} total
        </span>
      </div>

      {loading ? (
        <p className="text-sm text-ink/40">Loading…</p>
      ) : (
        <div className="space-y-3">
          {submissions.map((s) => (
            <div key={s.id} className="bg-surface border border-line rounded-sm p-4">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-mono text-ink/40 uppercase tracking-wide">
                    {s.classTitle} · {s.moduleTitle}
                  </p>
                  <p className="font-medium text-ink mt-1">{s.name}</p>
                  <p className="text-xs text-ink/50 font-mono">{s.email}</p>
                </div>
                {statusBadge(s.status)}
              </div>

              <a
                href={s.githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-outline text-xs px-3 py-1.5 inline-block mt-3"
              >
                Open GitHub repository ↗
              </a>

              {s.studentNotes && (
                <p className="text-sm text-ink/70 mt-2 whitespace-pre-line">{s.studentNotes}</p>
              )}

              <p className="text-[11px] text-ink/40 mt-2">
                Submitted{' '}
                {new Date(s.submittedAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
              </p>

              {s.adminFeedback && (
                <div className="mt-2 ml-3 pl-3 border-l-2 border-amber">
                  <p className="text-xs font-medium text-amber">Your feedback</p>
                  <p className="text-sm text-ink/70 mt-0.5 whitespace-pre-line">{s.adminFeedback}</p>
                </div>
              )}

              {s.status !== 'approved' && (
                <div className="mt-3 space-y-2">
                  <textarea
                    placeholder="Feedback (optional to approve, recommended when requesting changes)…"
                    value={feedbackDrafts[s.id] ?? ''}
                    onChange={(e) => setFeedbackDrafts({ ...feedbackDrafts, [s.id]: e.target.value })}
                    className="input text-sm h-16"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => review(s.id, 'approved')}
                      disabled={reviewingId === s.id}
                      className="btn-primary text-xs px-3 py-1.5"
                    >
                      {reviewingId === s.id ? 'Saving…' : 'Approve'}
                    </button>
                    <button
                      onClick={() => review(s.id, 'changes_requested')}
                      disabled={reviewingId === s.id}
                      className="btn-danger-outline text-xs px-3 py-1.5"
                    >
                      Request changes
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {submissions.length === 0 && (
            <div className="bg-surface border border-dashed border-line rounded-sm p-10 text-center">
              <p className="text-ink/50 text-sm">No project submissions yet.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
