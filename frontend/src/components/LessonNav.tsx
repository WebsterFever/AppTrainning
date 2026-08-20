import { ClassItem, ModuleAccess } from '../lib/api';
import { useLanguage } from '../lib/i18n';
import { ProgressBar, SubtopicSeqEntry } from './SubtopicProgressPanel';

type Module = NonNullable<ClassItem['curriculumModules']>[number];

// Desktop-only sticky navigation rail for the unlocked lesson-reading
// experience. Purely additive: every click here calls back into
// ClassDetail's *existing* toggle/navigate handlers (the exact same ones
// the inline accordion already uses) — this component owns no state of
// its own and never talks to the API directly, so it can't diverge from
// or break the existing progression/unlock/navigation behavior.
export default function LessonNav({
  modules,
  moduleAccess,
  completedSubtopicIds,
  openModules,
  onToggleModule,
  openTopics,
  onToggleTopic,
  getModuleSequence,
  getActiveSubtopicId,
  onNavigateSubtopic,
}: {
  modules: Module[];
  moduleAccess: ModuleAccess[];
  completedSubtopicIds: Set<string>;
  openModules: Set<string>;
  onToggleModule: (id: string) => void;
  openTopics: Set<string>;
  onToggleTopic: (id: string) => void;
  getModuleSequence: (mod: Module) => SubtopicSeqEntry[];
  getActiveSubtopicId: (moduleId: string, sequence: SubtopicSeqEntry[]) => string | null;
  onNavigateSubtopic: (moduleId: string, subtopicId: string) => void;
}) {
  const { t } = useLanguage();

  return (
    <nav
      aria-label={t('lessonNavigation')}
      className="hidden lg:flex lg:flex-col bg-lessonNav border border-lessonNavBorder rounded-2xl overflow-hidden lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)]"
    >
      <div className="px-4 py-3 border-b border-lessonNavBorder flex-shrink-0">
        <p className="text-[11px] font-mono uppercase tracking-widest text-lessonNavTextMuted">
          {t('courseContentLabel')}
        </p>
      </div>
      <div className="overflow-y-auto scrollbar-thin-dark px-2 py-2 space-y-1">
        {modules.map((mod, mi) => {
          const access = moduleAccess.find((a) => a.moduleId === mod.id);
          const isUnlocked = !access || access.unlocked;
          const isOpen = openModules.has(mod.id);
          const sequence = getModuleSequence(mod);
          const completedCount = sequence.filter((e) => completedSubtopicIds.has(e.id)).length;
          const percent = sequence.length > 0 ? Math.round((completedCount / sequence.length) * 100) : null;
          const activeId = isUnlocked ? getActiveSubtopicId(mod.id, sequence) : null;

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
                    const topicSubtopics = (topic.subtopics ?? []).filter(
                      (st) => (st.contentBlocks?.length ?? 0) > 0,
                    );
                    const hasDirectContent = (topic.contentBlocks?.length ?? 0) > 0;
                    if (topicSubtopics.length === 0 && !hasDirectContent) return null;
                    // Same auto-expand-if-it-contains-the-active-Subtopic
                    // rule the main reading pane's accordion uses, so the
                    // sidebar never shows a Topic collapsed while its
                    // content is already open in the reading pane.
                    const containsActive = topicSubtopics.some((st) => st.id === activeId);
                    const topicOpen = openTopics.has(topic.id) || containsActive;
                    return (
                      <div key={topic.id}>
                        <button
                          type="button"
                          onClick={() => onToggleTopic(topic.id)}
                          className="w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-md text-left transition-colors hover:bg-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber/70"
                        >
                          <span className="text-[13px] text-lessonNavText truncate">{topic.title}</span>
                          {topicSubtopics.length > 0 && (
                            <span
                              className={`text-lessonNavTextMuted text-[10px] transition-transform flex-shrink-0 ${topicOpen ? 'rotate-180' : ''}`}
                              aria-hidden="true"
                            >
                              ▾
                            </span>
                          )}
                        </button>
                        {topicOpen && topicSubtopics.length > 0 && (
                          <div className="ml-2 pl-2 border-l border-lessonNavBorder space-y-0.5">
                            {topicSubtopics.map((st) => {
                              const isActive = st.id === activeId;
                              const isCompleted = completedSubtopicIds.has(st.id);
                              return (
                                <button
                                  key={st.id}
                                  type="button"
                                  onClick={() => onNavigateSubtopic(mod.id, st.id)}
                                  aria-current={isActive ? 'true' : undefined}
                                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-[12px] leading-snug transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber/70 ${
                                    isActive
                                      ? 'bg-lessonNavActive border border-lessonNavActiveBorder text-lessonNavText'
                                      : 'border border-transparent text-lessonNavTextMuted hover:bg-white/5 hover:text-lessonNavText'
                                  }`}
                                >
                                  <span className="flex-shrink-0" aria-hidden="true">
                                    {isCompleted ? '✓' : '○'}
                                  </span>
                                  <span className="truncate flex-1">{st.title}</span>
                                </button>
                              );
                            })}
                          </div>
                        )}
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
