const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';
const TOKEN_KEY = 'classboard_token';

export interface ExtraVideo {
  title: string;
  url: string;
}

export interface ClassItem {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  videoUrl?: string;
  extraVideos?: ExtraVideo[];
  classDate: string;
  zoomLink?: string;
  isPast: boolean;
  registrationCount: number;
  registeredNames?: string[];
}

export const authToken = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
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

  createClass: (data: {
    title: string;
    description: string;
    imageUrl: string;
    videoUrl?: string;
    extraVideos?: ExtraVideo[];
    classDate: string;
    zoomLink: string;
  }) =>
    fetch(`${BASE_URL}/classes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader() },
      body: JSON.stringify(data),
    }).then((r) => handle<ClassItem>(r)),

  updateClass: (id: string, data: Partial<ClassItem>) =>
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
};
