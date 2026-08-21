import { useEffect, useState } from 'react';
import { api, SCHOOL_NAME, VideoComment, visitorIdentity } from '../lib/api';
import { useLanguage, localeFor } from '../lib/i18n';

export default function VideoComments({
  classId,
  videoRef,
  surface = 'page',
}: {
  classId: string;
  videoRef: string;
  // 'page' (default): the outer site page, which inverts with the
  // light/dark toggle (dark bg + light text in dark mode) — text-ink and
  // friends already handle that correctly. 'reading': embedded inside a
  // Module card on the student lesson reader, which sits on the reading
  // pane's fixed, non-inverting light "paper" surface (see index.css) —
  // text-ink would turn near-white there in dark mode and vanish against
  // that always-light background, which was the actual bug being fixed.
  surface?: 'page' | 'reading';
}) {
  const { language, t } = useLanguage();
  const locale = localeFor(language);
  const identity = visitorIdentity.get(classId);
  const isReading = surface === 'reading';
  const nameClass = isReading ? 'text-lessonText' : 'text-ink';
  const dateClass = isReading ? 'text-lessonTextMuted/80' : 'text-ink/40';
  const bodyClass = isReading ? 'text-lessonTextMuted' : 'text-ink/70';
  const mutedClass = isReading ? 'text-lessonTextMuted/70' : 'text-ink/40';
  const borderClass = isReading ? 'border-lessonBorder' : 'border-line';
  // The site's `amber` brand color reads well on a dark background (used
  // that way elsewhere) but fails contrast as small text on the reading
  // pane's light surface (~2:1) — a darker, still-clearly-amber/orange
  // shade keeps the instructor-reply branding while staying legible there.
  const replyNameClass = isReading ? 'text-[#B45309]' : 'text-amber';
  // The submit button was `.btn-outline` everywhere — border + text-ink
  // with no fill. On the outer page that's fine (text-ink inverts along
  // with the page's own dark background in dark mode), but on the reading
  // pane's fixed light "paper" surface (surface="reading") the same
  // near-white dark-mode text renders almost invisible against a card
  // that never goes dark. A solid amber fill sidesteps that — but text
  // must be a *fixed* dark color (text-midnight), not text-ink: amber
  // itself never inverts with the theme, so near-white dark-mode text-ink
  // on it is actually worse (~1.8:1) than the original bug. text-midnight
  // is the same fixed-dark-on-amber pattern already used for the module
  // status badges and the Next/Complete button elsewhere in this app.
  const submitButtonClass = isReading
    ? 'btn bg-amber text-midnight hover:bg-amber/90 disabled:opacity-60 disabled:cursor-not-allowed text-xs px-4 py-2'
    : 'btn-outline text-xs';
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
      setError(err instanceof Error ? err.message : t('somethingWentWrong'));
    }
  };

  return (
    <div className={`mt-4 border-t ${borderClass} pt-4`}>
      <p className={`font-mono text-xs tracking-widest ${mutedClass} uppercase mb-3`}>
        {t('comments', { count: comments.length })}
      </p>

      {loading ? (
        <p className={`text-sm ${mutedClass}`}>{t('loadingComments')}</p>
      ) : (
        <div className="space-y-3 mb-4">
          {comments.map((c) => (
            <div key={c.id} className="text-sm">
              <div className="flex items-baseline gap-2">
                <span className={`font-medium ${nameClass}`}>{c.name}</span>
                <span className={`text-[11px] font-mono ${dateClass}`}>
                  {new Date(c.createdAt).toLocaleDateString(locale, { dateStyle: 'medium' })}
                </span>
              </div>
              <p className={`${bodyClass} mt-0.5 whitespace-pre-line`}>{c.text}</p>
              {c.reply && (
                <div className="mt-2 ml-3 pl-3 border-l-2 border-amber">
                  <div className="flex items-baseline gap-2">
                    <span className={`font-medium ${replyNameClass}`}>{SCHOOL_NAME}</span>
                    {c.repliedAt && (
                      <span className={`text-[11px] font-mono ${dateClass}`}>
                        {new Date(c.repliedAt).toLocaleDateString(locale, { dateStyle: 'medium' })}
                      </span>
                    )}
                  </div>
                  <p className={`${bodyClass} mt-0.5 whitespace-pre-line`}>{c.reply}</p>
                </div>
              )}
            </div>
          ))}
          {comments.length === 0 && <p className={`text-sm ${mutedClass}`}>{t('noCommentsYet')}</p>}
        </div>
      )}

      <form onSubmit={submit} className="space-y-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
            placeholder={t('yourRegisteredEmail')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input text-sm"
          />
        </div>
        <textarea
          required
          placeholder={t('addCommentPlaceholder')}
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="input text-sm h-16"
        />
        {status === 'error' && <p className="text-coral text-xs">{error}</p>}
        <button type="submit" disabled={status === 'loading'} className={submitButtonClass}>
          {status === 'loading' ? t('posting') : t('postComment')}
        </button>
      </form>
    </div>
  );
}
