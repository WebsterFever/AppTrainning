import { useEffect, useState } from 'react';
import { api, ContestantEntry, contestIdentity, CurrentQuestion, MonthlyWinnerEntry } from '../lib/api';
import { formatCountdown, getNextQuestionTime } from '../lib/contestSchedule';
import { useLanguage, localeFor } from '../lib/i18n';

const ATTEMPTED_KEY = 'classboard_contest_attempted_question';

export default function WinnerOfMonth() {
  const { language, t } = useLanguage();
  const locale = localeFor(language);
  const [goal, setGoal] = useState(300);
  const [periodEnded, setPeriodEnded] = useState(false);
  const [monthWinner, setMonthWinner] = useState<
    { name: string; imageUrl: string; points: number } | undefined
  >(undefined);
  const [contestants, setContestants] = useState<ContestantEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [identity, setIdentity] = useState(() => contestIdentity.get());
  const [question, setQuestion] = useState<CurrentQuestion | null>(null);
  const [alreadyAttempted, setAlreadyAttempted] = useState(false);
  const [now, setNow] = useState(() => new Date());
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
        setPeriodEnded(data.periodEnded);
        setMonthWinner(data.monthWinner);
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

  // Tick the countdown every second, and periodically re-check for a newly
  // posted question so the widget updates without a manual page reload.
  useEffect(() => {
    const tickTimer = setInterval(() => setNow(new Date()), 1000);
    const refreshTimer = setInterval(() => {
      api.getCurrentQuestion().then(setQuestion);
      loadLeaderboard();
    }, 60000);
    return () => {
      clearInterval(tickTimer);
      clearInterval(refreshTimer);
    };
  }, []);

  const nextQuestionTime = getNextQuestionTime(now);
  const countdownText = formatCountdown(nextQuestionTime, now, t('anyMomentNow'));

  const pickPhoto = (file: File | null) => {
    setPhotoFile(file);
    setPhotoPreview(file ? URL.createObjectURL(file) : '');
  };

  const markAttempted = () => {
    if (question) localStorage.setItem(ATTEMPTED_KEY, question.id);
    setAlreadyAttempted(true);
  };

  const describeResult = (res: { correct: boolean; won: boolean }) => {
    if (res.won) return t('correctFirstResult');
    if (res.correct) return t('correctNotFirstResult');
    return t('incorrectResult');
  };

  // Clears a stale saved identity, e.g. after an admin contest reset wiped
  // this contestant from the database but their browser still remembers them.
  const clearIdentity = () => {
    contestIdentity.clear();
    localStorage.removeItem(ATTEMPTED_KEY);
    setIdentity(null);
    setAnswerResult(null);
    setAlreadyAttempted(false);
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
      const message = err instanceof Error ? err.message : t('couldNotSubmitAnswer');
      if (message.includes('Subscribe to the contest')) {
        // Our saved identity no longer exists server-side (e.g. contest was
        // reset) — drop it so the join form reappears instead of a dead end.
        clearIdentity();
      } else {
        setAnswerResult(message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  // First-time visitor: join and answer in one step.
  const joinAndAnswer = async (e: React.FormEvent) => {
    e.preventDefault();
    setJoinError('');
    if (!photoFile) {
      setJoinError(t('addPhotoToJoin'));
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
      setJoinError(err instanceof Error ? err.message : t('couldNotJoinContest'));
    } finally {
      setJoining(false);
    }
  };

  // Pre-register with no question live yet (no answer to submit).
  const joinOnly = async (e: React.FormEvent) => {
    e.preventDefault();
    setJoinError('');
    if (!photoFile) {
      setJoinError(t('addPhotoToJoin'));
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
      setJoinError(err instanceof Error ? err.message : t('couldNotJoinContest'));
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
        {photoFile ? photoFile.name : t('choosePhoto')}
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
        <h3 className="font-display text-lg text-ink">{t('winnerOfMonth')}</h3>
        <span className="badge bg-amber text-midnight">$100</span>
      </div>
      <p className="text-xs text-ink/60 mt-1">{t('contestIntro')}</p>
      {!periodEnded && (
        <p className="text-[11px] font-mono text-ink/40 mt-1">
          {t('newQuestionAt', { countdown: countdownText })}
        </p>
      )}

      <div className="mt-4">
        <div className="bg-chalk border border-line rounded-sm p-3">
          {periodEnded ? (
            <div className="text-center py-2">
              <p className="text-2xl">🏆</p>
              {monthWinner ? (
                <p className="text-sm text-ink mt-1">
                  <strong>{monthWinner.name}</strong>
                  {t('monthWinnerSuffix', { points: monthWinner.points })}
                </p>
              ) : (
                <p className="text-sm text-ink mt-1">{t('contestEndedNoWinner')}</p>
              )}
              <p className="text-xs text-ink/50 mt-1">{t('waitingForAdminReset')}</p>
            </div>
          ) : !question ? (
            <>
              <p className="text-xs text-ink/50">
                {t('noQuestionYetCheckBack', { countdown: countdownText })}
              </p>
              {identity && (
                <button
                  onClick={clearIdentity}
                  className="mt-2 text-[11px] text-ink/40 hover:text-ink"
                >
                  {t('notYouSwitchAccount')}
                </button>
              )}
              {!identity && (
                <div className="mt-3">
                  {!showJoinForm ? (
                    <button
                      onClick={() => setShowJoinForm(true)}
                      className="btn-outline w-full text-xs"
                    >
                      {t('joinNowToBeReady')}
                    </button>
                  ) : (
                    <form onSubmit={joinOnly} className="space-y-2">
                      <input
                        required
                        placeholder={t('yourName')}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="input text-sm"
                      />
                      <input
                        required
                        type="email"
                        placeholder={t('yourEmail')}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="input text-sm"
                      />
                      <input
                        required
                        placeholder={t('phoneNumberPlaceholder')}
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="input text-sm"
                      />
                      {photoPicker}
                      {joinError && <p className="text-coral text-xs">{joinError}</p>}
                      <button disabled={joining} className="btn-primary w-full text-sm">
                        {joining ? t('joining') : t('joinNow')}
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
                  {t('alreadyAnsweredBy', { winner: question.winnerName ?? '' })}
                </p>
              ) : answerResult ? (
                <p className="text-sm text-ink mt-2">{answerResult}</p>
              ) : alreadyAttempted ? (
                <p className="text-xs text-ink/50 mt-2">{t('alreadyAnsweredToday')}</p>
              ) : identity ? (
                <form onSubmit={submitAnswer} className="mt-2 space-y-2">
                  <input
                    required
                    placeholder={t('yourAnswerPlaceholder')}
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    className="input text-sm"
                  />
                  <button disabled={submitting} className="btn-primary w-full text-sm">
                    {submitting ? t('submitting') : t('submitAnswer')}
                  </button>
                  <button
                    type="button"
                    onClick={clearIdentity}
                    className="w-full text-center text-[11px] text-ink/40 hover:text-ink"
                  >
                    {t('notYouSwitchAccount')}
                  </button>
                </form>
              ) : (
                <form onSubmit={joinAndAnswer} className="mt-2 space-y-2">
                  <input
                    required
                    placeholder={t('yourAnswerPlaceholder')}
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    className="input text-sm"
                  />
                  <input
                    required
                    placeholder={t('yourName')}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="input text-sm"
                  />
                  <input
                    required
                    type="email"
                    placeholder={t('yourEmail')}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input text-sm"
                  />
                  <input
                    required
                    placeholder={t('phoneNumberPlaceholder')}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="input text-sm"
                  />
                  {photoPicker}
                  {joinError && <p className="text-coral text-xs">{joinError}</p>}
                  <button disabled={joining} className="btn-primary w-full text-sm">
                    {joining ? t('submitting') : t('joinSubmitAnswer')}
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </div>

      <div className="mt-5">
        <p className="text-[11px] font-mono uppercase tracking-wide text-ink/40 mb-2">
          {t('leaderboard')}
        </p>
        {loading ? (
          <p className="text-xs text-ink/40">{t('loadingEllipsisShort')}</p>
        ) : contestants.length === 0 ? (
          <p className="text-xs text-ink/40">{t('noContestantsYet')}</p>
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
                          {t('pts', { points: c.points })}
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
                      <p>{t('pointsToGoal', { points: c.points, goal, pct })}</p>
                      <p>{t('rankHash', { rank: i + 1 })}</p>
                      <p>
                        {t('joinedOn', {
                          date: new Date(c.subscribedAt).toLocaleDateString(locale, {
                            dateStyle: 'medium',
                          }),
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
        {showHistory ? t('hidePastWinners') : t('seePastWinners')}
      </button>
      {showHistory && (
        <div className="mt-2 space-y-1.5">
          {history.length === 0 ? (
            <p className="text-xs text-ink/40 text-center">{t('noPastWinnersYet')}</p>
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
                <span className="font-mono">{t('pts', { points: h.points })}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
