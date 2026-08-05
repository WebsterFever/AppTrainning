const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';
const TOKEN_KEY = 'classboard_token';

export interface ExtraVideo {
  id: string;
  title: string;
  url: string;
  notes?: string;
}

export interface NewExtraVideo {
  id?: string;
  title: string;
  url: string;
  notes?: string;
}

export interface ClassFormData {
  title: string;
  description: string;
  imageUrl: string;
  videoUrl?: string;
  videoNotes?: string;
  extraVideos?: NewExtraVideo[];
  classDate: string;
  zoomLink: string;
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
  extraVideos?: ExtraVideo[];
  classDate: string;
  zoomLink?: string;
  isPast: boolean;
  registrationCount: number;
  registeredNames?: string[];
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
  return res.json();
}

export const api = {
  listClasses: (status?: 'upcoming' | 'past') =>
    fetch(`${BASE_URL}/classes${status ? `?status=${status}` : ''}`).then((r) =>
      handle<ClassItem[]>(r),
    ),

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
    }).then((r) => handle<{ success: boolean; registrationCount: number; zoomLink: string }>(r)),

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
};
