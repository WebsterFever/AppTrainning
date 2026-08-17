const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';
const TOKEN_KEY = 'classboard_token';

export interface ExtraVideo {
  id: string;
  title: string;
  url: string;
  notes?: string;
  pdfUrl?: string;
  pdfName?: string;
  imageUrl?: string;
  imageName?: string;
}

export interface NewExtraVideo {
  id?: string;
  title: string;
  url: string;
  notes?: string;
  pdfUrl?: string | null;
  pdfName?: string | null;
  imageUrl?: string | null;
  imageName?: string | null;
}

export type ContentBlockType =
  | 'text'
  | 'video'
  | 'heading'
  | 'image'
  | 'divider'
  | 'code'
  | 'resource'
  | 'exercise'
  | 'ai_teacher';

export type AiTeacherAudioStatus = 'none' | 'generating' | 'ready' | 'failed';

// Fixed set for the admin's optional code-language picker — matches the
// backend's CUE_CODE_LANGUAGES. Display-only (label + monospace styling),
// never sent to TTS.
export const CUE_CODE_LANGUAGES = [
  'html',
  'css',
  'javascript',
  'typescript',
  'jsx',
  'python',
  'java',
  'csharp',
  'sql',
  'bash',
  'other',
] as const;
export type CueCodeLanguage = (typeof CUE_CODE_LANGUAGES)[number];

// One Guided Video Lesson explanation point (video blocks only). Same
// generated-audio shape as a standalone ai_teacher block, just scoped to a
// timestamp instead of the whole block. Never carries a raw storage key —
// playback goes through api.guidedCueAudioUrl, a protected endpoint.
export interface TeacherCue {
  id: string;
  timestampSeconds: number;
  script: string;
  language?: 'en' | 'fr' | 'ht';
  voice?: string;
  rate?: number;
  // Optional reference code shown beside the explanation — display-only,
  // never spoken and never affects generated-audio staleness.
  code?: string;
  codeLanguage?: CueCodeLanguage;
  audioStatus?: AiTeacherAudioStatus;
  audioProvider?: string;
  audioVoice?: string;
  audioGeneratedAt?: string;
  audioScriptHash?: string;
  audioError?: string;
  audioStale?: boolean;
}

export interface NewTeacherCue {
  id?: string;
  timestampSeconds: number;
  script: string;
  language?: 'en' | 'fr' | 'ht';
  voice?: string;
  rate?: number;
  code?: string;
  codeLanguage?: CueCodeLanguage;
}

export type VideoGenerationStatus =
  | 'idle'
  | 'queued'
  | 'rendering'
  | 'encoding'
  | 'uploading'
  | 'ready'
  | 'failed'
  | 'interrupted';

// Automatic Coding Video Generator state for a video block — server-managed
// only, never sent back on a normal class save. Reuses this same block's
// guidedTeacherCues as the ordered "teaching steps" source (each cue with a
// non-empty `code`), so there's no second explanation schema. This is the
// shape persisted on the block itself (as returned by the normal class
// endpoints) — `videoStale` is computed alongside it as a sibling field on
// the block (see ContentBlock below), and `cueCount` only appears in the
// dedicated generate/status/delete responses (VideoGenerationStatusResponse).
export interface GuidedVideoGeneration {
  status: VideoGenerationStatus;
  error?: string;
  durationSeconds?: number;
  width?: number;
  height?: number;
  fps?: number;
  typingCharsPerSecond?: number;
  generatedAt?: string;
}

// Response shape from the generate-video / video-status / delete-video
// admin endpoints specifically (not part of the class's own JSON shape).
export interface VideoGenerationStatusResponse extends GuidedVideoGeneration {
  cueCount?: number;
}

export interface ContentBlock {
  id: string;
  type: ContentBlockType;
  content?: string;
  label?: string;
  // ai_teacher-only fields (see backend ContentBlockDto for details).
  language?: 'en' | 'fr' | 'ht';
  voice?: string;
  rate?: number;
  avatarStyle?: string;
  instructions?: string;
  // Whether the lesson script is also shown as readable text. Undefined
  // means "show it" (the original, only behavior) — existing blocks keep
  // working exactly as before this became optional.
  showScript?: boolean;
  // Generated neural-voice audio metadata — never a raw playable URL. The
  // audio itself is fetched through a protected endpoint (see
  // api.aiTeacherAudioUrl) that re-checks course access by blockId.
  audioStatus?: AiTeacherAudioStatus;
  audioProvider?: string;
  audioVoice?: string;
  audioGeneratedAt?: string;
  audioScriptHash?: string;
  audioError?: string;
  // Computed server-side: true when the script/language/voice/rate have
  // changed since this audio was generated.
  audioStale?: boolean;
  // video-only: Guided Video Lesson (see TeacherCue above).
  guidedTeacherEnabled?: boolean;
  guidedTeacherCues?: TeacherCue[];
  // video-only: Automatic Coding Video Generator — server-managed, never
  // sent back on a normal class save (see GuidedVideoGeneration above).
  guidedVideoGeneration?: GuidedVideoGeneration;
  // Computed server-side: true when a step's code, typing speed, fps, or
  // resolution changed since the video was rendered.
  videoStale?: boolean;
}

export interface NewContentBlock {
  id?: string;
  type: ContentBlockType;
  content?: string;
  label?: string;
  language?: 'en' | 'fr' | 'ht';
  voice?: string;
  rate?: number;
  avatarStyle?: string;
  instructions?: string;
  showScript?: boolean;
  guidedTeacherEnabled?: boolean;
  guidedTeacherCues?: NewTeacherCue[];
}

export interface Subtopic {
  id: string;
  title?: string;
  description?: string;
  // Same gating as CurriculumTopic.contentBlocks below.
  contentBlocks?: ContentBlock[];
}

export interface CurriculumTopic {
  id: string;
  title?: string;
  description?: string;
  // Absent/undefined pre-registration on paid & unregistered-free classes —
  // the backend strips it until access is proven (see api.register below).
  // A topic can hold content directly here AND/OR organize it into
  // `subtopics` — both are optional and can coexist (see Subtopic above).
  // Existing courses that only ever used direct contentBlocks are
  // unaffected: subtopics is simply absent for them.
  contentBlocks?: ContentBlock[];
  subtopics?: Subtopic[];
}

export interface CurriculumModule {
  id: string;
  title?: string;
  objective?: string;
  project?: string;
  topics: CurriculumTopic[];
}

export interface NewSubtopic {
  id?: string;
  title?: string;
  description?: string;
  contentBlocks?: NewContentBlock[];
}

export interface NewCurriculumTopic {
  id?: string;
  title?: string;
  description?: string;
  contentBlocks?: NewContentBlock[];
  subtopics?: NewSubtopic[];
}

export interface NewCurriculumModule {
  id?: string;
  title?: string;
  objective?: string;
  project?: string;
  topics?: NewCurriculumTopic[];
}

export type SubmissionStatus = 'pending' | 'approved' | 'changes_requested';

export interface ModuleSubmissionInfo {
  id: string;
  githubUrl: string;
  studentNotes?: string;
  status: SubmissionStatus;
  adminFeedback?: string;
  submittedAt: string;
  reviewedAt?: string;
}

export interface ModuleAccess {
  moduleId: string;
  unlocked: boolean;
  submission?: ModuleSubmissionInfo;
}

export interface AdminSubmission {
  id: string;
  classId: string;
  classTitle: string;
  moduleId: string;
  moduleTitle: string;
  name: string;
  email: string;
  githubUrl: string;
  studentNotes?: string;
  status: SubmissionStatus;
  adminFeedback?: string;
  submittedAt: string;
  reviewedAt?: string;
  approvedAt?: string;
}

export interface ClassFormData {
  title: string;
  description: string;
  imageUrl: string;
  videoUrl?: string | null;
  videoNotes?: string | null;
  videoPdfUrl?: string | null;
  videoPdfName?: string | null;
  videoResourceImageUrl?: string | null;
  videoResourceImageName?: string | null;
  extraVideos?: NewExtraVideo[];
  curriculumModules?: NewCurriculumModule[];
  classDate?: string;
  zoomLink?: string | null;
  isPaid?: boolean;
  language?: 'en' | 'fr' | 'ht' | null;
  priceCents?: number | null;
  allowedEmails?: string[];
}

export interface ContestantEntry {
  id: string;
  name: string;
  imageUrl: string;
  points: number;
  subscribedAt: string;
}

export interface Leaderboard {
  goal: number;
  periodEnded: boolean;
  monthWinner?: { name: string; imageUrl: string; points: number };
  contestants: ContestantEntry[];
}

export interface CurrentQuestion {
  id: string;
  subject: string;
  questionText: string;
  answered: boolean;
  winnerName?: string;
}

export interface MonthlyWinnerEntry {
  id: string;
  periodMonth: string;
  contestantName: string;
  contestantImageUrl: string;
  points: number;
  createdAt: string;
}

export interface AdminQuestion {
  id: string;
  subject: string;
  questionText: string;
  correctAnswer: string;
  subjectFr?: string;
  questionTextFr?: string;
  correctAnswerFr?: string;
  subjectHt?: string;
  questionTextHt?: string;
  correctAnswerHt?: string;
  winnerName?: string;
  answeredAt?: string;
  createdAt: string;
}

export interface CreateQuestionInput {
  subjectEn: string;
  questionTextEn: string;
  correctAnswerEn: string;
  subjectFr: string;
  questionTextFr: string;
  correctAnswerFr: string;
  subjectHt: string;
  questionTextHt: string;
  correctAnswerHt: string;
}

export interface AdminContestant {
  id: string;
  name: string;
  email: string;
  phone: string;
  imageUrl: string;
  points: number;
  createdAt: string;
}

export interface VideoComment {
  id: string;
  name: string;
  text: string;
  reply?: string;
  repliedAt?: string;
  createdAt: string;
}

export interface AdminComment extends VideoComment {
  classId: string;
  classTitle: string;
  videoRef: string;
  videoLabel: string;
  email: string;
}

export const SCHOOL_NAME = 'Webster Technology School';

export interface ClassItem {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  videoUrl?: string;
  videoNotes?: string;
  videoPdfUrl?: string;
  videoPdfName?: string;
  videoResourceImageUrl?: string;
  videoResourceImageName?: string;
  extraVideos?: ExtraVideo[];
  curriculumModules?: CurriculumModule[];
  classDate?: string;
  zoomLink?: string;
  isPast: boolean;
  isPaid: boolean;
  language?: 'en' | 'fr' | 'ht';
  priceCents?: number;
  allowedEmails?: string[];
  registrationCount: number;
  registeredNames?: string[];
}

export interface ChatMessage {
  id: string;
  name: string;
  email: string;
  sender: 'student' | 'admin';
  text: string;
  createdAt: string;
}

export interface ChatThread {
  email: string;
  name: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
}

export interface RegistrationDetail {
  id: string;
  name: string;
  email: string;
  registeredAt: string;
}

export interface Booking {
  id: string;
  name: string;
  email: string;
  phone: string;
  description: string;
  preferredSchedule: string;
  zoomLink: string;
  createdAt: string;
}

export const authToken = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

export interface VisitorIdentity {
  name: string;
  email: string;
}

export const visitorIdentity = {
  key: (classId: string) => `classboard_registered_${classId}`,
  get: (classId: string): VisitorIdentity | null => {
    const raw = localStorage.getItem(visitorIdentity.key(classId));
    if (!raw) return null;
    try {
      return JSON.parse(raw) as VisitorIdentity;
    } catch {
      return null;
    }
  },
  set: (classId: string, identity: VisitorIdentity) => {
    localStorage.setItem(visitorIdentity.key(classId), JSON.stringify(identity));
  },
  // Find any class the visitor has already registered for, regardless of
  // which one, so other features (like chat) can skip asking again.
  findAny: (): VisitorIdentity | null => {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith('classboard_registered_')) continue;
      try {
        return JSON.parse(localStorage.getItem(key) ?? '') as VisitorIdentity;
      } catch {
        continue;
      }
    }
    return null;
  },
};

const CHAT_IDENTITY_KEY = 'classboard_chat_identity';

export const chatIdentity = {
  get: (): VisitorIdentity | null => {
    const raw = localStorage.getItem(CHAT_IDENTITY_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as VisitorIdentity;
    } catch {
      return null;
    }
  },
  set: (identity: VisitorIdentity) => {
    localStorage.setItem(CHAT_IDENTITY_KEY, JSON.stringify(identity));
  },
};

export interface ContestIdentity {
  name: string;
  email: string;
  phone: string;
  imageUrl: string;
}

const CONTEST_IDENTITY_KEY = 'classboard_contest_identity';

export const contestIdentity = {
  get: (): ContestIdentity | null => {
    const raw = localStorage.getItem(CONTEST_IDENTITY_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as ContestIdentity;
    } catch {
      return null;
    }
  },
  set: (identity: ContestIdentity) => {
    localStorage.setItem(CONTEST_IDENTITY_KEY, JSON.stringify(identity));
  },
  clear: () => {
    localStorage.removeItem(CONTEST_IDENTITY_KEY);
  },
};

function authHeader(): Record<string, string> {
  const token = authToken.get();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `Request failed (${res.status})`);
  }
  const text = await res.text();
  return (text ? JSON.parse(text) : null) as T;
}

export const api = {
  listClasses: (status?: 'upcoming' | 'past', language?: 'en' | 'fr' | 'ht') => {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (language) params.set('language', language);
    const query = params.toString();
    return fetch(`${BASE_URL}/classes${query ? `?${query}` : ''}`).then((r) => handle<ClassItem[]>(r));
  },

  getClass: (id: string) => fetch(`${BASE_URL}/classes/${id}`).then((r) => handle<ClassItem>(r)),

  // Admin only: same as listClasses, but always includes the Zoom link
  // (never redacted for upcoming classes) — needed for editing.
  listClassesAdmin: () =>
    fetch(`${BASE_URL}/admin/classes`, { headers: authHeader() }).then((r) =>
      handle<ClassItem[]>(r),
    ),

  register: (classId: string, name: string, email: string) =>
    fetch(`${BASE_URL}/classes/${classId}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email }),
    }).then((r) =>
      handle<{
        success: boolean;
        registrationCount: number;
        zoomLink?: string;
        // Only unlocked modules include contentBlocks — locked ones get the
        // same title/objective/topics/project-only preview an anonymous
        // visitor sees. GET /classes/:id never includes contentBlocks at all.
        curriculumModules?: CurriculumModule[];
        // Per-module unlock + submission status for this student.
        moduleAccess?: ModuleAccess[];
        // Every Subtopic id this student has completed, across the whole
        // class — recomputed fresh on every register() call (same
        // treatment as moduleAccess) so a refresh always reflects the true
        // persisted state.
        completedSubtopicIds?: string[];
        alreadyRegistered: boolean;
      }>(r),
    ),

  // Marks one Subtopic complete for this student — called when they click
  // Next/Complete at the end of it, never just from opening it. The
  // server independently re-verifies registration + module-unlock before
  // writing anything, same as every other progress-affecting endpoint.
  completeSubtopic: (classId: string, subtopicId: string, email: string) =>
    fetch(`${BASE_URL}/classes/${classId}/subtopics/${subtopicId}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    }).then((r) => handle<{ completedSubtopicIds: string[] }>(r)),

  submitModuleProject: (
    classId: string,
    moduleId: string,
    name: string,
    email: string,
    githubUrl: string,
    studentNotes: string,
  ) =>
    fetch(`${BASE_URL}/classes/${classId}/modules/${moduleId}/submissions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, githubUrl, studentNotes: studentNotes || undefined }),
    }).then((r) => handle<ModuleSubmissionInfo>(r)),

  // Direct <audio src> target — no fetch needed. The endpoint independently
  // re-checks registration + module-unlock status for this email before
  // streaming anything; this URL is meaningless to anyone who isn't.
  aiTeacherAudioUrl: (classId: string, blockId: string, email: string) =>
    `${BASE_URL}/classes/${classId}/blocks/${blockId}/audio?email=${encodeURIComponent(email)}`,

  // Admin only: generates (or regenerates) neural voice audio for one
  // ai_teacher block and persists it — reused by every student afterward,
  // never re-generated on playback.
  generateAiTeacherAudio: (
    classId: string,
    blockId: string,
    data: { script: string; label?: string; language: 'en' | 'fr' | 'ht'; voice?: string; rate?: number },
  ) =>
    fetch(`${BASE_URL}/admin/classes/${classId}/blocks/${blockId}/generate-audio`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader() },
      body: JSON.stringify(data),
    }).then((r) =>
      handle<{
        audioStatus?: AiTeacherAudioStatus;
        audioProvider?: string;
        audioVoice?: string;
        audioGeneratedAt?: string;
        audioScriptHash?: string;
        audioError?: string;
        content?: string;
        label?: string;
        language?: string;
        voice?: string;
        rate?: number;
      }>(r),
    ),

  // Admin preview player — fetched as a blob (rather than a bare <audio
  // src>) since this route needs the admin's JWT, which only a fetch()
  // call can attach as a header.
  previewAiTeacherAudio: async (classId: string, blockId: string): Promise<string> => {
    const res = await fetch(`${BASE_URL}/admin/classes/${classId}/blocks/${blockId}/audio`, {
      headers: authHeader(),
    });
    if (!res.ok) throw new Error('No generated audio available yet.');
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  },

  // Guided Video Lesson cue audio — same shape/protection as the
  // aiTeacherAudioUrl/generateAiTeacherAudio/previewAiTeacherAudio trio
  // above, just scoped to one cue within a video block.
  guidedCueAudioUrl: (classId: string, blockId: string, cueId: string, email: string) =>
    `${BASE_URL}/classes/${classId}/blocks/${blockId}/cues/${cueId}/audio?email=${encodeURIComponent(email)}`,

  generateGuidedCueAudio: (
    classId: string,
    blockId: string,
    cueId: string,
    data: { script: string; language: 'en' | 'fr' | 'ht'; voice?: string; rate?: number },
  ) =>
    fetch(`${BASE_URL}/admin/classes/${classId}/blocks/${blockId}/cues/${cueId}/generate-audio`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader() },
      body: JSON.stringify(data),
    }).then((r) =>
      handle<{
        audioStatus?: AiTeacherAudioStatus;
        audioProvider?: string;
        audioVoice?: string;
        audioGeneratedAt?: string;
        audioScriptHash?: string;
        audioError?: string;
        script?: string;
        language?: string;
        voice?: string;
        rate?: number;
      }>(r),
    ),

  previewGuidedCueAudio: async (classId: string, blockId: string, cueId: string): Promise<string> => {
    const res = await fetch(`${BASE_URL}/admin/classes/${classId}/blocks/${blockId}/cues/${cueId}/audio`, {
      headers: authHeader(),
    });
    if (!res.ok) throw new Error('No generated audio available yet.');
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  },

  // Automatic Coding Video Generator — reuses this same video block's
  // guidedTeacherCues as the teaching-step source (see GuidedVideoGeneration
  // above), so only render-specific settings are sent here.
  generatedVideoUrl: (classId: string, blockId: string, email: string) =>
    `${BASE_URL}/classes/${classId}/blocks/${blockId}/video?email=${encodeURIComponent(email)}`,

  // Starts an async background render job and returns immediately — the
  // admin UI polls getGuidedVideoStatus afterward rather than waiting on
  // this request.
  generateGuidedVideo: (
    classId: string,
    blockId: string,
    data: { typingCharsPerSecond: number; fps: number; width: number; height: number },
  ) =>
    fetch(`${BASE_URL}/admin/classes/${classId}/blocks/${blockId}/generate-video`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader() },
      body: JSON.stringify(data),
    }).then((r) => handle<VideoGenerationStatusResponse>(r)),

  getGuidedVideoStatus: (classId: string, blockId: string) =>
    fetch(`${BASE_URL}/admin/classes/${classId}/blocks/${blockId}/video-status`, {
      headers: authHeader(),
    }).then((r) => handle<VideoGenerationStatusResponse>(r)),

  previewGuidedVideo: async (classId: string, blockId: string): Promise<string> => {
    const res = await fetch(`${BASE_URL}/admin/classes/${classId}/blocks/${blockId}/video`, {
      headers: authHeader(),
    });
    if (!res.ok) throw new Error('No generated video available yet.');
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  },

  deleteGuidedVideo: (classId: string, blockId: string) =>
    fetch(`${BASE_URL}/admin/classes/${classId}/blocks/${blockId}/video`, {
      method: 'DELETE',
      headers: authHeader(),
    }).then((r) => handle<VideoGenerationStatusResponse>(r)),

  // Starts a Stripe Checkout session for a paid class; returns the URL to
  // redirect the browser to (card and PayPal both handled by Stripe).
  createCheckout: (classId: string, email: string, origin: string) =>
    fetch(`${BASE_URL}/classes/${classId}/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, origin }),
    }).then((r) => handle<{ url: string }>(r)),

  // Admin only: full registrant list (name, email, registration date) for a class.
  listRegistrations: (classId: string) =>
    fetch(`${BASE_URL}/admin/classes/${classId}/registrations`, { headers: authHeader() }).then(
      (r) => handle<RegistrationDetail[]>(r),
    ),

  login: (email: string, password: string) =>
    fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    }).then((r) => handle<{ accessToken: string }>(r)),

  createClass: (data: ClassFormData) =>
    fetch(`${BASE_URL}/classes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader() },
      body: JSON.stringify(data),
    }).then((r) => handle<ClassItem>(r)),

  updateClass: (id: string, data: ClassFormData) =>
    fetch(`${BASE_URL}/classes/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeader() },
      body: JSON.stringify(data),
    }).then((r) => handle<ClassItem>(r)),

  markPast: (id: string, isPast: boolean) =>
    fetch(`${BASE_URL}/classes/${id}/mark-past`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeader() },
      body: JSON.stringify({ isPast }),
    }).then((r) => handle<ClassItem>(r)),

  deleteClass: (id: string) =>
    fetch(`${BASE_URL}/classes/${id}`, {
      method: 'DELETE',
      headers: authHeader(),
    }).then((r) => handle<void>(r)),

  listComments: (classId: string, videoRef: string) =>
    fetch(`${BASE_URL}/classes/${classId}/videos/${videoRef}/comments`).then((r) =>
      handle<VideoComment[]>(r),
    ),

  addComment: (classId: string, videoRef: string, name: string, email: string, text: string) =>
    fetch(`${BASE_URL}/classes/${classId}/videos/${videoRef}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, text }),
    }).then((r) => handle<VideoComment>(r)),

  createBooking: (data: {
    name: string;
    email: string;
    phone: string;
    description: string;
    preferredSchedule: string;
    zoomLink: string;
  }) =>
    fetch(`${BASE_URL}/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then((r) => handle<Booking>(r)),

  listBookings: () =>
    fetch(`${BASE_URL}/bookings`, { headers: authHeader() }).then((r) => handle<Booking[]>(r)),

  deleteBooking: (id: string) =>
    fetch(`${BASE_URL}/bookings/${id}`, {
      method: 'DELETE',
      headers: authHeader(),
    }).then((r) => handle<void>(r)),

  listAllComments: () =>
    fetch(`${BASE_URL}/admin/comments`, { headers: authHeader() }).then((r) =>
      handle<AdminComment[]>(r),
    ),

  replyToComment: (id: string, reply: string) =>
    fetch(`${BASE_URL}/admin/comments/${id}/reply`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeader() },
      body: JSON.stringify({ reply }),
    }).then((r) => handle<{ id: string; reply: string; repliedAt: string }>(r)),

  deleteComment: (id: string) =>
    fetch(`${BASE_URL}/admin/comments/${id}`, {
      method: 'DELETE',
      headers: authHeader(),
    }).then((r) => handle<void>(r)),

  listAllSubmissions: () =>
    fetch(`${BASE_URL}/admin/submissions`, { headers: authHeader() }).then((r) =>
      handle<AdminSubmission[]>(r),
    ),

  reviewSubmission: (id: string, status: 'approved' | 'changes_requested', adminFeedback?: string) =>
    fetch(`${BASE_URL}/admin/submissions/${id}/review`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeader() },
      body: JSON.stringify({ status, adminFeedback }),
    }).then((r) => handle<ModuleSubmissionInfo>(r)),

  sendChatMessage: (name: string, email: string, text: string) =>
    fetch(`${BASE_URL}/chat/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, text }),
    }).then((r) => handle<ChatMessage>(r)),

  getChatThread: (email: string) =>
    fetch(`${BASE_URL}/chat/messages?email=${encodeURIComponent(email)}`).then((r) =>
      handle<ChatMessage[]>(r),
    ),

  listChatThreads: () =>
    fetch(`${BASE_URL}/admin/chat/threads`, { headers: authHeader() }).then((r) =>
      handle<ChatThread[]>(r),
    ),

  getAdminChatThread: (email: string) =>
    fetch(`${BASE_URL}/admin/chat/threads/${encodeURIComponent(email)}/messages`, {
      headers: authHeader(),
    }).then((r) => handle<ChatMessage[]>(r)),

  replyChat: (email: string, text: string) =>
    fetch(`${BASE_URL}/admin/chat/threads/${encodeURIComponent(email)}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader() },
      body: JSON.stringify({ text }),
    }).then((r) => handle<ChatMessage>(r)),

  subscribeContest: (name: string, email: string, phone: string, imageUrl: string) =>
    fetch(`${BASE_URL}/contest/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, phone, imageUrl }),
    }).then((r) => handle<{ id: string }>(r)),

  uploadContestPhoto: (file: File) => {
    const form = new FormData();
    form.append('photo', file);
    return fetch(`${BASE_URL}/uploads/contest-photo`, {
      method: 'POST',
      body: form,
    }).then((r) => handle<{ url: string }>(r));
  },

  // Admin only: PDF/picture resources attached to a class video.
  uploadClassResource: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return fetch(`${BASE_URL}/uploads/class-resource`, {
      method: 'POST',
      headers: authHeader(),
      body: form,
    }).then((r) => handle<{ url: string }>(r));
  },

  getLeaderboard: () =>
    fetch(`${BASE_URL}/contest/leaderboard`).then((r) => handle<Leaderboard>(r)),

  getCurrentQuestion: (language: string) =>
    fetch(`${BASE_URL}/contest/question?language=${encodeURIComponent(language)}`).then((r) =>
      handle<CurrentQuestion | null>(r),
    ),

  submitContestAnswer: (email: string, answer: string) =>
    fetch(`${BASE_URL}/contest/answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, answer }),
    }).then((r) => handle<{ correct: boolean; won: boolean; points: number }>(r)),

  getContestHistory: () =>
    fetch(`${BASE_URL}/contest/history`).then((r) => handle<MonthlyWinnerEntry[]>(r)),

  createContestQuestion: (input: CreateQuestionInput) =>
    fetch(`${BASE_URL}/admin/contest/questions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader() },
      body: JSON.stringify(input),
    }).then((r) => handle<AdminQuestion>(r)),

  listContestQuestions: () =>
    fetch(`${BASE_URL}/admin/contest/questions`, { headers: authHeader() }).then((r) =>
      handle<AdminQuestion[]>(r),
    ),

  listContestants: () =>
    fetch(`${BASE_URL}/admin/contest/contestants`, { headers: authHeader() }).then((r) =>
      handle<AdminContestant[]>(r),
    ),

  resetContest: () =>
    fetch(`${BASE_URL}/admin/contest/reset`, {
      method: 'DELETE',
      headers: authHeader(),
    }).then((r) => handle<void>(r)),
};

export { BASE_URL };
