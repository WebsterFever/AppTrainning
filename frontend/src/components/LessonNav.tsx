import { ClassItem, ModuleAccess } from '../lib/api';
import { useLanguage } from '../lib/i18n';
import { ProgressBar, SubtopicSeqEntry } from './SubtopicProgressPanel';

type Module = NonNullable<ClassItem['curriculumModules']>[number];

// The Course Content navigation rail for the unlocked lesson-reading
// experience — the sole place a student picks which Subtopic to view (the
// main reading pane only ever shows whichever one is currently active).
// Purely additive: every click here calls back into ClassDetail's
// *existing* toggle/navigate handlers (the exact same ones the inline
// accordion already uses) — this component owns no state of its own and
// never talks to the API directly, so it can't diverge from or break the
// existing progression/unlock/navigation behavior.
//
// Rendered twice by ClassDetail: once as a sticky `desktop` rail (visible
// lg+) and once inside a `drawer` overlay for mobile/tablet (hidden below
// lg on the desktop instance; the drawer instance is only mounted while
// open). Both share this exact same list-rendering logic — no duplicated
// navigation/progress code between the two.
export default function LessonNav({
  modules,
  moduleAccess,
  completedSubtopicIds,
  completedTopicIds,
  openModules,
  onToggleModule,
  openTopics,
  onToggleTopic,
  selectedTopicId,
  getModuleSequence,
  getActiveSubtopicId,
  onNavigateSubtopic,
  variant = 'desktop',
}: {
  modules: Module[];
  moduleAccess: ModuleAccess[];
  completedSubtopicIds: Set<string>;
  completedTopicIds: Set<string>;
  openModules: Set<string>;
  onToggleModule: (id: string) => void;
  openTopics: Set<string>;
  onToggleTopic: (moduleId: string, id: string) => void;
  selectedTopicId?: string;
  getModuleSequence: (mod: Module) => SubtopicSeqEntry[];
  getActiveSubtopicId: (moduleId: string, sequence: SubtopicSeqEntry[]) => string | null;
  onNavigateSubtopic: (moduleId: string, subtopicId: string) => void;
  variant?: 'desktop' | 'drawer';
}) {
  const { t } = useLanguage();
  void openTopics;
  void onNavigateSubtopic;

  return (
    <nav
      aria-label={t('lessonNavigation')}
      className={
        variant === 'drawer'
          ? 'flex flex-col h-full'
          : 'hidden lg:flex lg:flex-col bg-lessonNav border border-lessonNavBorder rounded-2xl overflow-hidden lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)]'
      }
    >
      {variant === 'desktop' && (
        <div className="px-4 py-3 border-b border-lessonNavBorder flex-shrink-0">
          <p className="text-[11px] font-mono uppercase tracking-widest text-lessonNavTextMuted">
            {t('courseContentLabel')}
          </p>
        </div>
      )}
      <div className="overflow-y-auto scrollbar-thin-dark px-2 py-2 space-y-1">
        {modules.map((mod, mi) => {
          const access = moduleAccess.find((a) => a.moduleId === mod.id);
          const isUnlocked = !access || access.unlocked;
          const isOpen = openModules.has(mod.id);
          const sequence = getModuleSequence(mod);
          const completedCount = mod.topics.filter((topic) => completedTopicIds.has(topic.id)).length;
          const percent = mod.topics.length > 0 ? Math.round((completedCount / mod.topics.length) * 100) : null;
          void getActiveSubtopicId;

          return (
            <div key={mod.id}>
              <button
                type="button"
                onClick={() => onToggleModule(mod.id)}
                className="w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-left transition-colors hover:bg-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber/70"
              >
                <span className="text-sm font-medium text-lessonNavText truncate">
                  M{mi + 1}: {mod.title}
                </span>
                <span
                  className={`text-lessonNavTextMuted text-xs transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`}
                  aria-hidden="true"
                >
                  ▾
                </span>
              </button>

              {!isUnlocked && (
                <p className="px-2.5 pb-1.5 text-[11px] text-lessonNavTextMuted">🔒 {t('moduleLocked')}</p>
              )}
              {percent !== null && (
                <div className="px-2.5 pb-1.5">
                  <ProgressBar percent={percent} completed={percent === 100} variant="dark" />
                </div>
              )}

              {isOpen && isUnlocked && (
                <div className="ml-2.5 pl-2.5 border-l border-lessonNavBorder space-y-0.5 mb-1.5">
                  {mod.topics.map((topic) => {
                    const hasDirectContent = (topic.contentBlocks?.length ?? 0) > 0;
                    const hasLegacyContent = (topic.subtopics ?? []).some((st) => (st.contentBlocks?.length ?? 0) > 0);
                    if (!topic.title?.trim() && !hasDirectContent && !hasLegacyContent) return null;
                    return (
                      <div key={topic.id}>
                        <button
                          type="button"
                          onClick={() => onToggleTopic(mod.id, topic.id)}
                          aria-current={selectedTopicId === topic.id ? 'true' : undefined}
                          className="w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-md text-left transition-colors hover:bg-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber/70"
                        >
                          <span className="text-[13px] text-lessonNavText truncate">{completedTopicIds.has(topic.id) ? '✓ ' : '○ '}{topic.title}</span>
                          {false && (
                            <span
                              className={`text-lessonNavTextMuted text-[10px] transition-transform flex-shrink-0 ${false ? 'rotate-180' : ''}`}
                              aria-hidden="true"
                            >
                              ▾
                            </span>
                          )}
                        </button>

                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </nav>
  );
}
