import { Link, useParams } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';

/**
 * Non-operational classroom shell.
 *
 * IMPORTANT: do not embed a room, accept an arbitrary room URL, or issue a
 * LiveKit token from browser-provided email. A server-authenticated student
 * session and confirmed entitlement are required before video access.
 */
export default function LiveClassroom() {
  const { id } = useParams<{ id: string }>();

  return (
    <>
      <Header />
      <main className="min-h-[65vh] max-w-5xl mx-auto px-4 sm:px-6 py-10">
        <Link to={id ? `/classes/${encodeURIComponent(id)}` : '/'} className="text-sm text-ink/70 hover:text-ink">
          ← Back to class
        </Link>
        <section className="mt-8 bg-surface border border-line rounded-xl p-6 sm:p-10">
          <span className="inline-block text-xs font-semibold uppercase tracking-wide px-3 py-1 rounded-full bg-red-100 text-red-800">
            Live classroom · In development
          </span>
          <h1 className="font-display text-3xl sm:text-4xl text-ink mt-5">Live Classroom</h1>
          <p className="text-ink/70 mt-3 max-w-2xl">
            Your live lessons will take place here, directly on Webster Technology School.
            You will not need YouTube or an external meeting page.
          </p>
          <div className="grid sm:grid-cols-2 gap-4 mt-8">
            <div className="border border-line rounded-lg p-5">
              <h2 className="font-semibold text-ink">Live broadcast</h2>
              <p className="text-sm text-ink/70 mt-2">Watch your teacher and participate through classroom chat.</p>
            </div>
            <div className="border border-line rounded-lg p-5">
              <h2 className="font-semibold text-ink">Interactive class</h2>
              <p className="text-sm text-ink/70 mt-2">
                Raise your hand to request speaking or camera permission from your teacher.
              </p>
            </div>
          </div>
          <p role="status" className="mt-8 text-sm text-ink/70">
            Live sessions are not available yet. When enabled, you must be registered for this class,
            and paid classes require confirmed access before joining.
          </p>
        </section>
      </main>
      <Footer />
    </>
  );
}
