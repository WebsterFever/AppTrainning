import { useEffect, useState } from 'react';
import { api } from '../lib/api';

export default function RegisterModal({
  classId,
  className,
  onClose,
  onRegistered,
}: {
  classId: string;
  className: string;
  onClose: () => void;
  onRegistered: (newCount: number, name: string) => void;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [error, setError] = useState('');
  const [zoomLink, setZoomLink] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setError('');
    try {
      const res = await api.register(classId, name, email);
      setStatus('done');
      setZoomLink(res.zoomLink);
      onRegistered(res.registrationCount, name);
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Something went wrong');
    }
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(zoomLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-chalk rounded-sm max-w-md w-full p-5 sm:p-6 relative border border-line animate-fade-in max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-ink/50 hover:text-ink"
          aria-label="Close"
        >
          ✕
        </button>

        {status === 'done' ? (
          <div className="py-6 text-center">
            <div className="text-3xl mb-2">✓</div>
            <h3 className="font-display text-2xl text-ink">You're in.</h3>
            <p className="text-ink/70 mt-2">
              Copy your Zoom link below and save it — you'll need it to join the class.
            </p>

            <div className="mt-5 flex items-center gap-2 bg-surface border border-line rounded-sm p-2">
              <input
                readOnly
                value={zoomLink}
                onFocus={(e) => e.target.select()}
                className="flex-1 min-w-0 text-sm font-mono text-ink/80 bg-transparent px-2 py-1 focus:outline-none"
              />
              <button onClick={copyLink} className="btn-primary text-sm px-4 py-2 flex-shrink-0">
                {copied ? 'Copied ✓' : 'Copy'}
              </button>
            </div>

            <button onClick={onClose} className="btn-dark mt-6">
              Done
            </button>
          </div>
        ) : (
          <>
            <h3 className="font-display text-2xl text-ink">Register</h3>
            <p className="text-ink/60 text-sm mt-1">
              for <span className="font-medium text-ink">{className}</span>
            </p>

            <form onSubmit={submit} className="mt-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-ink/80 mb-1">Full name</label>
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input"
                  placeholder="Jane Doe"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink/80 mb-1">Email</label>
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input"
                  placeholder="jane@example.com"
                />
              </div>

              {status === 'error' && <p className="text-coral text-sm">{error}</p>}

              <button type="submit" disabled={status === 'loading'} className="btn-primary w-full">
                {status === 'loading' ? 'Registering…' : 'Register — get the Zoom link'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
