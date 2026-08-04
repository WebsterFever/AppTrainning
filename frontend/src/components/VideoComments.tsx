import { useEffect, useState } from 'react';
import { api, VideoComment, visitorIdentity } from '../lib/api';

export default function VideoComments({ classId, videoRef }: { classId: string; videoRef: string }) {
  const identity = visitorIdentity.get(classId);
  const [comments, setComments] = useState<VideoComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState(identity?.name ?? '');
  const [email, setEmail] = useState(identity?.email ?? '');
  const [text, setText] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .listComments(classId, videoRef)
      .then(setComments)
      .finally(() => setLoading(false));
  }, [classId, videoRef]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setError('');
    try {
      const comment = await api.addComment(classId, videoRef, name, email, text);
      setComments((current) => [...current, comment]);
      visitorIdentity.set(classId, { name, email });
      setText('');
      setStatus('idle');
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Something went wrong');
    }
  };

  return (
    <div className="mt-4 border-t border-line pt-4">
      <p className="font-mono text-xs tracking-widest text-ink/40 uppercase mb-3">
        Comments{comments.length > 0 ? ` (${comments.length})` : ''}
      </p>

      {loading ? (
        <p className="text-sm text-ink/40">Loading comments…</p>
      ) : (
        <div className="space-y-3 mb-4">
          {comments.map((c) => (
            <div key={c.id} className="text-sm">
              <div className="flex items-baseline gap-2">
                <span className="font-medium text-ink">{c.name}</span>
                <span className="text-[11px] font-mono text-ink/40">
                  {new Date(c.createdAt).toLocaleDateString('en-US', { dateStyle: 'medium' })}
                </span>
              </div>
              <p className="text-ink/70 mt-0.5 whitespace-pre-line">{c.text}</p>
            </div>
          ))}
          {comments.length === 0 && <p className="text-sm text-ink/40">No comments yet — be the first.</p>}
        </div>
      )}

      <form onSubmit={submit} className="space-y-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <input
            required
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input text-sm"
          />
          <input
            required
            type="email"
            placeholder="Your registered email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input text-sm"
          />
        </div>
        <textarea
          required
          placeholder="Add a comment…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="input text-sm h-16"
        />
        {status === 'error' && <p className="text-coral text-xs">{error}</p>}
        <button type="submit" disabled={status === 'loading'} className="btn-outline text-xs">
          {status === 'loading' ? 'Posting…' : 'Post comment'}
        </button>
      </form>
    </div>
  );
}
