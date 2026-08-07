import { useEffect, useState } from 'react';
import { api, ContestantEntry, contestIdentity, CurrentQuestion, MonthlyWinnerEntry } from '../lib/api';

const ATTEMPTED_KEY = 'classboard_contest_attempted_question';

export default function WinnerOfMonth() {
  const [goal, setGoal] = useState(1000);
  const [contestants, setContestants] = useState<ContestantEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [identity, setIdentity] = useState(() => contestIdentity.get());
  const [question, setQuestion] = useState<CurrentQuestion | null>(null);
  const [alreadyAttempted, setAlreadyAttempted] = useState(false);
  const [answer, setAnswer] = useState('');
  const [answerResult, setAnswerResult] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [showJoinForm, setShowJoinForm] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [joinError, setJoinError] = useState('');
  const [joining, setJoining] = useState(false);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<MonthlyWinnerEntry[]>([]);

  const loadLeaderboard = () =>
    api
      .getLeaderboard()
      .then((data) => {
        setGoal(data.goal);
        setContestants(data.contestants);
      })
      .finally(() => setLoading(false));

  useEffect(() => {
    loadLeaderboard();
    api.getCurrentQuestion().then(setQuestion);
  }, []);

  useEffect(() => {
    setAlreadyAttempted(!!question && localStorage.getItem(ATTEMPTED_KEY) === question.id);
  }, [question]);

  const pickPhoto = (file: File | null) => {
    setPhotoFile(file);
    setPhotoPreview(file ? URL.createObjectURL(file) : '');
  };

  const markAttempted = () => {
    if (question) localStorage.setItem(ATTEMPTED_KEY, question.id);
    setAlreadyAttempted(true);
  };

  const describeResult = (res: { correct: boolean; won: boolean }) => {
    if (res.won) return 'Correct — you were first! +10 points 🎉';
    if (res.correct) return 'Correct, but someone else answered first today.';
    return 'Not quite — try again tomorrow.';
  };

  // Answering when we already know who the visitor is.
  const submitAnswer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identity || !question) return;
    setSubmitting(true);
    setAnswerResult(null);
    try {
      const res = await api.submitContestAnswer(identity.email, answer);
      markAttempted();
      setAnswerResult(describeResult(res));
      loadLeaderboard();
    } catch (err) {
      setAnswerResult(err instanceof Error ? err.message : 'Could not submit your answer.');
    } finally {
      setSubmitting(false);
    }
  };

  // First-time visitor: join and answer in one step.
  const joinAndAnswer = async (e: React.FormEvent) => {
    e.preventDefault();
    setJoinError('');
    if (!photoFile) {
      setJoinError('Add a photo to join.');
      return;
    }
    setJoining(true);
    try {
      const { url: imageUrl } = await api.uploadContestPhoto(photoFile);
      await api.subscribeContest(name, email, phone, imageUrl);
      const newIdentity = { name, email, phone, imageUrl };
      contestIdentity.set(newIdentity);
      setIdentity(newIdentity);
      loadLeaderboard();

      if (question) {
        const res = await api.submitContestAnswer(email, answer);
        markAttempted();
        setAnswerResult(describeResult(res));
        loadLeaderboard();
      }
    } catch (err) {
      setJoinError(err instanceof Error ? err.message : 'Could not join the contest.');
    } finally {
      setJoining(false);
    }
  };

  // Pre-register with no question live yet (no answer to submit).
  const joinOnly = async (e: React.FormEvent) => {
    e.preventDefault();
    setJoinError('');
    if (!photoFile) {
      setJoinError('Add a photo to join.');
      return;
    }
    setJoining(true);
    try {
      const { url: imageUrl } = await api.uploadContestPhoto(photoFile);
      await api.subscribeContest(name, email, phone, imageUrl);
      const newIdentity = { name, email, phone, imageUrl };
      contestIdentity.set(newIdentity);
      setIdentity(newIdentity);
      setShowJoinForm(false);
      loadLeaderboard();
    } catch (err) {
      setJoinError(err instanceof Error ? err.message : 'Could not join the contest.');
    } finally {
      setJoining(false);
    }
  };

  const toggleHistory = () => {
    if (!showHistory && history.length === 0) {
      api.getContestHistory().then(setHistory);
    }
    setShowHistory((v) => !v);
  };

  const photoPicker = (
    <div className="flex items-center gap-2">
      {photoPreview && (
        <img
          src={photoPreview}
          alt=""
          className="w-9 h-9 rounded-full object-cover border border-line flex-shrink-0"
        />
      )}
      <label className="input text-sm flex-1 cursor-pointer flex items-center text-ink/50">
        {photoFile ? photoFile.name : 'Choose a photo…'}
        <input
          type="file"
          accept="image/*"
          capture="environment"
          onChange={(e) => pickPhoto(e.target.files?.[0] ?? null)}
          className="hidden"
        />
      </label>
    </div>
  );

  return (
    <div className="bg-surface border border-line rounded-xl p-5 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-display text-lg text-ink">🏆 Winner of the Month</h3>
        <span className="badge bg-amber text-midnight">$100</span>
      </div>
      <p className="text-xs text-ink/60 mt-1">
        Answer the daily question first to score points. Most points by month's end wins $100.
      </p>

      <div className="mt-4">
        <div className="bg-chalk border border-line rounded-sm p-3">
          {!question ? (
            <>
              <p className="text-xs text-ink/50">No question posted yet today — check back soon.</p>
              {!identity && (
                <div className="mt-3">
                  {!showJoinForm ? (
                    <button
                      onClick={() => setShowJoinForm(true)}
                      className="btn-outline w-full text-xs"
                    >
                      Join now to be ready
                    </button>
                  ) : (
                    <form onSubmit={joinOnly} className="space-y-2">
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
                        placeholder="Your email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="input text-sm"
                      />
                      <input
                        required
                        placeholder="Phone number"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="input text-sm"
                      />
                      {photoPicker}
                      {joinError && <p className="text-coral text-xs">{joinError}</p>}
                      <button disabled={joining} className="btn-primary w-full text-sm">
                        {joining ? 'Joining…' : 'Join now'}
                      </button>
                    </form>
                  )}
                </div>
              )}
            </>
          ) : (
            <>
              <p className="text-[11px] font-mono uppercase tracking-wide text-amber">
                {question.subject}
              </p>
              <p className="text-sm text-ink mt-0.5">{question.questionText}</p>

              {question.answered ? (
                <p className="text-xs text-ink/50 mt-2">
                  Already answered{question.winnerName ? ` by ${question.winnerName}` : ''}. Check
                  back tomorrow.
                </p>
              ) : answerResult ? (
                <p className="text-sm text-ink mt-2">{answerResult}</p>
              ) : alreadyAttempted ? (
                <p className="text-xs text-ink/50 mt-2">
                  You've already answered today's question. Check back tomorrow.
                </p>
              ) : identity ? (
                <form onSubmit={submitAnswer} className="mt-2 space-y-2">
                  <input
                    required
                    placeholder="Your answer"
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    className="input text-sm"
                  />
                  <button disabled={submitting} className="btn-primary w-full text-sm">
                    {submitting ? 'Submitting…' : 'Submit answer'}
                  </button>
                </form>
              ) : (
                <form onSubmit={joinAndAnswer} className="mt-2 space-y-2">
                  <input
                    required
                    placeholder="Your answer"
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    className="input text-sm"
                  />
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
                    placeholder="Your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input text-sm"
                  />
                  <input
                    required
                    placeholder="Phone number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="input text-sm"
                  />
                  {photoPicker}
                  {joinError && <p className="text-coral text-xs">{joinError}</p>}
                  <button disabled={joining} className="btn-primary w-full text-sm">
                    {joining ? 'Submitting…' : 'Join & submit answer'}
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </div>

      <div className="mt-5">
        <p className="text-[11px] font-mono uppercase tracking-wide text-ink/40 mb-2">
          Leaderboard
        </p>
        {loading ? (
          <p className="text-xs text-ink/40">Loading…</p>
        ) : contestants.length === 0 ? (
          <p className="text-xs text-ink/40">No contestants yet — be the first to join.</p>
        ) : (
          <div className="space-y-2">
            {contestants.map((c, i) => {
              const pct = Math.min(100, Math.round((c.points / goal) * 100));
              const isExpanded = expandedId === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => setExpandedId(isExpanded ? null : c.id)}
                  className="w-full text-left"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-ink/40 w-4 flex-shrink-0">
                      {i + 1}
                    </span>
                    <img
                      src={c.imageUrl}
                      alt=""
                      className="w-8 h-8 rounded-full object-cover border border-line flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm text-ink truncate">{c.name}</span>
                        <span className="text-xs font-mono text-ink/50 flex-shrink-0">
                          {c.points} pts
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 bg-line rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="mt-1.5 ml-6 pl-2 border-l-2 border-line text-xs text-ink/50 space-y-0.5">
                      <p>
                        {c.points} / {goal} points ({pct}% to goal)
                      </p>
                      <p>Rank #{i + 1}</p>
                      <p>
                        Joined{' '}
                        {new Date(c.subscribedAt).toLocaleDateString('en-US', {
                          dateStyle: 'medium',
                        })}
                      </p>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <button
        onClick={toggleHistory}
        className="mt-4 w-full text-center text-xs text-ink/50 hover:text-ink"
      >
        {showHistory ? 'Hide past winners' : 'See past winners'}
      </button>
      {showHistory && (
        <div className="mt-2 space-y-1.5">
          {history.length === 0 ? (
            <p className="text-xs text-ink/40 text-center">No past winners yet.</p>
          ) : (
            history.map((h) => (
              <div key={h.id} className="flex items-center gap-2 text-xs text-ink/60">
                <img
                  src={h.contestantImageUrl}
                  alt=""
                  className="w-5 h-5 rounded-full object-cover border border-line flex-shrink-0"
                />
                <span className="flex-1 truncate">{h.contestantName}</span>
                <span className="font-mono">{h.periodMonth}</span>
                <span className="font-mono">{h.points} pts</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
