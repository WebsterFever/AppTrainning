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
import LessonNav from '../components/LessonNav';

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
  // Which Module the main reading pane currently shows — the Course
  // Content sidebar is the only place this changes (clicking a Module
  // header, or navigating to one of its Subtopics). Seeded to the first
  // Module alongside `openModules` below so the lesson reader still opens
  // straight into Module 1 by default, matching existing behavior; only
  // ever null in the split second before that initial load resolves.
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  // Mobile/tablet Course Content drawer — the sidebar is `hidden lg:flex`
  // below that breakpoint, so this is the only way to reach it there.
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

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
    // Clicking a Module header (open OR close) is also how a student picks
    // which Module the main reading pane shows — see `selectedModuleId`.
    setSelectedModuleId(id);
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
    // Navigating to a Subtopic always means that Subtopic's Module is the
    // one being viewed, even if the student jumped there without first
    // clicking the Module header itself (e.g. Previous/Next crossing into
    // a different Module, were that ever to happen).
    setSelectedModuleId(moduleId);
  };

  // Used by both LessonNav instances (desktop rail + mobile drawer): picking
  // a Subtopic from Course Content should also close the drawer on
  // mobile/tablet. Closing an already-closed drawer (the desktop case) is a
  // harmless no-op, so one handler covers both instead of branching.
  const navigateSubtopicFromNav = (moduleId: string, subtopicId: string) => {
    navigateSubtopic(moduleId, subtopicId);
    setMobileNavOpen(false);
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
        if (data.curriculumModules?.[0]) {
          setOpenModules(new Set([data.curriculumModules[0].id]));
          setSelectedModuleId(data.curriculumModules[0].id);
        }
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

  // Matches either a Markdown link `[label](https://...)` or a bare http(s)
  // URL, combined into one alternation so a single left-to-right scan
  // handles both — the bare-URL half never gets a second chance to
  // re-match the URL already consumed inside a Markdown link's
  // parentheses, since the Markdown-link alternative starts matching
  // earlier (at the `[`) and consumes the whole span first.
  const INLINE_LINK_PATTERN = /(\[[^\]]+\]\(https?:\/\/[^\s)]+\)|https?:\/\/[^\s]+)/g;
  // Sentence punctuation that's almost never actually part of a URL when it
  // trails one ("Visit https://openai.com." — the period belongs to the
  // sentence, not the link). Deliberately excludes closing brackets/parens
  // since some real URLs legitimately end in those (e.g. Wikipedia's
  // `_(disambiguation)` links) and guessing wrong there is worse than just
  // leaving a trailing `.`/`,`/`!` off the clickable part. Markdown links
  // don't need this at all — the closing `)` already delimits the URL
  // precisely, so there's no trailing-punctuation ambiguity to resolve.
  const TRAILING_PUNCTUATION = /[.,;:!?"']+$/;
  // Professional, unmistakably-clickable hyperlink style — same blue in
  // both themes (doesn't ride the ink/lessonText tokens, which invert or
  // stay fixed for unrelated reasons) with an underline only on hover so
  // running text doesn't look cluttered.
  const LINK_CLASS = 'text-blue-600 dark:text-blue-400 hover:underline underline-offset-2 cursor-pointer';

  // **double asterisks** for bold, `single backticks` for inline code —
  // the two Markdown spans admins are asked to use. Matched together so
  // one never gets misread as plain text inside the other; `[^*]+`/`[^`]+`
  // (no matching delimiter inside) keeps this simple and unambiguous
  // rather than implementing a real Markdown parser for two features.
  const FORMATTING_PATTERN = /(\*\*[^*]+\*\*|`[^`]+`)/g;

  // Splits a plain-text (non-bold) chunk on Markdown links and bare URLs,
  // returning an array of strings/<a> nodes — no dangerouslySetInnerHTML,
  // so this is exactly as safe against injection as rendering the text
  // alone was. A Markdown link `[label](url)` renders with ONLY the label
  // visible (the raw `[...](...)` syntax and the URL itself never appear
  // in the text — the URL exists solely in the anchor's href); a bare URL
  // still displays the URL itself, since there's no separate label for it.
  // `keyPrefix` keeps React keys unique when this runs once per
  // bold/non-bold segment instead of once per whole block.
  const linkifyUrls = (text: string, keyPrefix: string): React.ReactNode[] => {
    const segments = text.split(INLINE_LINK_PATTERN);
    const nodes: React.ReactNode[] = [];
    segments.forEach((segment, i) => {
      if (!segment) return;

      const mdLinkMatch = segment.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/);
      if (mdLinkMatch) {
        const [, label, url] = mdLinkMatch;
        nodes.push(
          <a
            key={`${keyPrefix}-mdlink-${i}`}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className={LINK_CLASS}
          >
            {label}
          </a>,
        );
        return;
      }

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
          className={`${LINK_CLASS} break-words`}
        >
          {url}
        </a>,
      );
      if (trailing) nodes.push(trailing);
    });
    return nodes;
  };

  // Renders a Text block's content: **bold** spans become <strong>,
  // `code` spans become an inline <code> chip, and URLs are linkified
  // everywhere except inside code spans (standard Markdown convention —
  // code stays literal) — still no dangerouslySetInnerHTML,
  // whitespace-pre-line on the containing element (see the 'text' case
  // below) still does all paragraph/line-break preservation. This only
  // ever touches the ** and ` markers and URL substrings, so the admin's
  // saved text is never altered — only how it's displayed.
  const renderFormattedText = (text: string): React.ReactNode[] => {
    const segments = text.split(FORMATTING_PATTERN);
    const nodes: React.ReactNode[] = [];
    segments.forEach((segment, i) => {
      if (!segment) return;
      const boldMatch = segment.match(/^\*\*([^*]+)\*\*$/);
      if (boldMatch) {
        nodes.push(<strong key={`bold-${i}`}>{linkifyUrls(boldMatch[1], `bold-${i}`)}</strong>);
        return;
      }
      const codeMatch = segment.match(/^`([^`]+)`$/);
      if (codeMatch) {
        nodes.push(
          <code
            key={`code-${i}`}
            className="rounded-md bg-black/[0.06] border border-black/10 px-1.5 py-0.5 font-mono text-[0.85em] text-lessonText"
          >
            {codeMatch[1]}
          </code>,
        );
        return;
      }
      nodes.push(...linkifyUrls(segment, `plain-${i}`));
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
          <h4 key={key} className="font-display font-semibold text-base sm:text-lg text-lessonText mt-2 first:mt-0">
            {block.content}
          </h4>
        );
      case 'divider':
        return <hr key={key} className="border-lessonBorder" />;
      case 'image':
        return (
          <figure key={key}>
            <img
              src={block.content}
              alt={block.label || ''}
              className="w-full rounded-sm border border-lessonBorder"
            />
            {block.label && <figcaption className="text-xs text-lessonTextMuted mt-1">{block.label}</figcaption>}
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
            {block.label && <p className="text-sm font-medium text-lessonText mb-1.5">{block.label}</p>}
            {block.guidedTeacherEnabled && guidedCues.length > 0 && !fileSrc && embed && embed.kind !== 'file' && (
              <p className="text-xs text-lessonTextMuted bg-black/[0.03] border border-lessonBorder rounded-sm p-2 mb-1.5">
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
              <div className="text-sm text-lessonTextMuted bg-black/[0.03] border border-lessonBorder rounded-sm p-3">
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
      <div className="overflow-x-auto bg-[#0d1117] scrollbar-thin-dark">
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
          <div key={key} className="bg-black/[0.03] border border-amber/40 rounded-sm p-3">
            <p className="text-[11px] font-mono uppercase tracking-wide text-amber mb-1">
              {t('exerciseLabel')}
            </p>
            <p className="text-[15px] sm:text-base text-lessonTextMuted leading-[1.7] whitespace-pre-line">
              {renderFormattedText(block.content ?? '')}
            </p>
          </div>
        );
      case 'text':
      default:
        return (
          <p key={key} className="text-[15px] sm:text-base text-lessonTextMuted leading-[1.7] whitespace-pre-line">
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
    // The module/topic/subtopic accordion tree itself — identical for both
    // the pre-registration preview (allowComments=false) and the real
    // unlocked lesson (allowComments=true). Extracted into a variable so
    // the two call sites below can wrap the exact same markup in
    // different containers (plain list vs. two-column reading layout)
    // without duplicating this ~250-line map body.
    const moduleList = item.curriculumModules.map((mod, i) => {
            // Real unlocked lesson: the Course Content sidebar is the only
            // place a Module gets picked (clicking its header, or one of its
            // Subtopics — see toggleModule/navigateSubtopic), so the main
            // reading pane renders at most one Module card, never the full
            // M1..M6 list. The pre-registration marketing preview is a
            // separate, intentional feature (the curriculum outline shown
            // before paying/registering) and keeps listing every Module.
            if (allowComments && mod.id !== selectedModuleId) return null;
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
            // The single Topic to actually render in the main reading pane.
            // The Course Content sidebar (LessonNav) is the only place a
            // student picks a Topic/Subtopic — so unlike the old behavior,
            // this main pane must never list every Topic's title/accordion
            // alongside it (that was duplicate navigation). A Topic with
            // Subtopics is "active" once it contains the Module's active
            // Subtopic (mirrors LessonNav's own auto-expand rule); a Topic
            // with only direct content blocks (the original, subtopic-less
            // shape) has no per-Subtopic selection to key off, so it falls
            // back to the student's own manual expand/collapse click.
            // Falling back to the first Topic with any content at all keeps
            // a Module from rendering completely blank the first time it's
            // opened, before any explicit selection exists.
            const hasTopicContent = (topic: (typeof mod.topics)[number]) =>
              (topic.contentBlocks?.length ?? 0) > 0 ||
              (topic.subtopics ?? []).some((st) => (st.contentBlocks?.length ?? 0) > 0);
            const activeTopic =
              mod.topics.find((topic) => {
                const topicSubtopics = (topic.subtopics ?? []).filter(
                  (st) => (st.contentBlocks?.length ?? 0) > 0,
                );
                if (topicSubtopics.length > 0) {
                  return topicSubtopics.some((st) => st.id === activeSubtopicId);
                }
                return (topic.contentBlocks?.length ?? 0) > 0 && openTopics.has(topic.id);
              }) ?? mod.topics.find(hasTopicContent);
            // Auto-expand a Module once the student has explicitly
            // navigated to one of its Subtopics (e.g. via the lesson nav
            // sidebar jumping into a different Module) on top of their own
            // manual toggle — same pattern as the Topic-level auto-expand
            // further below. Deliberately checks the *raw* selection
            // (activeSubtopicByModule), not getActiveSubtopicId's resolved
            // value, since that always defaults to a real Subtopic id even
            // when the student never chose one — checking it here would
            // force every Module with Subtopics permanently open. Only
            // meaningful for the marketing preview's own accordion-of-many
            // Modules; the real lesson reader already filtered down to a
            // single Module above, which always shows its content.
            const isOpen = allowComments
              ? true
              : openModules.has(mod.id) || activeSubtopicByModule[mod.id] !== undefined;
            // Title + progress bar + lock/approval badges — shared between
            // the preview's clickable toggle button and the real lesson
            // reader's plain (non-interactive) heading below.
            const moduleHeaderLabel = (
              <span className="text-base sm:text-lg font-display font-semibold text-lessonText flex items-center gap-2 flex-wrap">
                M{i + 1}: {mod.title}
                {moduleProgressPercent !== null && (
                  <ProgressBar percent={moduleProgressPercent} completed={moduleProgressPercent === 100} />
                )}
                {allowComments && !isUnlocked && (
                  <span className="badge bg-line text-lessonTextMuted normal-case tracking-normal">
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
            );
            return (
              <div key={mod.id} className="border border-lessonBorder rounded-sm overflow-hidden bg-lessonSurface">
                {allowComments ? (
                  // The Course Content sidebar is the only Module selector
                  // now — no toggle button, no chevron, just a heading for
                  // context (this is, after all, the one Module on screen).
                  <div className="w-full flex items-center gap-3 px-4 py-3">{moduleHeaderLabel}</div>
                ) : (
                  <button
                    type="button"
                    onClick={() => toggleModule(mod.id)}
                    className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left"
                  >
                    {moduleHeaderLabel}
                    <span
                      className={`text-lessonTextMuted/80 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`}
                      aria-hidden="true"
                    >
                      ▾
                    </span>
                  </button>
                )}
                {isOpen && (
                  <div className="border-t border-lessonBorder p-4 space-y-3">
                    {mod.objective && (
                      <div>
                        <p className="text-xs font-semibold text-lessonTextMuted">
                          {t('moduleObjectiveLabel')}
                        </p>
                        <p className="text-sm text-lessonTextMuted mt-0.5 leading-relaxed whitespace-pre-line">
                          {mod.objective}
                        </p>
                      </div>
                    )}
                    {/* Pre-registration marketing preview: Topics never have
                        real content here (stripped server-side), so there's
                        no "active Topic" to single out — this is the one
                        place the full Topic list is still meant to appear,
                        as the curriculum outline prospective students see
                        before paying/registering. Left exactly as before. */}
                    {!allowComments && mod.topics.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-lessonTextMuted">{t('moduleTopicsLabel')}</p>
                        <div className="mt-1 space-y-1.5">
                          {mod.topics.map((topic) => (
                            <div key={topic.id} className="text-sm text-lessonTextMuted flex items-start gap-2">
                              <span className="text-amber mt-1 flex-shrink-0" aria-hidden="true">
                                •
                              </span>
                              <div>
                                <span>{topic.title}</span>
                                {topic.description && (
                                  <p className="text-xs text-lessonTextMuted mt-0.5">{topic.description}</p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {allowComments && activeTopic &&
                      (() => {
                        const topicSubtopics = (activeTopic.subtopics ?? []).filter(
                          (st) => (st.contentBlocks?.length ?? 0) > 0,
                        );
                        const topicCompletedCount = topicSubtopics.filter((st) =>
                          completedSubtopicIds.has(st.id),
                        ).length;
                        const topicProgressPercent =
                          topicSubtopics.length > 0
                            ? Math.round((topicCompletedCount / topicSubtopics.length) * 100)
                            : null;
                        // No toggle button, no sibling Topic titles — the
                        // Course Content sidebar is the only place a Topic
                        // gets picked, so this is just a plain heading for
                        // context, not a second piece of navigation.
                        return (
                          <div className="border border-lessonBorder/70 rounded-sm overflow-hidden bg-black/[0.03]">
                            <div className="flex items-center justify-between gap-2 px-3 py-2">
                              <span className="text-sm sm:text-base font-medium text-lessonText flex items-center gap-2 flex-wrap">
                                {activeTopic.title}
                                {topicProgressPercent !== null && (
                                  <ProgressBar percent={topicProgressPercent} completed={topicProgressPercent === 100} />
                                )}
                              </span>
                            </div>
                            <div className="border-t border-lessonBorder p-3 space-y-3">
                              {activeTopic.description && (
                                <p className="text-xs text-lessonTextMuted">{activeTopic.description}</p>
                              )}
                              {/* A topic's own direct content blocks — the original
                                  shape, unchanged for every existing course that never
                                  used subtopics. */}
                              {activeTopic.contentBlocks?.map((block, bi) =>
                                renderContentBlock(block, `${activeTopic.id}-${bi}`),
                              )}
                              {/* Subtopics — one nested level deeper, rendered via the
                                  shared sequential viewer, which itself already shows
                                  only the one active Subtopic (never its siblings). */}
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
                          </div>
                        );
                      })()}
                    {mod.project && (
                      <div>
                        <p className="text-xs font-semibold text-lessonTextMuted">{t('moduleProjectLabel')}</p>
                        <p className="text-sm text-lessonTextMuted mt-0.5 leading-relaxed whitespace-pre-line">
                          {mod.project}
                        </p>
                      </div>
                    )}

                    {allowComments && !isUnlocked && (
                      <p className="text-xs text-lessonTextMuted/80 bg-black/[0.03] border border-lessonBorder rounded-sm p-3">
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
                          <div className="border border-lessonBorder rounded-sm p-3 bg-black/[0.03]">
                            <p className="text-xs font-mono uppercase tracking-wide text-lessonTextMuted/80 mb-2">
                              {t('submitModuleProject', { module: `M${i + 1}` })}
                            </p>
                            {submission?.status === 'changes_requested' && submission.adminFeedback && (
                              <div className="mb-3">
                                <p className="text-[11px] font-mono uppercase tracking-wide text-coral mb-1">
                                  {t('yourFeedbackFromInstructor')}
                                </p>
                                <p className="text-sm text-lessonTextMuted bg-lessonSurface border border-lessonBorder rounded-sm p-2 whitespace-pre-line">
                                  {submission.adminFeedback}
                                </p>
                              </div>
                            )}
                            <label className="block text-xs font-medium text-lessonTextMuted mb-1">
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
                              className="input text-sm bg-lessonSurface border-lessonBorder text-lessonText placeholder:text-lessonTextMuted/60"
                            />
                            <label className="block text-xs font-medium text-lessonTextMuted mb-1 mt-2">
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
                              className="input text-sm h-16 bg-lessonSurface border-lessonBorder text-lessonText placeholder:text-lessonTextMuted/60"
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
                      <VideoComments classId={item.id} videoRef={`module-${mod.id}`} surface="reading" />
                    )}
                  </div>
                )}
              </div>
            );
          });

    return (
      <div className="mt-6">
        <p className="font-mono text-xs tracking-widest text-lessonTextMuted/70 uppercase">
          {t('whatYoullLearn')}
        </p>
        <p className="text-sm text-lessonTextMuted mt-1">{t('curriculumIntro')}</p>
        {allowComments ? (
          // Real, unlocked lesson: two-column "reading paper inside a dark
          // shell" layout at desktop widths. The -mx-48/w-[calc] pair
          // breaks this section out from the page's max-w-3xl column to a
          // wider (max-w-6xl-equivalent) centered box WITHOUT depending on
          // 100vw (which would add a horizontal scrollbar to account for
          // the browser's own scrollbar width) — the offsets are sized
          // relative to the known 48rem parent width, so the box stays
          // perfectly centered under it at any viewport size. Below lg,
          // this collapses back to the plain single-column list (identical
          // to the preview branch) and LessonNav hides itself.
          <div className="mt-4 lg:-mx-48 lg:w-[calc(100%_+_24rem)]">
            {/* Mobile/tablet: Course Content lives in a drawer below lg, since
                LessonNav's own root is `hidden lg:flex`. Reuses the exact same
                component/props as the desktop rail — just a different mount
                point — so there is no second navigation implementation. */}
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              className="lg:hidden w-full flex items-center justify-between gap-2 px-4 py-3 mb-3 rounded-xl bg-lessonNav border border-lessonNavBorder text-lessonNavText text-sm font-medium"
            >
              <span>☰ {t('courseContentLabel')}</span>
              <span className="text-lessonNavTextMuted text-xs" aria-hidden="true">▸</span>
            </button>
            {mobileNavOpen && (
              <div className="lg:hidden fixed inset-0 z-50 flex">
                <div
                  className="absolute inset-0 bg-black/60"
                  onClick={() => setMobileNavOpen(false)}
                  aria-hidden="true"
                />
                <div className="relative ml-auto w-[85vw] max-w-xs h-full bg-lessonNav shadow-xl flex flex-col">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-lessonNavBorder flex-shrink-0">
                    <span className="text-[11px] font-mono uppercase tracking-widest text-lessonNavTextMuted">
                      {t('courseContentLabel')}
                    </span>
                    <button
                      type="button"
                      onClick={() => setMobileNavOpen(false)}
                      aria-label={t('closeCourseContent')}
                      className="text-lessonNavText text-xl leading-none px-2 py-1 -mr-2"
                    >
                      ×
                    </button>
                  </div>
                  <LessonNav
                    variant="drawer"
                    modules={item.curriculumModules}
                    moduleAccess={moduleAccess}
                    completedSubtopicIds={completedSubtopicIds}
                    openModules={openModules}
                    onToggleModule={toggleModule}
                    openTopics={openTopics}
                    onToggleTopic={toggleTopic}
                    getModuleSequence={getModuleSequence}
                    getActiveSubtopicId={getActiveSubtopicId}
                    onNavigateSubtopic={navigateSubtopicFromNav}
                  />
                </div>
              </div>
            )}
            <div className="lg:grid lg:grid-cols-[280px_1fr] lg:gap-6 lg:items-start space-y-2 lg:space-y-0">
              <LessonNav
                modules={item.curriculumModules}
                moduleAccess={moduleAccess}
                completedSubtopicIds={completedSubtopicIds}
                openModules={openModules}
                onToggleModule={toggleModule}
                openTopics={openTopics}
                onToggleTopic={toggleTopic}
                getModuleSequence={getModuleSequence}
                getActiveSubtopicId={getActiveSubtopicId}
                onNavigateSubtopic={navigateSubtopicFromNav}
              />
              <div className="lg:bg-lessonSurface lg:border lg:border-lessonBorder lg:rounded-2xl lg:px-10 lg:py-10 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto scrollbar-thin-light space-y-2">
                <div className="lg:max-w-[880px] lg:mx-auto space-y-2">
                  {item.curriculumModules?.some((m) => m.id === selectedModuleId) ? (
                    moduleList
                  ) : (
                    <p className="text-sm text-lessonTextMuted italic">{t('selectModuleHint')}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-3 space-y-2">{moduleList}</div>
        )}
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
