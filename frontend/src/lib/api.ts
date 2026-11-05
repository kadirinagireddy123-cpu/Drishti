import type { ChatResult, Mode, VisionResult } from '../types';
import { demoChat, demoVision } from './demo';

const BASE = import.meta.env.VITE_API_BASE ?? '';

export async function post<T>(path: string, body: unknown): Promise<T> {
  const r = await fetch(BASE + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(`Server returned ${r.status}`);
  return r.json() as Promise<T>;
}
export const visionAssist = (demo: boolean, image: string | null, mode: Mode, language: string) =>
  demo ? demoVision(mode, language) : post<VisionResult>('/vision-assist', { image, mode, language });
export const chat = (demo: boolean, message: string, language: string, history: { role: string; text: string }[], image: string | null) =>
  demo ? demoChat(language) : post<ChatResult>('/chat', { message, language, history, image });
