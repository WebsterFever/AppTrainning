import { useEffect, useState } from 'react';
import { AdminContestant, AdminQuestion, api } from '../lib/api';
import ConfirmDialog from './ConfirmDialog';

export default function AdminContest() {
  const [subject, setSubject] = useState('');
  const [questionText, setQuestionText] = useState('');
  const [correctAnswer, setCorrectAnswer] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [questions, setQuestions] = useState<AdminQuestion[]>([]);
  const [contestants, setContestants] = useState<AdminContestant[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingReset, setPendingReset] = useState(false);
  const [resetting, setResetting] = useState(false);

  const load = () =>
    Promise.all([api.listContestQuestions(), api.listContestants()]).then(
      ([q, c]) => {
        setQuestions(q);
        setContestants(c);
      },
    );

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.createContestQuestion(subject, questionText, correctAnswer);
      setSubject('');
      setQuestionText('');
      setCorrectAnswer('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to post question');
    } finally {
      setSaving(false);
    }
  };

  const confirmReset = async () => {
    setResetting(true);
    try {
      await api.resetContest();
      setPendingReset(false);
      await load();
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-10 sm:pb-14">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-xl text-ink">Winner of the Month</h2>
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-ink/50">
            {contestants.length} contestants · {questions.length} questions
          </span>
          <button onClick={() => setPendingReset(true)} className="btn-danger-outline text-xs px-2 py-1">
            Reset contest
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-[320px_1fr] gap-6">
        <form onSubmit={submit} className="bg-surface border border-line rounded-sm p-5 h-fit">
          <h3 className="font-display text-lg text-ink mb-1">Post today's question</h3>
          <p className="text-xs text-ink/50 mb-4">
            Posting a new question replaces today's active one.
          </p>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wide text-ink/50 mb-1">
                Subject
              </label>
              <input
                required
                placeholder="e.g. World History"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label className="block text-xs font-mono uppercase tracking-wide text-ink/50 mb-1">
                Question
              </label>
              <textarea
                required
                placeholder="What is the capital of France?"
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                className="input h-20"
              />
            </div>
            <div>
              <label className="block text-xs font-mono uppercase tracking-wide text-ink/50 mb-1">
                Correct answer
              </label>
              <input
                required
                placeholder="Paris"
                value={correctAnswer}
                onChange={(e) => setCorrectAnswer(e.target.value)}
                className="input"
              />
              <p className="text-[11px] text-ink/40 mt-1">
                Matched case-insensitively against what contestants type.
              </p>
            </div>
            {error && <p className="text-coral text-xs">{error}</p>}
            <button disabled={saving} className="btn-primary w-full text-sm">
              {saving ? 'Posting…' : 'Post question'}
            </button>
          </div>
        </form>

        <div className="space-y-6">
          <div>
            <h3 className="font-display text-lg text-ink mb-3">Contestants</h3>
            {loading ? (
              <p className="text-sm text-ink/40">Loading…</p>
            ) : contestants.length === 0 ? (
              <div className="bg-surface border border-dashed border-line rounded-sm p-6 text-center">
                <p className="text-ink/50 text-sm">No one has joined yet.</p>
              </div>
            ) : (
              <div className="bg-surface border border-line rounded-sm divide-y divide-line">
                {contestants.map((c) => (
                  <div key={c.id} className="p-3 flex items-center gap-3">
                    <img
                      src={c.imageUrl}
                      alt=""
                      className="w-9 h-9 rounded-full object-cover border border-line flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-ink truncate">{c.name}</p>
                      <p className="text-xs text-ink/50 font-mono truncate">
                        {c.email} · {c.phone}
                      </p>
                    </div>
                    <span className="text-sm font-mono text-amber flex-shrink-0">
                      {c.points} pts
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h3 className="font-display text-lg text-ink mb-3">Past questions</h3>
            {loading ? (
              <p className="text-sm text-ink/40">Loading…</p>
            ) : questions.length === 0 ? (
              <div className="bg-surface border border-dashed border-line rounded-sm p-6 text-center">
                <p className="text-ink/50 text-sm">No questions posted yet.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {questions.map((q) => (
                  <div key={q.id} className="bg-surface border border-line rounded-sm p-3">
                    <p className="text-[11px] font-mono uppercase tracking-wide text-ink/40">
                      {q.subject} ·{' '}
                      {new Date(q.createdAt).toLocaleDateString('en-US', { dateStyle: 'medium' })}
                    </p>
                    <p className="text-sm text-ink mt-1">{q.questionText}</p>
                    <p className="text-xs text-ink/50 mt-1">
                      Answer: <span className="font-mono">{q.correctAnswer}</span>
                      {q.winnerName ? (
                        <span className="text-sage"> · won by {q.winnerName}</span>
                      ) : (
                        <span className="text-ink/40"> · not yet answered</span>
                      )}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {pendingReset && (
        <ConfirmDialog
          title="Reset the contest?"
          message="Every contestant, question, and answer will be permanently deleted and points reset to zero. Past monthly winners are kept. This can't be undone."
          confirmLabel={resetting ? 'Resetting…' : 'Reset contest'}
          danger
          onConfirm={confirmReset}
          onCancel={() => setPendingReset(false)}
        />
      )}
    </div>
  );
}
