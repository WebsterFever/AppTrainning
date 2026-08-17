import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, ClassItem, ContentBlock, ModuleAccess, visitorIdentity } from '../lib/api';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { ClassDetailSkeleton } from '../components/Skeletons';
import { getVideoEmbed } from '../lib/video';
import VideoComments from '../components/VideoComments';
import RobotTeacher from '../components/RobotTeacher';
import GuidedVideoTeacher from '../components/GuidedVideoTeacher';
import { TeacherCue } from '../lib/api';
import { useLanguage, localeFor } from '../lib/i18n';
import { seenClasses } from '../lib/seenClasses';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import SubtopicProgressPanel, { ProgressBar, SubtopicSeqEntry } from '../components/SubtopicProgressPanel';

function formatPrice(cents: number, locale: string): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency: 'USD' }).format(cents / 100);
}

// Guards the "watch original link" fallback — an unparseable video URL
// might not even be a URL at all (e.g. pasted into the wrong field), so
// only link out when it's actually http(s).
function isHttpUrl(value?: string): boolean {
  return !!value && /^https?:\/\//i.test(value.trim());
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
  const [moduleAccess, setModuleAccess] = useState<ModuleAccess[]>([]);
  const [projectDrafts, setProjectDrafts] = useState<Record<string, { githubUrl: string; notes: string }>>({});
  const [submittingModuleId, setSubmittingModuleId] = useState<string | null>(null);
  const [submitErrors, setSubmitErrors] = useState<Record<string, string>>({});
  // Subtopic progress — persisted server-side (see api.completeSubtopic),
  // never just from opening a Subtopic. `activeSubtopicByModule` is purely
  // local "which Subtopic is currently being viewed" navigation state (not
  // persisted); it defaults to the first incomplete Subtopic in that
  // Module's sequence, which is why progress still "resumes" naturally
  // after a refresh even though the exact scroll position isn't saved.
  const [completedSubtopicIds, setCompletedSubtopicIds] = useState<Set<string>>(new Set());
  const [activeSubtopicByModule, setActiveSubtopicByModule] = useState<Record<string, string>>({});
  const [savingSubtopicId, setSavingSubtopicId] = useState<string | null>(null);

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

  // Flat, ordered list of every Subtopic across every Topic in one Module —
  // this is the "linear path" Next/Previous walk along, crossing Topic
  // boundaries transparently once a Topic's Subtopics are exhausted.
  // Topics without Subtopics (the original flat-content shape) simply
  // contribute nothing here, so a Module that hasn't adopted Subtopics yet
  // has an empty sequence and none of this progress UI applies to it.
  const getModuleSequence = (mod: NonNullable<ClassItem['curriculumModules']>[number]): SubtopicSeqEntry[] =>
    mod.topics.flatMap((topic) =>
      (topic.subtopics ?? [])
        .filter((st) => (st.contentBlocks?.length ?? 0) > 0)
        .map((st) => ({
          id: st.id,
          topicId: topic.id,
          title: st.title ?? '',
          description: st.description,
          contentBlocks: st.contentBlocks as ContentBlock[] | undefined,
        })),
    );

  // Resumes at the first incomplete Subtopic (or the last one, once every
  // Subtopic in the Module is done) unless the student has already
  // navigated somewhere else in this session.
  const getActiveSubtopicId = (moduleId: string, sequence: SubtopicSeqEntry[]): string | null => {
    if (sequence.length === 0) return null;
    const chosen = activeSubtopicByModule[moduleId];
    if (chosen && sequence.some((e) => e.id === chosen)) return chosen;
    const firstIncomplete = sequence.find((e) => !completedSubtopicIds.has(e.id));
    return (firstIncomplete ?? sequence[sequence.length - 1]).id;
  };

  const navigateSubtopic = (moduleId: string, subtopicId: string) => {
    setActiveSubtopicByModule((current) => ({ ...current, [moduleId]: subtopicId }));
  };

  // Marks the given Subtopic complete server-side, then advances to the
  // next one in the Module's sequence (or stays put if it was the last —
  // the button becomes a harmless re-confirm at that point).
  const completeAndAdvanceSubtopic = async (moduleId: string, sequence: SubtopicSeqEntry[], subtopicId: string) => {
    if (!id) return;
    setSavingSubtopicId(subtopicId);
    try {
      const result = await api.completeSubtopic(id, subtopicId, email);
      setCompletedSubtopicIds(new Set(result.completedSubtopicIds));
      const idx = sequence.findIndex((e) => e.id === subtopicId);
      const next = idx >= 0 ? sequence[idx + 1] : undefined;
      if (next) navigateSubtopic(moduleId, next.id);
    } catch {
      // Transient network hiccup — the button re-enables and the student
      // can just click Next again; nothing was silently lost since
      // completion only ever happens on this explicit call.
    } finally {
      setSavingSubtopicId(null);
    }
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
            setModuleAccess(res.moduleAccess ?? []);
            setCompletedSubtopicIds(new Set(res.completedSubtopicIds ?? []));
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
      setModuleAccess(res.moduleAccess ?? []);
      setCompletedSubtopicIds(new Set(res.completedSubtopicIds ?? []));
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

  const submitProject = async (moduleId: string) => {
    if (!id) return;
    const draft = projectDrafts[moduleId] ?? { githubUrl: '', notes: '' };
    if (!draft.githubUrl.trim()) return;
    setSubmittingModuleId(moduleId);
    setSubmitErrors((current) => ({ ...current, [moduleId]: '' }));
    try {
      await api.submitModuleProject(id, moduleId, name, email, draft.githubUrl.trim(), draft.notes.trim());
      // Submitting never unlocks anything by itself — only admin approval
      // does. Re-registering (idempotent) picks up the new pending status
      // and, on a later visit after approval, the next unlocked module.
      const res = await api.register(id, name, email);
      setItem((current) =>
        current ? { ...current, curriculumModules: res.curriculumModules ?? current.curriculumModules } : current,
      );
      setModuleAccess(res.moduleAccess ?? []);
      setCompletedSubtopicIds(new Set(res.completedSubtopicIds ?? []));
    } catch (err) {
      setSubmitErrors((current) => ({
        ...current,
        [moduleId]: err instanceof Error ? err.message : t('somethingWentWrong'),
      }));
    } finally {
      setSubmittingModuleId(null);
    }
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

  // Matches an http(s) URL up to the next whitespace — query strings and
  // paths (?page=2, /docs, etc.) are just non-whitespace characters so
  // they're captured naturally, no special-casing needed.
  const URL_PATTERN = /(https?:\/\/[^\s]+)/g;
  // Sentence punctuation that's almost never actually part of a URL when it
  // trails one ("Visit https://openai.com." — the period belongs to the
  // sentence, not the link). Deliberately excludes closing brackets/parens
  // since some real URLs legitimately end in those (e.g. Wikipedia's
  // `_(disambiguation)` links) and guessing wrong there is worse than just
  // leaving a trailing `.`/`,`/`!` off the clickable part.
  const TRAILING_PUNCTUATION = /[.,;:!?"']+$/;

  // **double asterisks** — the one Markdown emphasis admins are asked to
  // use for titles/key steps/emphasized phrases. `[^*]+` (no asterisks
  // inside) keeps this simple and unambiguous rather than implementing a
  // real Markdown parser for one feature.
  const BOLD_PATTERN = /(\*\*[^*]+\*\*)/g;

  // Splits a plain-text (non-bold) chunk on URLs and returns an array of
  // strings/<a> nodes — no dangerouslySetInnerHTML, so this is exactly as
  // safe against injection as rendering the text alone was. `keyPrefix`
  // keeps React keys unique when this runs once per bold/non-bold segment
  // instead of once per whole block.
  const linkifyUrls = (text: string, keyPrefix: string): React.ReactNode[] => {
    const segments = text.split(URL_PATTERN);
    const nodes: React.ReactNode[] = [];
    segments.forEach((segment, i) => {
      if (!segment) return;
      if (!/^https?:\/\//.test(segment)) {
        nodes.push(segment);
        return;
      }
      const trailingMatch = segment.match(TRAILING_PUNCTUATION);
      const trailing = trailingMatch ? trailingMatch[0] : '';
      const url = trailing ? segment.slice(0, -trailing.length) : segment;
      nodes.push(
        <a
          key={`${keyPrefix}-link-${i}`}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-amber underline underline-offset-2 hover:text-coral break-words"
        >
          {url}
        </a>,
      );
      if (trailing) nodes.push(trailing);
    });
    return nodes;
  };

  // Renders a Text block's content: **bold** spans become <strong>, and
  // URLs are linkified both inside and outside them — still no
  // dangerouslySetInnerHTML, whitespace-pre-line on the containing element
  // (see the 'text' case below) still does all paragraph/line-break
  // preservation. This only ever touches the ** markers and URL
  // substrings, so the admin's saved text is never altered — only how it's
  // displayed.
  const renderFormattedText = (text: string): React.ReactNode[] => {
    const segments = text.split(BOLD_PATTERN);
    const nodes: React.ReactNode[] = [];
    segments.forEach((segment, i) => {
      if (!segment) return;
      const boldMatch = segment.match(/^\*\*([^*]+)\*\*$/);
      if (boldMatch) {
        nodes.push(<strong key={`bold-${i}`}>{linkifyUrls(boldMatch[1], `bold-${i}`)}</strong>);
      } else {
        nodes.push(...linkifyUrls(segment, `plain-${i}`));
      }
    });
    return nodes;
  };

  // react-syntax-highlighter's Prism build (refractor) already recognizes
  // most language names/aliases case-insensitively (e.g. "Typescript",
  // "ts", "html" all resolve correctly on their own) — this only maps the
  // handful of spellings that wouldn't otherwise match, chiefly "C#" (the
  // literal # isn't a valid Prism alias key).
  const CODE_LANGUAGE_ALIASES: Record<string, string> = {
    'c#': 'csharp',
    csharp: 'csharp',
    cs: 'csharp',
    'objective-c': 'objectivec',
  };

  // Admins type the language into a Code block's `label` (see
  // ContentBlocksEditor's "Language (optional, e.g. javascript)" field) —
  // `block.language` is an ai_teacher-only field and is never set for code
  // blocks, so it's only checked here as a defensive fallback.
  const normalizeCodeLanguage = (label?: string, language?: string): string => {
    const raw = (label || language || 'html').trim().toLowerCase();
    return CODE_LANGUAGE_ALIASES[raw] ?? raw;
  };

  // A block's contentBlocks are only ever present once access is proven
  // (see ClassesService.toPublicShape / RegistrationsService.register) — so
  // this simply renders whatever the API actually sent.
  const renderContentBlock = (
    block: {
      id: string;
      type: string;
      content?: string;
      label?: string;
      language?: 'en' | 'fr' | 'ht';
      voice?: string;
      rate?: number;
      avatarStyle?: string;
      instructions?: string;
      showScript?: boolean;
      audioStatus?: 'none' | 'generating' | 'ready' | 'failed';
      audioStale?: boolean;
      guidedTeacherEnabled?: boolean;
      guidedTeacherCues?: TeacherCue[];
      guidedVideoGeneration?: { status: string };
    },
    key: string,
  ) => {
    switch (block.type) {
      case 'ai_teacher':
        return <RobotTeacher key={key} block={block} classId={item.id} studentEmail={email} />;
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
        // An auto-generated coding video (see GuidedVideoGenerator) is a
        // silent MP4 streamed from a protected endpoint, never the block's
        // own `content` URL — it takes priority over a manually-entered
        // video link once rendering has succeeded.
        const generatedReady = block.guidedVideoGeneration?.status === 'ready';
        const generatedSrc = generatedReady ? api.generatedVideoUrl(item.id, block.id, email) : undefined;
        const embed = block.content ? getVideoEmbed(block.content) : null;
        const guidedCues = block.guidedTeacherEnabled ? (block.guidedTeacherCues ?? []) : [];
        const fileSrc = generatedSrc ?? (embed?.kind === 'file' ? embed.src : undefined);
        if (fileSrc && guidedCues.length > 0) {
          return (
            <GuidedVideoTeacher
              key={key}
              videoSrc={fileSrc}
              label={block.label}
              cues={guidedCues}
              classId={item.id}
              blockId={block.id}
              studentEmail={email}
              fixedAspectRatio={fileSrc === generatedSrc}
            />
          );
        }
        return (
          <div key={key}>
            {block.label && <p className="text-sm font-medium text-ink mb-1.5">{block.label}</p>}
            {block.guidedTeacherEnabled && guidedCues.length > 0 && !fileSrc && embed && embed.kind !== 'file' && (
              <p className="text-xs text-ink/50 bg-chalk border border-line rounded-sm p-2 mb-1.5">
                {t('guidedNarrationUnavailable')}
              </p>
            )}
            {fileSrc ? (
              <video
                src={fileSrc}
                controls
                className={
                  fileSrc === generatedSrc
                    ? 'w-full aspect-video max-w-full object-contain rounded-sm bg-black mx-auto'
                    : 'w-full h-56 sm:h-64 object-cover rounded-sm bg-black'
                }
              />
            ) : embed ? (
              // embed.kind === 'file' is already handled by fileSrc above.
              <div className="w-full aspect-video rounded-sm overflow-hidden bg-black">
                <iframe
                  src={embed.src}
                  title={block.label || 'Lesson video'}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            ) : (
              <div className="text-sm text-ink/60 bg-chalk border border-line rounded-sm p-3">
                <p>{t('videoUnavailable')}</p>
                {isHttpUrl(block.content) && (
                  <a
                    href={block.content}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-amber hover:text-coral text-xs mt-1 inline-block"
                  >
                    {t('watchOriginalLink')} ↗
                  </a>
                )}
              </div>
            )}
          </div>
        );
      }
   case 'code':
  return (
    <div
      key={key}
      className="
        overflow-hidden
        rounded-xl
        border border-[#30363d]
        bg-[#0d1117]
        shadow-lg
      "
    >
      {/* Code header */}
      <div
        className="
          flex items-center justify-between
          px-4 py-2.5
          bg-[#161b22]
          border-b border-[#30363d]
        "
      >
        <div className="flex items-center gap-2">
          <span className="text-[#8b949e] text-xs">⌑</span>

          <span className="text-xs font-semibold text-[#c9d1d9]">
            {block.label || block.language || 'Code'}
          </span>
        </div>

        <button
          type="button"
          onClick={() =>
            navigator.clipboard.writeText(block.content || '')
          }
          className="
            px-3 py-1.5
            rounded-md
            text-xs
            text-[#8b949e]
            transition-colors
            hover:bg-[#30363d]
            hover:text-white
          "
          title="Copy code"
        >
          Copy
        </button>
      </div>

      {/* Syntax-highlighted code */}
      <div className="overflow-x-auto bg-[#0d1117]">
        <SyntaxHighlighter
          language={normalizeCodeLanguage(
            block.label,
            block.language
          )}
          style={vscDarkPlus}
          showLineNumbers
          wrapLongLines={false}
          customStyle={{
            margin: 0,
            padding: '16px 0 20px',
            background: '#0d1117',
            fontSize: '14px',
            lineHeight: '1.7',
          }}
          codeTagProps={{
            style: {
              fontFamily:
                '"JetBrains Mono", "Fira Code", Consolas, Monaco, monospace',
            },
          }}
          lineNumberStyle={{
            minWidth: '3.5em',
            paddingRight: '18px',
            paddingLeft: '12px',
            color: '#484f58',
            textAlign: 'right',
            userSelect: 'none',
          }}
        >
          {block.content || ''}
        </SyntaxHighlighter>
      </div>
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
            {renderFormattedText(block.content ?? '')}
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
  const renderCurriculum = (allowComments: boolean) => {
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
            const access = allowComments ? moduleAccess.find((a) => a.moduleId === mod.id) : undefined;
            // Absence of an access entry (e.g. course has no submission
            // gating configured yet) defaults to unlocked, matching prior
            // behavior — locking only kicks in once module-access data
            // exists for this student.
            const isUnlocked = !access || access.unlocked;
            const submission = access?.submission;
            // Flat cross-Topic Subtopic sequence for this Module — empty
            // for a Module that hasn't adopted Subtopics yet (including
            // the pre-registration preview, whose Subtopics are stripped
            // of contentBlocks), so the progress badge naturally doesn't
            // appear until there's real, unlocked lesson content to track.
            const moduleSequence = getModuleSequence(mod);
            const moduleCompletedCount = moduleSequence.filter((e) => completedSubtopicIds.has(e.id)).length;
            const moduleProgressPercent =
              moduleSequence.length > 0 ? Math.round((moduleCompletedCount / moduleSequence.length) * 100) : null;
            const activeSubtopicId = getActiveSubtopicId(mod.id, moduleSequence);
            return (
              <div key={mod.id} className="border border-line rounded-sm overflow-hidden bg-surface">
                <button
                  type="button"
                  onClick={() => toggleModule(mod.id)}
                  className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left"
                >
                  <span className="text-sm font-medium text-ink flex items-center gap-2 flex-wrap">
                    M{i + 1}: {mod.title}
                    {moduleProgressPercent !== null && (
                      <ProgressBar percent={moduleProgressPercent} completed={moduleProgressPercent === 100} />
                    )}
                    {allowComments && !isUnlocked && (
                      <span className="badge bg-line text-ink/60 normal-case tracking-normal">
                        {t('moduleLocked')}
                      </span>
                    )}
                    {allowComments && isUnlocked && submission?.status === 'approved' && (
                      <span className="badge bg-sage text-chalk normal-case tracking-normal">
                        {t('moduleApproved')}
                      </span>
                    )}
                    {allowComments && isUnlocked && submission?.status === 'pending' && (
                      <span className="badge bg-amber text-midnight normal-case tracking-normal">
                        {t('modulePending')}
                      </span>
                    )}
                    {allowComments && isUnlocked && submission?.status === 'changes_requested' && (
                      <span className="badge bg-coral text-chalk normal-case tracking-normal">
                        {t('moduleNeedsChanges')}
                      </span>
                    )}
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
                            // A topic "has content" either directly (the
                            // original, still fully supported shape) or one
                            // level deeper via subtopics — either is enough
                            // to make it collapsible/expandable rather than
                            // a plain outline bullet.
                            const hasDirectContent = (topic.contentBlocks?.length ?? 0) > 0;
                            const hasSubtopicContent = (topic.subtopics ?? []).some(
                              (st) => (st.contentBlocks?.length ?? 0) > 0,
                            );
                            const hasContent = hasDirectContent || hasSubtopicContent;
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
                            const topicSubtopics = (topic.subtopics ?? []).filter(
                              (st) => (st.contentBlocks?.length ?? 0) > 0,
                            );
                            const topicCompletedCount = topicSubtopics.filter((st) =>
                              completedSubtopicIds.has(st.id),
                            ).length;
                            const topicProgressPercent =
                              topicSubtopics.length > 0
                                ? Math.round((topicCompletedCount / topicSubtopics.length) * 100)
                                : null;
                            // Auto-expand a Topic that contains the Module's
                            // currently-active Subtopic (e.g. right after Next
                            // crosses over from the previous Topic), on top of
                            // the student's own manual toggle.
                            const containsActive = topicSubtopics.some((st) => st.id === activeSubtopicId);
                            const topicOpen = openTopics.has(topic.id) || containsActive;
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
                                  <span className="text-sm text-ink flex items-center gap-2 flex-wrap">
                                    {topic.title}
                                    {topicProgressPercent !== null && (
                                      <ProgressBar percent={topicProgressPercent} completed={topicProgressPercent === 100} />
                                    )}
                                  </span>
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
                                    {/* A topic's own direct content blocks — the original
                                        shape, unchanged for every existing course that never
                                        used subtopics. */}
                                    {topic.contentBlocks?.map((block, bi) =>
                                      renderContentBlock(block, `${topic.id}-${bi}`),
                                    )}
                                    {/* Subtopics — one nested level deeper, each with its own
                                        progress bar, rendered via the shared sequential
                                        viewer (outline + active content + Previous/Next). */}
                                    {topicSubtopics.length > 0 && (
                                      <SubtopicProgressPanel
                                        subtopics={topicSubtopics}
                                        moduleSequence={moduleSequence}
                                        activeSubtopicId={activeSubtopicId}
                                        completedIds={completedSubtopicIds}
                                        saving={savingSubtopicId !== null}
                                        onNavigate={(subtopicId) => navigateSubtopic(mod.id, subtopicId)}
                                        onCompleteAndAdvance={(subtopicId) =>
                                          completeAndAdvanceSubtopic(mod.id, moduleSequence, subtopicId)
                                        }
                                        renderContentBlock={renderContentBlock}
                                      />
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

                    {allowComments && !isUnlocked && (
                      <p className="text-xs text-ink/50 bg-chalk border border-line rounded-sm p-3">
                        🔒 {t('completeToUnlock')}
                      </p>
                    )}

                    {allowComments && isUnlocked && (
                      <>
                        {submission?.status === 'approved' ? (
                          <div className="bg-sage/10 border border-sage/40 rounded-sm p-3">
                            <p className="text-sm font-medium text-sage">
                              {t('moduleApproved')} — {t('projectApprovedMessage')}
                            </p>
                          </div>
                        ) : (
                          <div className="border border-line rounded-sm p-3 bg-chalk">
                            <p className="text-xs font-mono uppercase tracking-wide text-ink/50 mb-2">
                              {t('submitModuleProject', { module: `M${i + 1}` })}
                            </p>
                            {submission?.status === 'changes_requested' && submission.adminFeedback && (
                              <div className="mb-3">
                                <p className="text-[11px] font-mono uppercase tracking-wide text-coral mb-1">
                                  {t('yourFeedbackFromInstructor')}
                                </p>
                                <p className="text-sm text-ink/80 bg-surface border border-line rounded-sm p-2 whitespace-pre-line">
                                  {submission.adminFeedback}
                                </p>
                              </div>
                            )}
                            <label className="block text-xs font-medium text-ink/70 mb-1">
                              {t('githubUrlLabel')}
                            </label>
                            <input
                              placeholder="https://github.com/username/project-name"
                              value={projectDrafts[mod.id]?.githubUrl ?? submission?.githubUrl ?? ''}
                              onChange={(e) =>
                                setProjectDrafts((current) => ({
                                  ...current,
                                  [mod.id]: {
                                    githubUrl: e.target.value,
                                    notes: current[mod.id]?.notes ?? submission?.studentNotes ?? '',
                                  },
                                }))
                              }
                              className="input text-sm"
                            />
                            <label className="block text-xs font-medium text-ink/70 mb-1 mt-2">
                              {t('optionalNotesToInstructor')}
                            </label>
                            <textarea
                              value={projectDrafts[mod.id]?.notes ?? submission?.studentNotes ?? ''}
                              onChange={(e) =>
                                setProjectDrafts((current) => ({
                                  ...current,
                                  [mod.id]: {
                                    githubUrl: current[mod.id]?.githubUrl ?? submission?.githubUrl ?? '',
                                    notes: e.target.value,
                                  },
                                }))
                              }
                              className="input text-sm h-16"
                            />
                            {submitErrors[mod.id] && (
                              <p className="text-coral text-xs mt-1">{submitErrors[mod.id]}</p>
                            )}
                            <button
                              type="button"
                              onClick={() => submitProject(mod.id)}
                              disabled={
                                submittingModuleId === mod.id ||
                                !(projectDrafts[mod.id]?.githubUrl ?? submission?.githubUrl ?? '').trim()
                              }
                              className="btn-primary text-sm mt-2"
                            >
                              {submittingModuleId === mod.id
                                ? t('submittingProject')
                                : submission
                                  ? t('resubmitProject')
                                  : t('submitProject')}
                            </button>
                          </div>
                        )}
                      </>
                    )}

                    {allowComments && isUnlocked && (
                      <VideoComments classId={item.id} videoRef={`module-${mod.id}`} />
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
            {renderCurriculum(false)}
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
            {renderCurriculum(true)}

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
                            <div className="text-sm text-ink/60 bg-chalk border border-line rounded-sm p-3">
                              <p>{t('videoUnavailable')}</p>
                              {isHttpUrl(video.url) && (
                                <a
                                  href={video.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-amber hover:text-coral text-xs mt-1 inline-block"
                                >
                                  {t('watchOriginalLink')} ↗
                                </a>
                              )}
                            </div>
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
