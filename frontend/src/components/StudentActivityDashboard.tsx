import { useEffect, useMemo, useState } from 'react';
import { api, ClassItem, StudentActivitySummary } from '../lib/api';

function duration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  return minutes >= 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60}m` : `${minutes}m`;
}

export default function StudentActivityDashboard({ classes }: { classes: ClassItem[] }) {
  const [classId, setClassId] = useState('');
  const [students, setStudents] = useState<StudentActivitySummary[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const selectedId = classes.some((c) => c.id === classId) ? classId : (classes[0]?.id ?? '');
  const selectedClass = useMemo(() => classes.find((c) => c.id === selectedId), [classes, selectedId]);

  useEffect(() => {
    if (!selectedId) { setStudents([]); return; }
    let alive = true;
    const refresh = async () => {
      try {
        const result = await api.studentActivity(selectedId);
        if (alive) { setStudents(result); setError(''); setLoading(false); }
      } catch (err) {
        if (alive) { setError(err instanceof Error ? err.message : 'Could not load activity'); setLoading(false); }
      }
    };
    setLoading(true);
    void refresh();
    const timer = window.setInterval(() => void refresh(), 30000);
    return () => { alive = false; window.clearInterval(timer); };
  }, [selectedId]);

  const online = students.filter((s) => s.online).length;
  const studied = students.filter((s) => s.activeSeconds > 0).length;

  const describeLocation = (s: StudentActivitySummary) => {
    const mod = selectedClass?.curriculumModules?.find((m) => m.id === s.moduleId);
    const topic = mod?.topics?.find((t) => t.id === s.topicId);
    const subtopic = topic?.subtopics?.find((t) => t.id === s.subtopicId);
    return [mod?.title, topic?.title, subtopic?.title].filter(Boolean).join(' / ') || 'No lesson selected';
  };

  return (
    <section className="max-w-5xl mx-auto px-4 sm:px-6 py-8" aria-label="Student activity">
      <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
        <div>
          <h2 className="font-display text-xl text-ink">Student Activity</h2>
          <p className="text-xs text-ink/60">Automatically refreshes every 30 seconds. Online means seen within 90 seconds.</p>
        </div>
        <select className="bg-surface border border-line rounded px-3 py-2 text-sm text-ink max-w-full"
          value={selectedId} onChange={(e) => setClassId(e.target.value)} aria-label="Select class">
          {classes.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-3 gap-3 mb-4">
        {[
          ['Registered', students.length],
          ['Online now', online],
          ['Studied', studied],
        ].map(([label, value]) => (
          <div key={label} className="bg-surface border border-line rounded p-3">
            <p className="text-xs text-ink/60">{label}</p>
            <p className="text-2xl font-bold text-ink">{value}</p>
          </div>
        ))}
      </div>
      {loading && <p className="text-sm text-ink/60">Loading student activity…</p>}
      {error && <p role="alert" className="text-sm text-coral mb-3">{error}</p>}
      <div className="space-y-2">
        {students.map((s) => (
          <div key={s.email} className="bg-surface border border-line rounded p-3 flex flex-wrap justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-ink">
                <span className={s.online ? 'text-green-600' : 'text-ink/40'} aria-hidden="true">● </span>
                {s.name} <span className="text-xs font-normal text-ink/60">({s.online ? 'Online' : 'Offline'})</span>
              </p>
              <p className="text-xs text-ink/60 break-all">{s.email}</p>
              <p className="text-xs text-ink/70 mt-1">{describeLocation(s)}</p>
            </div>
            <div className="text-xs text-ink/70 text-right">
              <p>Active study: <strong>{duration(s.activeSeconds)}</strong></p>
              <p>Last seen: {s.lastSeenAt ? new Date(s.lastSeenAt).toLocaleString() : 'Never'}</p>
            </div>
          </div>
        ))}
        {!loading && !students.length && selectedId && <p className="text-sm text-ink/60">No registered students yet.</p>}
      </div>
      <p className="text-xs text-ink/50 mt-3">
        Study time is an estimate based on visible-tab activity, not proof of attention.
        Existing course registration uses an email identity rather than a verified student login.
      </p>
    </section>
  );
}
