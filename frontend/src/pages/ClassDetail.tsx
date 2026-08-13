import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, ClassItem, visitorIdentity } from '../lib/api';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { ClassDetailSkeleton } from '../components/Skeletons';
import { getVideoEmbed } from '../lib/video';
import VideoComments from '../components/VideoComments';
import { useLanguage, localeFor } from '../lib/i18n';
import { seenClasses } from '../lib/seenClasses';

function formatPrice(cents: number, locale: string): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency: 'USD' }).format(cents / 100);
}

export default function ClassDetail() {
  const { id } = useParams<{ id: string }>();
  const { language, t } = useLanguage();
  const locale = localeFor(language);
  const [item, setItem] = useState<ClassItem | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [unlocked, setUnlocked] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [error, setError] = useState('');
  const [zoomLink, setZoomLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [openVideos, setOpenVideos] = useState<Set<number>>(new Set());
  const [openModules, setOpenModules] = useState<Set<string>>(new Set());
  const [openTopics, setOpenTopics] = useState<Set<string>>(new Set());
  const [confirmingPayment, setConfirmingPayment] = useState(false);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState('');

  const toggleVideo = (i: number) => {
    setOpenVideos((current) => {
      const next = new Set(current);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  const toggleModule = (id: string) => {
    setOpenModules((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleTopic = (id: string) => {
    setOpenTopics((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  useEffect(() => {
    if (!id) return;

    // Stripe redirects back here with ?payment=success|cancelled — strip it
    // immediately so a page refresh doesn't re-trigger the retry logic below.
    const params = new URLSearchParams(window.location.search);
    const paymentStatus = params.get('payment');
    if (paymentStatus) window.history.replaceState({}, '', window.location.pathname);

    const saved = visitorIdentity.get(id);
    if (saved) {
      setName(saved.name);
      setEmail(saved.email);

      // Right after a Stripe redirect the webhook that grants access may
      // not have landed yet — retry briefly instead of failing immediately.
      const maxAttempts = paymentStatus === 'success' ? 6 : 1;
      if (paymentStatus === 'success') setConfirmingPayment(true);

      const attemptRegister = (attempt: number) => {
        api
          .register(id, saved.name, saved.email)
          .then((res) => {
            // Only unlock once registration actually succeeds — a visitor
            // who abandoned a payment mid-checkout still has a saved
            // identity locally, but must not see gated content until the
            // backend confirms they actually have access.
            setZoomLink(res.zoomLink ?? '');
            setItem((current) =>
              current
                ? {
                    ...current,
                    registrationCount: res.registrationCount,
                    registeredNames: res.alreadyRegistered
                      ? current.registeredNames
                      : [...(current.registeredNames ?? []), saved.name],
                    // The public fetch only ever returns the curriculum
                    // preview (no lesson content) — this response is the
                    // one place the full, unlocked version is delivered.
                    curriculumModules: res.curriculumModules ?? current.curriculumModules,
                  }
                : current,
            );
            setUnlocked(true);
            setConfirmingPayment(false);
          })
          .catch(() => {
            if (attempt < maxAttempts) {
              setTimeout(() => attemptRegister(attempt + 1), 1500);
            } else {
              setConfirmingPayment(false);
            }
          });
      };
      attemptRegister(1);
    }

    api
      .getClass(id)
      .then((data) => {
        setItem(data);
        // First module expanded by default, matching a modern
        // bootcamp/university curriculum accordion.
        if (data.curriculumModules?.[0]) setOpenModules(new Set([data.curriculumModules[0].id]));
        // Marks the class, and every video currently on it, as seen — if
        // the admin later adds another video, only that one shows up as
        // a new notification.
        seenClasses.markClassVisited(data);
      })
      .catch(() => setNotFound(true));
  }, [id]);

  const handlePay = async () => {
    if (!id || !item) return;
    if (!name.trim() || !email.trim()) {
      setPayError(t('fillNameEmailFirst'));
      return;
    }
    setPayError('');
    setPaying(true);
    try {
      // Save identity now so the return trip from Stripe can look it up —
      // handleRegister only unlocks once the backend confirms access, so
      // saving this early doesn't grant anything by itself.
      visitorIdentity.set(id, { name: name.trim(), email: email.trim() });
      const { url } = await api.createCheckout(id, email.trim(), window.location.origin);
      window.location.href = url;
    } catch (err) {
      setPaying(false);
      setPayError(err instanceof Error ? err.message : t('somethingWentWrong'));
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setStatus('loading');
    setError('');
    try {
      const res = await api.register(id, name, email);
      visitorIdentity.set(id, { name, email });
      setZoomLink(res.zoomLink ?? '');
      setItem((current) =>
        current
          ? {
              ...current,
              registrationCount: res.registrationCount,
              registeredNames: res.alreadyRegistered
                ? current.registeredNames
                : [...(current.registeredNames ?? []), name],
              curriculumModules: res.curriculumModules ?? current.curriculumModules,
            }
          : current,
      );
      setUnlocked(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : t('somethingWentWrong');
      setStatus('error');
      setError(message);
    }
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(zoomLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (notFound) {
    return (
      <div className="min-h-screen bg-chalk flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center text-center px-6">
          <div>
            <p className="font-display text-2xl text-ink">{t('classNotFound')}</p>
            <Link to="/" className="text-amber font-semibold mt-3 inline-block">
              {t('backToAllClasses')}
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="min-h-screen bg-chalk flex flex-col">
        <Header />
        <ClassDetailSkeleton />
        <Footer />
      </div>
    );
  }

  const renderResourceLinks = (
    pdfUrl?: string,
    imageUrl?: string,
    pdfName?: string,
    imageName?: string,
  ) => {
    if (!pdfUrl && !imageUrl) return null;
    return (
      <div className="mt-3 flex flex-wrap gap-2">
        {pdfUrl && (
          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            download
            className="btn-outline text-xs px-3 py-1.5"
          >
            {t('downloadPdf', { name: pdfName || t('defaultPdfName') })}
          </a>
        )}
        {imageUrl && (
          <a
            href={imageUrl}
            target="_blank"
            rel="noopener noreferrer"
            download
            className="btn-outline text-xs px-3 py-1.5"
          >
            {t('downloadPicture', { name: imageName || t('defaultPictureName') })}
          </a>
        )}
      </div>
    );
  };

  // A block's contentBlocks are only ever present once access is proven
  // (see ClassesService.toPublicShape / RegistrationsService.register) — so
  // this simply renders whatever the API actually sent.
  const renderContentBlock = (
    block: { id: string; type: string; content?: string; label?: string },
    key: string,
  ) => {
    switch (block.type) {
      case 'heading':
        return (
          <h4 key={key} className="font-display text-base text-ink">
            {block.content}
          </h4>
        );
      case 'divider':
        return <hr key={key} className="border-line" />;
      case 'image':
        return (
          <figure key={key}>
            <img
              src={block.content}
              alt={block.label || ''}
              className="w-full rounded-sm border border-line"
            />
            {block.label && <figcaption className="text-xs text-ink/50 mt-1">{block.label}</figcaption>}
          </figure>
        );
      case 'video': {
        const embed = block.content ? getVideoEmbed(block.content) : null;
        return (
          <div key={key}>
            {block.label && <p className="text-sm font-medium text-ink mb-1.5">{block.label}</p>}
            {embed ? (
              embed.kind === 'file' ? (
                <video
                  src={embed.src}
                  controls
                  className="w-full h-56 sm:h-64 object-cover rounded-sm bg-black"
                />
              ) : (
                <div className="w-full aspect-video rounded-sm overflow-hidden bg-black">
                  <iframe
                    src={embed.src}
                    title={block.label || 'Lesson video'}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              )
            ) : (
              <p className="text-sm text-coral">{t('unplayableVideo', { url: block.content ?? '' })}</p>
            )}
          </div>
        );
      }
      case 'code':
        return (
          <div key={key}>
            {block.label && (
              <p className="text-[11px] font-mono text-ink/40 uppercase mb-1">{block.label}</p>
            )}
            <pre className="bg-midnight text-chalk rounded-sm p-3 overflow-x-auto text-xs font-mono whitespace-pre">
              {block.content}
            </pre>
          </div>
        );
      case 'resource':
        return (
          <a
            key={key}
            href={block.content}
            target="_blank"
            rel="noopener noreferrer"
            download
            className="btn-outline text-xs px-3 py-1.5 inline-block"
          >
            {block.label || t('downloadResource')}
          </a>
        );
      case 'exercise':
        return (
          <div key={key} className="bg-chalk border border-amber/40 rounded-sm p-3">
            <p className="text-[11px] font-mono uppercase tracking-wide text-amber mb-1">
              {t('exerciseLabel')}
            </p>
            <p className="text-sm text-ink/80 whitespace-pre-line">{block.content}</p>
          </div>
        );
      case 'text':
      default:
        return (
          <p key={key} className="text-sm text-ink/80 leading-relaxed whitespace-pre-line">
            {block.content}
          </p>
        );
    }
  };

  // Marketing curriculum — module/topic titles + descriptions are always
  // visible, even pre-purchase/unlock (see ClassesService.toPublicShape,
  // which never gates those). The actual lesson content inside a topic
  // (contentBlocks) is only present once access is proven, so a topic
  // with content simply renders as an inner accordion; without it, as the
  // same plain bullet the curriculum preview has always shown. Hidden
  // entirely when the admin hasn't added any modules.
  const renderCurriculum = () => {
    if (!item.curriculumModules || item.curriculumModules.length === 0) return null;
    return (
      <div className="mt-6">
        <p className="font-mono text-xs tracking-widest text-ink/40 uppercase">
          {t('whatYoullLearn')}
        </p>
        <p className="text-sm text-ink/60 mt-1">{t('curriculumIntro')}</p>
        <div className="mt-3 space-y-2">
          {item.curriculumModules.map((mod, i) => {
            const isOpen = openModules.has(mod.id);
            return (
              <div key={mod.id} className="border border-line rounded-sm overflow-hidden bg-surface">
                <button
                  type="button"
                  onClick={() => toggleModule(mod.id)}
                  className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left"
                >
                  <span className="text-sm font-medium text-ink">
                    M{i + 1}: {mod.title}
                  </span>
                  <span
                    className={`text-ink/50 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`}
                    aria-hidden="true"
                  >
                    ▾
                  </span>
                </button>
                {isOpen && (
                  <div className="border-t border-line p-4 space-y-3">
                    {mod.objective && (
                      <div>
                        <p className="text-xs font-semibold text-ink/60">
                          {t('moduleObjectiveLabel')}
                        </p>
                        <p className="text-sm text-ink/80 mt-0.5 leading-relaxed whitespace-pre-line">
                          {mod.objective}
                        </p>
                      </div>
                    )}
                    {mod.topics.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-ink/60">{t('moduleTopicsLabel')}</p>
                        <div className="mt-1 space-y-1.5">
                          {mod.topics.map((topic) => {
                            const hasContent = (topic.contentBlocks?.length ?? 0) > 0;
                            if (!hasContent) {
                              return (
                                <div key={topic.id} className="text-sm text-ink/80 flex items-start gap-2">
                                  <span className="text-amber mt-1 flex-shrink-0" aria-hidden="true">
                                    •
                                  </span>
                                  <div>
                                    <span>{topic.title}</span>
                                    {topic.description && (
                                      <p className="text-xs text-ink/60 mt-0.5">{topic.description}</p>
                                    )}
                                  </div>
                                </div>
                              );
                            }
                            const topicOpen = openTopics.has(topic.id);
                            return (
                              <div
                                key={topic.id}
                                className="border border-line/70 rounded-sm overflow-hidden bg-chalk"
                              >
                                <button
                                  type="button"
                                  onClick={() => toggleTopic(topic.id)}
                                  className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left"
                                >
                                  <span className="text-sm text-ink">{topic.title}</span>
                                  <span
                                    className={`text-ink/50 text-xs transition-transform flex-shrink-0 ${topicOpen ? 'rotate-180' : ''}`}
                                    aria-hidden="true"
                                  >
                                    ▾
                                  </span>
                                </button>
                                {topicOpen && (
                                  <div className="border-t border-line p-3 space-y-3">
                                    {topic.description && (
                                      <p className="text-xs text-ink/60">{topic.description}</p>
                                    )}
                                    {topic.contentBlocks!.map((block, bi) =>
                                      renderContentBlock(block, `${topic.id}-${bi}`),
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {mod.project && (
                      <div>
                        <p className="text-xs font-semibold text-ink/60">{t('moduleProjectLabel')}</p>
                        <p className="text-sm text-ink/80 mt-0.5 leading-relaxed whitespace-pre-line">
                          {mod.project}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const date = item.classDate ? new Date(item.classDate) : null;
  const videoEmbed = item.videoUrl ? getVideoEmbed(item.videoUrl) : null;
  const gated = !item.isPast && !unlocked;

  const renderMainMedia = () => {
    if (videoEmbed) {
      return videoEmbed.kind === 'file' ? (
        <video
          src={videoEmbed.src}
          controls
          className="w-full h-56 sm:h-72 object-cover rounded-sm border border-line mt-4 bg-black"
        />
      ) : (
        <div className="w-full aspect-video rounded-sm border border-line mt-4 overflow-hidden bg-black">
          <iframe
            src={videoEmbed.src}
            title={`${item.title} — marketing video`}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      );
    }
    return (
      <img
        src={item.imageUrl}
        alt={item.title}
        className="w-full h-56 sm:h-72 object-cover rounded-sm border border-line mt-4"
      />
    );
  };

  return (
    <div className="min-h-screen bg-chalk flex flex-col">
      <Header />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-10 w-full flex-1 animate-fade-in">
        <Link to="/" className="text-xs font-mono text-ink/50 hover:text-ink">
          {t('allClasses')}
        </Link>

        <div className="flex items-center gap-3 mt-4 flex-wrap">
          {date ? (
            <>
              <span className="badge bg-ink text-chalk">
                {date.toLocaleDateString(locale, { dateStyle: 'medium' })}
              </span>
              <span className="font-mono text-xs text-ink/60">
                {date.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' })}
              </span>
            </>
          ) : (
            <span className="badge bg-ink text-chalk">{t('selfPaced')}</span>
          )}
          {item.isPast && <span className="badge bg-sage text-chalk">{t('past')}</span>}
          {item.isPaid && <span className="badge bg-amber text-midnight">{t('paid')}</span>}
        </div>

        <h1 className="font-display text-2xl sm:text-3xl md:text-4xl text-ink mt-4">
          {item.title}
        </h1>

        {gated && item.isPaid && (
          <div>
            {renderMainMedia()}
            <p className="text-ink/70 mt-4 leading-relaxed whitespace-pre-line">
              {item.description}
            </p>
            {renderCurriculum()}
          </div>
        )}

        {gated ? (
          <div className="mt-6 max-w-sm">
            {zoomLink ? (
              <div className="bg-surface border border-line rounded-sm p-5">
                <div className="text-3xl mb-2">✓</div>
                <h2 className="font-display text-xl text-ink">{t('youreIn')}</h2>
                <p className="text-ink/70 text-sm mt-2">{t('copyZoomHint')}</p>
                <div className="mt-4 flex items-center gap-2 bg-chalk border border-line rounded-sm p-2">
                  <input
                    readOnly
                    value={zoomLink}
                    onFocus={(e) => e.target.select()}
                    className="flex-1 min-w-0 text-sm font-mono text-ink/80 bg-transparent px-2 py-1 focus:outline-none"
                  />
                  <button onClick={copyLink} className="btn-primary text-sm px-4 py-2 flex-shrink-0">
                    {copied ? t('copied') : t('copy')}
                  </button>
                </div>
              </div>
            ) : confirmingPayment ? (
              <div className="bg-surface border border-line rounded-sm p-5 text-center">
                <div className="text-3xl mb-2">⏳</div>
                <p className="text-ink/70 text-sm">{t('confirmingPayment')}</p>
              </div>
            ) : (
              <div className="bg-surface border border-line rounded-sm p-5">
                <p className="text-ink/70 text-sm">
                  {item.isPaid ? t('paidGateText') : t('freeGateText')}
                </p>
                <form onSubmit={submit} className="mt-4 space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-ink/80 mb-1">{t('fullName')}</label>
                    <input
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="input"
                      placeholder="Jane Doe"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-ink/80 mb-1">{t('email')}</label>
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
                  {payError && <p className="text-coral text-sm">{payError}</p>}
                  {item.isPaid && item.priceCents ? (
                    <>
                      <button
                        type="button"
                        onClick={handlePay}
                        disabled={paying || status === 'loading'}
                        className="btn-primary w-full"
                      >
                        {paying
                          ? t('startingCheckout')
                          : t('payWithCardOrPaypal', { price: formatPrice(item.priceCents, locale) })}
                      </button>
                      <button
                        type="submit"
                        disabled={status === 'loading' || paying}
                        className="btn-outline w-full text-sm"
                      >
                        {status === 'loading' ? t('checking') : t('alreadyPurchasedUnlock')}
                      </button>
                    </>
                  ) : (
                    <button type="submit" disabled={status === 'loading'} className="btn-primary w-full">
                      {status === 'loading'
                        ? t('checking')
                        : item.isPaid
                          ? t('unlockThisClass')
                          : t('registerToUnlock')}
                    </button>
                  )}
                </form>
              </div>
            )}
          </div>
        ) : (
          <>
            {renderMainMedia()}

            {item.videoNotes && (
              <div className="mt-4 bg-surface border border-line rounded-sm p-4">
                <p className="font-mono text-xs tracking-widest text-ink/40 uppercase mb-2">
                  {t('studyNotes')}
                </p>
                <p className="text-sm text-ink/80 leading-relaxed whitespace-pre-line">
                  {item.videoNotes}
                </p>
              </div>
            )}
            {renderResourceLinks(
              item.videoPdfUrl,
              item.videoResourceImageUrl,
              item.videoPdfName,
              item.videoResourceImageName,
            )}

            {item.videoUrl && <VideoComments classId={item.id} videoRef="main" />}

            <p className="text-ink/70 mt-4 leading-relaxed whitespace-pre-line">
              {item.description}
            </p>
            {renderCurriculum()}

            {item.extraVideos && item.extraVideos.length > 0 && (
              <div className="mt-6 space-y-2">
                <p className="font-mono text-xs tracking-widest text-ink/40 uppercase">
                  {t('moreVideos')}
                </p>
                {item.extraVideos.map((video, i) => {
                  const embed = getVideoEmbed(video.url);
                  const isOpen = openVideos.has(i);
                  return (
                    <div
                      key={video.id}
                      className="border border-line rounded-sm overflow-hidden bg-surface"
                    >
                      <button
                        type="button"
                        onClick={() => toggleVideo(i)}
                        className="w-full flex items-center justify-between px-4 py-3 text-left"
                      >
                        <span className="text-sm font-medium text-ink">{video.title}</span>
                        <span
                          className={`text-ink/50 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                          aria-hidden="true"
                        >
                          ▾
                        </span>
                      </button>
                      {isOpen && (
                        <div className="border-t border-line p-3">
                          {embed ? (
                            embed.kind === 'file' ? (
                              <video
                                src={embed.src}
                                controls
                                className="w-full h-56 sm:h-64 object-cover rounded-sm bg-black"
                              />
                            ) : (
                              <div className="w-full aspect-video rounded-sm overflow-hidden bg-black">
                                <iframe
                                  src={embed.src}
                                  title={`${item.title} — ${video.title}`}
                                  className="w-full h-full"
                                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                  allowFullScreen
                                />
                              </div>
                            )
                          ) : (
                            <p className="text-sm text-coral">{t('unplayableVideo', { url: video.url })}</p>
                          )}
                          {video.notes && (
                            <div className="mt-3 bg-chalk border border-line rounded-sm p-3">
                              <p className="font-mono text-xs tracking-widest text-ink/40 uppercase mb-1.5">
                                {t('studyNotes')}
                              </p>
                              <p className="text-sm text-ink/80 leading-relaxed whitespace-pre-line">
                                {video.notes}
                              </p>
                            </div>
                          )}
                          {renderResourceLinks(video.pdfUrl, video.imageUrl, video.pdfName, video.imageName)}
                          <VideoComments classId={item.id} videoRef={video.id} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {zoomLink && (
              <div className="mt-6 bg-surface border border-line rounded-sm p-4">
                <p className="text-xs font-mono uppercase tracking-widest text-ink/40 mb-2">
                  {t('yourZoomLink')}
                </p>
                <div className="flex items-center gap-2 bg-chalk border border-line rounded-sm p-2">
                  <input
                    readOnly
                    value={zoomLink}
                    onFocus={(e) => e.target.select()}
                    className="flex-1 min-w-0 text-sm font-mono text-ink/80 bg-transparent px-2 py-1 focus:outline-none"
                  />
                  <button onClick={copyLink} className="btn-primary text-sm px-4 py-2 flex-shrink-0">
                    {copied ? t('copied') : t('copy')}
                  </button>
                </div>
              </div>
            )}

            {!zoomLink && item.zoomLink && (
              <p className="mt-6 text-sm font-mono text-ink/60">
                {t('zoomLinkLabel')}{' '}
                <a href={item.zoomLink} className="text-amber hover:text-coral">
                  {item.zoomLink}
                </a>
              </p>
            )}

            <div className="mt-8 border-t border-line pt-6">
              <span className="font-mono text-sm text-ink/60 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-sage" />
                {t('peopleRegistered', { count: item.registrationCount })}
              </span>
            </div>

            {item.registeredNames && item.registeredNames.length > 0 && (
              <div className="mt-6">
                <p className="font-mono text-xs tracking-widest text-ink/40 uppercase mb-2">
                  {t('whosRegistered')}
                </p>
                <div className="flex flex-wrap gap-2">
                  {item.registeredNames.map((personName, i) => (
                    <span
                      key={i}
                      className="badge bg-surface border border-line text-ink/70 normal-case tracking-normal"
                    >
                      {personName}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <Footer />
    </div>
  );
}
