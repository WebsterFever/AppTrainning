import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { useLanguage } from '../lib/i18n';

const emptyForm = {
  name: '',
  email: '',
  phone: '',
  description: '',
  preferredSchedule: '',
  zoomLink: '',
};

export default function BookClass() {
  const { t } = useLanguage();
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
      setError(err instanceof Error ? err.message : t('somethingWentWrong'));
    }
  };

  return (
    <div className="min-h-screen bg-chalk flex flex-col">
      <Header />

      <div className="max-w-xl mx-auto px-4 sm:px-6 py-10 w-full flex-1 animate-fade-in">
        <Link to="/" className="text-xs font-mono text-ink/50 hover:text-ink">
          {t('allClasses')}
        </Link>

        {status === 'done' ? (
          <div className="mt-6 bg-surface border border-line rounded-sm p-8 text-center">
            <div className="text-3xl mb-2">✓</div>
            <h1 className="font-display text-2xl text-ink">{t('requestSentTitle')}</h1>
            <p className="text-ink/70 mt-2">{t('requestSentBody', { email: form.email })}</p>
            <Link to="/" className="btn-primary inline-flex mt-6">
              {t('backToAllClasses')}
            </Link>
          </div>
        ) : (
          <>
            <h1 className="font-display text-3xl sm:text-4xl text-ink mt-4">{t('bookAClass')}</h1>
            <p className="text-ink/60 mt-3">{t('bookClassIntro')}</p>

            <form onSubmit={submit} className="mt-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-ink/80 mb-1">{t('fullName')}</label>
                  <input
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="input"
                    placeholder="Jane Doe"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink/80 mb-1">{t('phone')}</label>
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
                <label className="block text-sm font-medium text-ink/80 mb-1">{t('email')}</label>
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
                <label className="block text-sm font-medium text-ink/80 mb-1">{t('whatLearn')}</label>
                <textarea
                  required
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="input h-28"
                  placeholder={t('describeClassPlaceholder')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-ink/80 mb-1">
                  {t('preferredDateTime')}
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
                <label className="block text-sm font-medium text-ink/80 mb-1">{t('yourZoomLinkLabel')}</label>
                <input
                  required
                  value={form.zoomLink}
                  onChange={(e) => setForm({ ...form, zoomLink: e.target.value })}
                  className="input"
                  placeholder="https://zoom.us/j/…"
                />
                <p className="text-[11px] text-ink/40 mt-1">{t('shareZoomHint')}</p>
              </div>

              {status === 'error' && <p className="text-coral text-sm">{error}</p>}

              <button type="submit" disabled={status === 'loading'} className="btn-primary w-full">
                {status === 'loading' ? t('sending') : t('requestThisClass')}
              </button>
            </form>
          </>
        )}
      </div>

      <Footer />
    </div>
  );
}
