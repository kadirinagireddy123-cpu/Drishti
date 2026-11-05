import type { ChatResult, Mode, VisionResult } from '../types';

const T: Record<string, Record<string, string>> = {
  safety: { en: 'Chair ahead, two metres. Step left.', hi: 'सामने कुर्सी, दो मीटर। बाईं ओर चलें।', kn: 'ಮುಂದೆ ಕುರ್ಚಿ, ಎರಡು ಮೀಟರ್. ಎಡಕ್ಕೆ ಸರಿಯಿರಿ.' },
  vehicle: { en: 'Scooter coming from the right, six metres. Stop.', hi: 'दाईं ओर से स्कूटर आ रहा है, छह मीटर। रुकें।', kn: 'ಬಲಭಾಗದಿಂದ ಸ್ಕೂಟರ್ ಬರುತ್ತಿದೆ, ಆರು ಮೀಟರ್. ನಿಲ್ಲಿ.' },
  read: { en: 'Sign reads: Pharmacy, open 9 to 9.', hi: 'बोर्ड पर लिखा है: फार्मेसी, सुबह 9 से रात 9।', kn: 'ಫಲಕದಲ್ಲಿ: ಫಾರ್ಮಸಿ, ಬೆಳಿಗ್ಗೆ 9 ರಿಂದ ರಾತ್ರಿ 9.' },
  money: { en: 'This looks like a 500 rupee note.', hi: 'यह 500 रुपये का नोट लगता है।', kn: 'ಇದು 500 ರೂಪಾಯಿ ನೋಟು ಎನಿಸುತ್ತದೆ.' },
  ask: { en: 'I can see a corridor with a door on your right.', hi: 'मुझे गलियारा दिखता है, आपके दाईं ओर दरवाजा है।', kn: 'ನನಗೆ ಕಾರಿಡಾರ್ ಕಾಣುತ್ತಿದೆ, ಬಲಕ್ಕೆ ಬಾಗಿಲು ಇದೆ.' },
};
const pick = (m: string, l: string) => T[m][l] ?? T[m].en;
const wait = <V,>(v: V) => new Promise<V>((r) => setTimeout(() => r(v), 600));
let n = 0;

export const demoVision = (mode: Mode, l: string): Promise<VisionResult> => {
  if (mode !== 'safety') return wait({ path_clear: true, text: pick(mode, l), hazards: [] });
  // alternate an obstacle and an oncoming vehicle so the demo shows both alert types
  return wait(n++ % 2 === 0
    ? { path_clear: false, alert: pick('safety', l), hazards: [
        { kind: 'obstacle', direction: 'ahead', label: 'Chair', box: [430, 300, 900, 560], severity: 'high', distance: '2 m', action: 'Step left' }] }
    : { path_clear: false, alert: pick('vehicle', l), hazards: [
        { kind: 'vehicle', direction: 'right', label: 'Scooter', box: [380, 620, 880, 980], severity: 'high', distance: '6 m', action: 'Stop' }] });
};
export const demoChat = (l: string): Promise<ChatResult> => wait({ reply: pick('ask', l) });
