import { post } from './api';

let chain: Promise<void> = Promise.resolve();
let gen = 0;
let cur: HTMLAudioElement | null = null;

const play = (b64: string, mime?: string) => new Promise<void>((done) => {
  const a = new Audio(`data:${mime ?? 'audio/wav'};base64,${b64}`);
  cur = a; a.onended = a.onpause = a.onerror = () => done();
  a.play().catch(() => done());
});

async function say(text: string, tag: string, demo: boolean) {
  if (!demo) {
    try {
      const r = await post<{ audio?: string; mime?: string }>('/tts', { text, language: tag });
      if (r.audio) { await play(r.audio, r.mime); return; }
    } catch { /* fall back to the browser voice */ }
  }
  if ('speechSynthesis' in window) {
    await new Promise<void>((done) => {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = tag; u.onend = u.onerror = () => done();
      speechSynthesis.speak(u);
    });
  }
}

/** Normal messages queue up. Urgent ones (a vehicle, a drop-off) cut off whatever is playing and skip the queue. */
export function speak(text: string, tag: string, demo: boolean, urgent = false) {
  if (!text) return;
  if (urgent) { gen++; cur?.pause(); cur = null; if ('speechSynthesis' in window) speechSynthesis.cancel(); }
  const mine = gen;
  chain = chain.then(() => (mine === gen ? say(text, tag, demo) : undefined)).catch(() => {});
}

export function listenOnce(tag: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const w = window as any;
    const C = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!C) return reject(new Error('Voice input is not supported in this browser'));
    const r = new C();
    r.lang = tag;
    r.onresult = (e: any) => resolve(e.results[0][0].transcript);
    r.onerror = () => reject(new Error('Did not catch that'));
    r.onend = () => reject(new Error('No speech heard'));
    r.start();
  });
}
