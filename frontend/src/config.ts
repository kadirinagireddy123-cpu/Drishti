export const LANGUAGES = {
  en: { name: 'English', tag: 'en-IN' }, hi: { name: 'हिन्दी', tag: 'hi-IN' }, kn: { name: 'ಕನ್ನಡ', tag: 'kn-IN' },
  te: { name: 'తెలుగు', tag: 'te-IN' }, ta: { name: 'தமிழ்', tag: 'ta-IN' },
} as const;
export type Lang = keyof typeof LANGUAGES;
/** Bluetooth LE IDs the glasses firmware must expose. Change these to match your hardware. */
export const GLASSES = { service: '0000ffe0-0000-1000-8000-00805f9b34fb', frame: '0000ffe1-0000-1000-8000-00805f9b34fb' };
export const SCAN_MS = 5000;
/** Scan faster while a walking route is active. */
export const SCAN_NAV_MS = 3000;
