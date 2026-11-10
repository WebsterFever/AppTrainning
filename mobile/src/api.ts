export type Language = 'ht' | 'en' | 'fr';
export type Course = {
  id: string; title: string; description: string; imageUrl: string;
  classDate?: string; isPast: boolean; isPaid: boolean; language?: Language;
  priceCents?: number; registrationCount: number; curriculumModules?: unknown[];
};
export type Message = { id: string; sender: 'student' | 'admin'; name: string; text: string; createdAt: string };
const base = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '');
export const webUrl = process.env.EXPO_PUBLIC_WEB_URL || 'https://webstertechnologyschool.com';
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  if (!base || !/^https:\/\//.test(base)) throw new Error('Set EXPO_PUBLIC_API_URL to your existing HTTPS backend URL in mobile/.env');
  const response = await fetch(base + path, init);
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.message?.toString() || 'Request failed (' + response.status + ')');
  }
  return response.json() as Promise<T>;
}
export const api = {
  courses: (status: 'upcoming' | 'past', language: Language) =>
    request<Course[]>('/classes?status=' + status + '&language=' + language),
  course: (id: string) => request<Course>('/classes/' + encodeURIComponent(id)),
  register: (id: string, name: string, email: string) =>
    request<{ success: boolean; alreadyRegistered: boolean }>('/classes/' + encodeURIComponent(id) + '/register', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, email }),
    }),
  messages: (email: string) => request<Message[]>('/chat/messages?email=' + encodeURIComponent(email)),
  sendMessage: (name: string, email: string, text: string) =>
    request<Message>('/chat/messages', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, email, text }),
    }),
};
