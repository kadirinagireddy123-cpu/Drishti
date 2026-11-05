import type { Lang } from '../config';
import type { Step } from '../types';

export interface Phrases {
  lang: string; ready: string; lost: string; paused: string;
  in: (d: number) => string; now: string; left: string; right: string; straight: string; uturn: string;
  arrive: string; reroute: string; nofound: string; go: (n: string) => string;
}

export const PHRASES: Record<Lang, Phrases> = {
  en: { lang: 'Language set to English.', ready: 'Drishti is ready. Listening.', lost: 'Glasses disconnected. Reconnecting.', paused: 'Paused.',
    in: (d) => `In ${d} metres, `, now: 'Now, ', left: 'turn left', right: 'turn right', straight: 'continue straight', uturn: 'make a U-turn',
    arrive: 'You have arrived.', reroute: 'Finding a new route.', nofound: 'I could not find that place.', go: (n) => `Navigating to ${n}.` },
  hi: { lang: 'भाषा हिन्दी चुनी गई।', ready: 'दृष्टि तैयार है। मैं सुन रहा हूँ।', lost: 'चश्मा डिस्कनेक्ट हो गया। फिर जोड़ रहा हूँ।', paused: 'रुक गया।',
    in: (d) => `${d} मीटर बाद, `, now: 'अब, ', left: 'बाईं ओर मुड़ें', right: 'दाईं ओर मुड़ें', straight: 'सीधे चलते रहें', uturn: 'वापस मुड़ें',
    arrive: 'आप पहुँच गए हैं।', reroute: 'नया रास्ता खोज रहा हूँ।', nofound: 'वह जगह नहीं मिली।', go: (n) => `${n} के लिए रास्ता बता रहा हूँ।` },
  kn: { lang: 'ಭಾಷೆ ಕನ್ನಡಕ್ಕೆ ಬದಲಾಯಿತು.', ready: 'ದೃಷ್ಟಿ ಸಿದ್ಧವಾಗಿದೆ. ಆಲಿಸುತ್ತಿದ್ದೇನೆ.', lost: 'ಕನ್ನಡಕ ಸಂಪರ್ಕ ಕಡಿತವಾಗಿದೆ. ಮರುಸಂಪರ್ಕಿಸುತ್ತಿದ್ದೇನೆ.', paused: 'ನಿಲ್ಲಿಸಲಾಗಿದೆ.',
    in: (d) => `${d} ಮೀಟರ್ ನಂತರ, `, now: 'ಈಗ, ', left: 'ಎಡಕ್ಕೆ ತಿರುಗಿ', right: 'ಬಲಕ್ಕೆ ತಿರುಗಿ', straight: 'ನೇರವಾಗಿ ಹೋಗಿ', uturn: 'ಹಿಂದಕ್ಕೆ ತಿರುಗಿ',
    arrive: 'ನೀವು ತಲುಪಿದ್ದೀರಿ.', reroute: 'ಹೊಸ ದಾರಿ ಹುಡುಕುತ್ತಿದ್ದೇನೆ.', nofound: 'ಆ ಸ್ಥಳ ಸಿಗಲಿಲ್ಲ.', go: (n) => `${n} ಗೆ ದಾರಿ ತೋರಿಸುತ್ತಿದ್ದೇನೆ.` },
  te: { lang: 'భాష తెలుగుకు మార్చబడింది.', ready: 'దృష్టి సిద్ధంగా ఉంది. వింటున్నాను.', lost: 'కళ్లజోడు డిస్‌కనెక్ట్ అయింది. మళ్లీ కనెక్ట్ చేస్తున్నాను.', paused: 'ఆపాను.',
    in: (d) => `${d} మీటర్ల తర్వాత, `, now: 'ఇప్పుడు, ', left: 'ఎడమవైపు తిరగండి', right: 'కుడివైపు తిరగండి', straight: 'నేరుగా వెళ్ళండి', uturn: 'వెనక్కి తిరగండి',
    arrive: 'మీరు చేరుకున్నారు.', reroute: 'కొత్త దారి వెతుకుతున్నాను.', nofound: 'ఆ ప్రదేశం దొరకలేదు.', go: (n) => `${n} కి దారి చూపిస్తున్నాను.` },
  ta: { lang: 'மொழி தமிழாக மாற்றப்பட்டது.', ready: 'திருஷ்டி தயாராக உள்ளது. கேட்கிறேன்.', lost: 'கண்ணாடி இணைப்பு துண்டிக்கப்பட்டது. மீண்டும் இணைக்கிறேன்.', paused: 'நிறுத்தப்பட்டது.',
    in: (d) => `${d} மீட்டர் கழித்து, `, now: 'இப்போது, ', left: 'இடப்புறம் திரும்புங்கள்', right: 'வலப்புறம் திரும்புங்கள்', straight: 'நேராகச் செல்லுங்கள்', uturn: 'திரும்பிச் செல்லுங்கள்',
    arrive: 'நீங்கள் வந்து சேர்ந்துவிட்டீர்கள்.', reroute: 'புதிய வழியைத் தேடுகிறேன்.', nofound: 'அந்த இடம் கிடைக்கவில்லை.', go: (n) => `${n} க்கு வழி காட்டுகிறேன்.` },
};

export function turn(s: Step, P: Phrases) {
  const m = s.mod ?? '';
  if (s.type === 'arrive') return P.arrive;
  if (m.includes('uturn')) return P.uturn;
  if (m.includes('left')) return P.left;
  if (m.includes('right')) return P.right;
  return P.straight;
}
