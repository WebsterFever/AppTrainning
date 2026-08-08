import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import Header from '../components/Header';
import Footer from '../components/Footer';

const emptyForm = {
  name: '',
  email: '',
  phone: '',
  description: '',
  preferredSchedule: '',
  zoomLink: '',
};

export default function BookClass() {
  const [form, setForm] = useState(emptyForm);
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setError('');
    try {
      // The datetime-local input has no timezone attached — resolve it
      // against the browser's own timezone before sending, so the server
      // (which may run in a different timezone) can't reinterpret it.
      await api.createBooking({
        ...form,
        preferredSchedule: new Date(form.preferredSchedule).toISOString(),
      });
      setStatus('done');
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Something went wrong');
    }
  };

  return (
    <div className="min-h-screen bg-chalk flex flex-col">
      <Header />

      <div className="max-w-xl mx-auto px-4 sm:px-6 py-10 w-full flex-1 animate-fade-in">
        <Link to="/" className="text-xs font-mono text-ink/50 hover:text-ink">
          ← All classes
        </Link>

        {status === 'done' ? (
          <div className="mt-6 bg-surface border border-line rounded-sm p-8 text-center">
            <div className="text-3xl mb-2">✓</div>
            <h1 className="font-display text-2xl text-ink">Request sent.</h1>
            <p className="text-ink/70 mt-2">
              We got your class request and will reach out at <strong>{form.email}</strong> to
              confirm the schedule.
            </p>
            <Link to="/" className="btn-primary inline-flex mt-6">
              Back to all classes
            </Link>
          </div>
        ) : (
          <>
            <h1 className="font-display text-3xl sm:text-4xl text-ink mt-4">Book a class</h1>
            <p className="text-ink/60 mt-3">
              Tell us what you'd like to learn and when works for you — we'll set it up and
              confirm the details.
            </p>

            <form onSubmit={submit} className="mt-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-ink/80 mb-1">Full name</label>
                  <input
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="input"
                    placeholder="Jane Doe"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink/80 mb-1">Phone</label>
                  <input
                    required
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="input"
                    placeholder="+1 555 123 4567"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-ink/80 mb-1">Email</label>
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="input"
                  placeholder="jane@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-ink/80 mb-1">
                  What do you want to learn?
                </label>
                <textarea
                  required
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="input h-28"
                  placeholder="Describe the class you'd like — topic, level, goals…"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-ink/80 mb-1">
                  Preferred date &amp; time
                </label>
                <input
                  required
                  type="datetime-local"
                  value={form.preferredSchedule}
                  onChange={(e) => setForm({ ...form, preferredSchedule: e.target.value })}
                  className="input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-ink/80 mb-1">Your Zoom link</label>
                <input
                  required
                  value={form.zoomLink}
                  onChange={(e) => setForm({ ...form, zoomLink: e.target.value })}
                  className="input"
                  placeholder="https://zoom.us/j/…"
                />
                <p className="text-[11px] text-ink/40 mt-1">
                  Share your Zoom room so the teacher can join you there.
                </p>
              </div>

              {status === 'error' && <p className="text-coral text-sm">{error}</p>}

              <button type="submit" disabled={status === 'loading'} className="btn-primary w-full">
                {status === 'loading' ? 'Sending…' : 'Request this class'}
              </button>
            </form>
          </>
        )}
      </div>

      <Footer />
    </div>
  );
}
