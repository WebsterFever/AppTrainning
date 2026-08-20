import { ContentBlock } from '../lib/api';
import { useLanguage } from '../lib/i18n';

export interface SubtopicSeqEntry {
  id: string;
  topicId: string;
  title: string;
  description?: string;
  contentBlocks?: ContentBlock[];
}

interface SubtopicLike {
  id: string;
  title?: string;
  description?: string;
  contentBlocks?: ContentBlock[];
}

// A small horizontal progress bar + percentage, reused for the Subtopic
// row, the Topic header, and the Module header (all on the light "reading
// paper" surface) as well as LessonNav's always-dark sidebar — since the
// track/text colors can't invert to fit both fixed backgrounds at once,
// `variant` picks the palette that reads correctly against whichever one
// it's rendered on, instead of relying on the (here, deliberately
// non-inverting) global ink/line theme tokens.
export function ProgressBar({
  percent,
  completed,
  variant = 'light',
}: {
  percent: number;
  completed?: boolean;
  variant?: 'light' | 'dark';
}) {
  const trackClass = variant === 'dark' ? 'bg-white/15' : 'bg-lessonBorder';
  const textClass = variant === 'dark' ? 'text-lessonNavTextMuted' : 'text-lessonTextMuted';
  return (
    <span className="inline-flex items-center gap-1.5 flex-shrink-0">
      <span className={`w-14 h-1.5 rounded-full ${trackClass} overflow-hidden`} aria-hidden="true">
        <span
          className={`block h-full rounded-full transition-all ${completed ? 'bg-sage' : 'bg-amber'}`}
          style={{ width: `${percent}%` }}
        />
      </span>
      <span className={`text-[11px] font-mono ${completed ? 'text-sage' : textClass}`}>
        {completed ? '100% ✓' : `${percent}%`}
      </span>
    </span>
  );
}

// Renders ONLY the single, globally-active Subtopic for this Module (title
// + content blocks + Previous/Next) — never the sibling Subtopics in this
// Topic. The Course Content sidebar (LessonNav) is the sole place a student
// picks which Subtopic to view; this panel just displays whichever one is
// currently selected, exactly like a single-lesson reader. If this Topic
// doesn't contain the active Subtopic (e.g. the student manually expanded a
// Topic they aren't currently reading), it renders a short hint instead of
// silently going blank.
// "Active" is lifted state owned by the parent (ClassDetail) because Next
// must be able to cross from the last Subtopic of one Topic into the first
// Subtopic of the next Topic within the same Module.
export default function SubtopicProgressPanel({
  subtopics,
  moduleSequence,
  activeSubtopicId,
  completedIds,
  saving,
  onNavigate,
  onCompleteAndAdvance,
  renderContentBlock,
}: {
  subtopics: SubtopicLike[];
  moduleSequence: SubtopicSeqEntry[];
  activeSubtopicId: string | null;
  completedIds: Set<string>;
  saving: boolean;
  onNavigate: (subtopicId: string) => void;
  onCompleteAndAdvance: (subtopicId: string) => void;
  renderContentBlock: (block: ContentBlock, key: string) => React.ReactNode;
}) {
  const { t } = useLanguage();

  const activeSubtopic = subtopics.find(
    (st) => st.id === activeSubtopicId && (st.contentBlocks?.length ?? 0) > 0,
  );

  if (!activeSubtopic) {
    return <p className="text-sm text-lessonTextMuted italic">{t('selectSubtopicHint')}</p>;
  }

  const activeIndex = moduleSequence.findIndex((e) => e.id === activeSubtopicId);
  const isLastInModule = activeIndex >= 0 && activeIndex === moduleSequence.length - 1;
  const isLastInTopic =
    activeIndex >= 0 &&
    (activeIndex === moduleSequence.length - 1 ||
      moduleSequence[activeIndex + 1].topicId !== moduleSequence[activeIndex].topicId);
  const nextLabel = isLastInModule
    ? t('subtopicCompleteModule')
    : isLastInTopic
      ? t('subtopicCompleteLesson')
      : t('subtopicNext');
  const isCompleted = completedIds.has(activeSubtopic.id);

  return (
    <div className="border border-lessonBorder rounded-sm overflow-hidden bg-lessonSurface">
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-lessonBorder">
        <h3 className="text-sm sm:text-base font-semibold text-lessonText">{activeSubtopic.title}</h3>
        <ProgressBar percent={isCompleted ? 100 : 0} completed={isCompleted} />
      </div>
      <div className="p-4 sm:p-5 space-y-3">
        {activeSubtopic.description && <p className="text-xs text-lessonTextMuted">{activeSubtopic.description}</p>}
        {activeSubtopic.contentBlocks!.map((block, bi) => renderContentBlock(block, `${activeSubtopic.id}-${bi}`))}

        <div className="flex items-center justify-between gap-2 pt-3 border-t border-lessonBorder">
          <button
            type="button"
            disabled={activeIndex <= 0}
            onClick={() => onNavigate(moduleSequence[activeIndex - 1].id)}
            className="btn-outline text-xs px-3 py-1.5 disabled:opacity-30"
          >
            ← {t('subtopicPrevious')}
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => onCompleteAndAdvance(activeSubtopic.id)}
            className="btn-primary text-xs px-3 py-1.5 disabled:opacity-60"
          >
            {saving ? t('subtopicSaving') : nextLabel} →
          </button>
        </div>
      </div>
    </div>
  );
}
