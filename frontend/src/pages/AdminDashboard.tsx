import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, authToken, Booking, ClassItem } from '../lib/api';
import ConfirmDialog from '../components/ConfirmDialog';
import ThemeToggle from '../components/ThemeToggle';
import AdminComments from '../components/AdminComments';
import AdminChat from '../components/AdminChat';
import ClassManager from '../components/ClassManager';

export default function AdminDashboard() {
  const [authed, setAuthed] = useState<boolean | undefined>(undefined);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
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

  const freeClasses = classes.filter((c) => !c.isPaid);
  const paidClasses = classes.filter((c) => c.isPaid);

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

      <ClassManager
        isPaid={false}
        heading="Add a class"
        listHeading="All classes"
        emptyStateLabel="No classes yet — publish your first one on the left."
        classes={freeClasses}
        onChanged={load}
      />

      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="border-t border-line pt-8 sm:pt-10" />
      </div>

      <ClassManager
        isPaid
        heading="Add a paid class"
        listHeading="Paid classes"
        emptyStateLabel="No paid classes yet — publish your first one on the left."
        classes={paidClasses}
        onChanged={load}
      />

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

      <AdminChat />

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
    </div>
  );
}
