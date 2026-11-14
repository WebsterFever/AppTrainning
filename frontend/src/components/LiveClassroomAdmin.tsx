import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BASE_URL, authToken, ClassItem } from '../lib/api';

type ClassroomStatus = { configured: boolean; roomName: string };

export default function LiveClassroomAdmin({ classes }: { classes: ClassItem[] }) {
  const [selected, setSelected] = useState('');
  const [status, setStatus] = useState<ClassroomStatus | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selected && classes.length) setSelected(classes[0].id);
  }, [classes, selected]);

  useEffect(() => {
    if (!selected) return;
    let active = true;
    setLoading(true);
    setStatus(null);
    setError('');
    const token = authToken.get();
    fetch(`${BASE_URL}/admin/classes/${encodeURIComponent(selected)}/live/status`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(async (response) => {
        if (!response.ok) throw new Error('Could not check classroom configuration.');
        return response.json() as Promise<ClassroomStatus>;
      })
      .then((result) => { if (active) setStatus(result); })
      .catch((cause: Error) => { if (active) setError(cause.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [selected]);

  return (
    <section className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <div className="bg-surface border border-line rounded-lg p-5 sm:p-7">
        <h2 className="font-display text-2xl text-ink">Live Classroom</h2>
        <p className="text-sm text-ink/70 mt-2">
          Prepare live teaching on your own school website. This feature is still under development.
        </p>
        <label htmlFor="live-class-selector" className="block text-sm font-medium text-ink mt-5 mb-2">
          Select a class
        </label>
        <select
          id="live-class-selector"
          className="w-full border border-line rounded-md bg-chalk text-ink p-3"
          value={selected}
          onChange={(event) => setSelected(event.target.value)}
        >
          {classes.length === 0 && <option value="">No classes available</option>}
          {classes.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
        </select>
        <p role="status" className="text-sm text-ink/70 mt-4">
          {loading ? 'Checking video configuration…' : error || (
            status?.configured
              ? 'LiveKit credentials are configured. Video and student access are not enabled yet.'
              : 'LiveKit is not configured yet. The backend needs LIVEKIT_URL, LIVEKIT_API_KEY, and LIVEKIT_API_SECRET.'
          )}
        </p>
        {selected && (
          <Link to={`/classes/${encodeURIComponent(selected)}/live`} className="inline-block btn-outline mt-4">
            Preview classroom page
          </Link>
        )}
      </div>
    </section>
  );
}
