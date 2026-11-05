import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Banknote, Bluetooth, MessageCircle, Mic, Radio, ScanText, ShieldAlert, type LucideIcon } from 'lucide-react';
import { CameraView, type CameraHandle } from './components/CameraView';
import { useGlasses } from './hooks/useGlasses';
import { chat, visionAssist } from './lib/api';
import { savedId } from './lib/glasses';
import { PHRASES } from './lib/phrases';
import { useNavigation } from './hooks/useNavigation';
import { MapPanel } from './components/MapPanel';
import { listenOnce, speak } from './lib/speech';
import { LANGUAGES, SCAN_MS, SCAN_NAV_MS, type Lang } from './config';
import type { Hazard, LogItem, Mode } from './types';

const MODES: { id: Mode; label: string; Icon: LucideIcon }[] = [
  { id: 'safety', label: 'Safety', Icon: ShieldAlert }, { id: 'read', label: 'Read', Icon: ScanText },
  { id: 'money', label: 'Currency', Icon: Banknote }, { id: 'ask', label: 'Ask', Icon: MessageCircle },
];
type Banner = { tone: 'info' | 'clear' | 'hazard'; title: string; text?: string };
const border = { info: 'border-amber', clear: 'border-ok', hazard: 'border-bad' } as const;
const msg = (e: unknown) => (e instanceof Error ? e.message : String(e));
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function usePersisted<T>(key: string, init: T) {
  const [v, setV] = useState<T>(() => { try { const s = localStorage.getItem(key); return s ? (JSON.parse(s) as T) : init; } catch { return init; } });
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* storage unavailable */ } }, [key, v]);
  return [v, setV] as const;
}

export default function App() {
  const [lang, setLang] = usePersisted<Lang>('drishti_lang', 'en');
  const [demo, setDemo] = usePersisted('drishti_demo', true);
  const [mode, setMode] = useState<Mode>('safety');
  const [live, setLive] = useState(false);
  const [started, setStarted] = useState(false);
  const [gate, setGate] = useState(() => !!savedId());
  const [hazards, setHazards] = useState<Hazard[]>([]);
  const [banner, setBanner] = useState<Banner>({ tone: 'info', title: 'Ready', text: 'Choose a mode and press Scan now.' });
  const [log, setLog] = useState<LogItem[]>([]);
  const [q, setQ] = useState('');
  const [place, setPlace] = useState('');
  const cam = useRef<CameraHandle>(null);
  const busy = useRef(false);
  const last = useRef('');
  const history = useRef<{ role: string; text: string }[]>([]);
  const tag = LANGUAGES[lang].tag;

  const say = useCallback((t: string, urgent = false) => { void speak(t, tag, demo, urgent); }, [tag, demo]);
  const addLog = (who: string, text: string) => setLog((l) => [{ id: Date.now() + Math.random(), who, text }, ...l].slice(0, 6));
  const glasses = useGlasses(() => say(PHRASES[lang].lost, true));
  const nav = useNavigation(lang, say);
  const glassesOn = useRef(false); glassesOn.current = glasses.status === 'on';

  const scan = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    try {
      const r = await visionAssist(demo, cam.current?.capture() ?? null, mode === 'ask' ? 'safety' : mode, lang);
      setHazards(r.hazards);
      const text = r.alert ?? r.text ?? '';
      const bad = r.hazards.some((h: any) => h.severity === 'high');
      const safe = r.path_clear && !bad;
      const urgent = bad || r.hazards.some((h: any) => h.kind === 'vehicle');
      setBanner(mode === 'safety' || r.hazards.length ? { tone: safe ? 'clear' : 'hazard', title: safe ? 'Path looks clear' : 'Hazard ahead', text } : { tone: 'info', title: 'Result', text });
      if (text !== last.current) { last.current = text; addLog('Scan', text); say(text, urgent); }
    } catch (e) { setBanner({ tone: 'hazard', title: 'Could not reach the server', text: msg(e) }); }
    busy.current = false;
  }, [demo, mode, lang, say]);

  const ask = useCallback(async (text: string) => {
    if (!text.trim()) return;
    addLog('You', text);
    try {
      const r = await chat(demo, text, lang, history.current.slice(-6), cam.current?.capture() ?? null);
      history.current.push({ role: 'user', text }, { role: 'model', text: r.reply });
      setBanner({ tone: 'info', title: 'Drishti', text: r.reply }); addLog('Drishti', r.reply); say(r.reply);
    } catch (e) { setBanner({ tone: 'hazard', title: 'Could not get an answer', text: msg(e) }); }
  }, [demo, lang, say]);

  const command = (raw: string) => {
    const t = raw.toLowerCase();
    const dest = t.match(/(?:navigate to|take me to|go to)\s+(.+)/);
    if (dest) { void nav.go(dest[1]); setMode('safety'); setLive(true); return; }
    if (/(stop|cancel) navigation/.test(t)) { nav.stop(); return; }
    if (/stop|pause|रुको|ನಿಲ್ಲಿಸು/.test(t)) { setLive(false); say(PHRASES[lang].paused); return; }
    if (/start|resume|शुरू|ಶುರು/.test(t)) { setLive(true); return; }
    const m: Mode | null = /read|sign|पढ़|ಓದು/.test(t) ? 'read' : /note|money|currency|rupee|नोट|ನೋಟು/.test(t) ? 'money' : /safety|obstacle|path|रास्ता|ದಾರಿ/.test(t) ? 'safety' : null;
    if (m) { setMode(m); setLive(true); return; }
    void ask(t);
  };
  const cmd = useRef(command); cmd.current = command;

  // live scanning
  useEffect(() => {
    if (!live) return;
    void scan();
    const t = setInterval(scan, nav.active ? SCAN_NAV_MS : SCAN_MS);
    return () => clearInterval(t);
  }, [live, scan, nav.active]);

  // hands-free listening once started
  useEffect(() => {
    if (!started) return;
    let on = true;
    (async () => { while (on) { try { cmd.current(await listenOnce(tag)); } catch { await sleep(400); } } })();
    return () => { on = false; };
  }, [started, tag]);

  const start = () => {
    setStarted(true); setGate(false); say(PHRASES[lang].ready);
    try { void navigator.storage?.persist?.(); void (navigator as any).wakeLock?.request('screen'); } catch { /* optional */ }
    setTimeout(() => setLive(true), 2500);
    if (!savedId()) void cam.current?.startCamera();
    else setTimeout(() => { if (!glassesOn.current) void cam.current?.startCamera(); }, 8000);
  };
  const speakOnce = async () => { try { await ask(await listenOnce(tag)); } catch (e) { setBanner({ tone: 'hazard', title: msg(e) }); } };

  return (
    <div className="mx-auto max-w-3xl p-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]">
      {gate && (
        <button onClick={start} className="fixed inset-0 z-20 grid place-content-center gap-3 bg-ink text-center text-5xl font-bold">
          Drishti<small className="text-2xl font-normal text-mute">Tap anywhere to start</small>
        </button>
      )}

      <header className="mb-3 flex items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">Drishti<small className="block text-base font-normal text-mute">See, read and ask. Hands-free.</small></h1>
        <select aria-label="Language" value={lang} onChange={(e) => setLang(e.target.value as Lang)} className="min-h-12 rounded-xl border-2 border-line bg-panel px-3">
          {Object.entries(LANGUAGES).map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}
        </select>
      </header>

      {!started ? (
        <section className="mb-3 rounded-2xl border-2 border-line bg-panel p-4">
          <h2 className="text-xl font-bold">Helper setup (one time)</h2>
          <p className="mt-1 text-base text-mute">Pair the earpiece in the phone’s Bluetooth settings, connect the glasses here, then press Start. Next time the glasses reconnect on their own.</p>
          <p className="mt-3 font-bold">Language for all spoken guidance</p>
          <div role="radiogroup" aria-label="Choose language" className="mt-2 flex flex-wrap gap-2">
            {(Object.keys(LANGUAGES) as Lang[]).map((k) => (
              <button key={k} role="radio" aria-checked={lang === k} onClick={() => { setLang(k); void speak(PHRASES[k].lang, LANGUAGES[k].tag, demo, true); }}
                      className={`min-h-12 rounded-xl border-2 px-4 font-bold ${lang === k ? 'border-amber bg-amber text-ink' : 'border-line'}`}>{LANGUAGES[k].name}</button>
            ))}
          </div>
          <div className="my-3 flex flex-wrap gap-2 text-base">
            <span className={`rounded-full border-2 px-3 py-1 ${glasses.status === 'on' ? 'border-ok' : 'border-bad'}`}>
              {glasses.status === 'on' ? `Glasses: connected (${glasses.name})` : glasses.status === 'searching' ? 'Glasses: looking for saved glasses' : 'Glasses: not connected'}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => glasses.connect().catch((e) => setBanner({ tone: 'hazard', title: 'Could not connect the glasses', text: msg(e) }))} className="flex min-h-14 flex-1 items-center justify-center gap-2 rounded-xl border-2 border-line font-bold"><Bluetooth size={20} />Connect glasses</button>
            <button onClick={() => say('Earpiece test. If you can hear this in the earpiece, press Start.')} className="min-h-14 flex-1 rounded-xl border-2 border-line font-bold">Test earpiece</button>
            <button onClick={glasses.forget} className="min-h-14 rounded-xl border-2 border-line px-4">Forget glasses</button>
          </div>
          <label className="mt-3 flex items-center gap-3 text-base"><input type="checkbox" checked={demo} onChange={(e) => setDemo(e.target.checked)} className="size-6" />Demo mode (sample answers, no server)</label>
          <button onClick={start} className="mt-3 min-h-14 w-full rounded-xl bg-amber text-xl font-bold text-ink">Start Drishti</button>
        </section>
      ) : (
        <button onClick={() => { setStarted(false); setLive(false); }} className="mb-3 min-h-12 w-full rounded-xl border-2 border-line">Helper: open setup</button>
      )}

      <CameraView ref={cam} compact={nav.active} glassesUrl={glasses.url} hazards={hazards} onError={(text) => setBanner({ tone: 'hazard', title: 'Camera problem', text })} />

      <section className="mt-3">
        <div className="flex gap-2">
          <input value={place} onChange={(e) => setPlace(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') void nav.go(place); }}
                 placeholder="Where to? Say “take me to …” or type here" aria-label="Destination" className="min-h-12 flex-1 rounded-xl border-2 border-line bg-panel px-3" />
          <button onClick={() => void nav.go(place)} className="min-h-12 rounded-xl bg-amber px-5 font-bold text-ink">Go</button>
          {nav.active && <button onClick={nav.stop} className="min-h-12 rounded-xl border-2 border-line bg-panel px-4 font-bold">Stop</button>}
        </div>
        {nav.err && <p className="mt-2 text-base text-bad">{nav.err}</p>}
        {nav.active && (
          <div className="isolate mt-3 h-64 overflow-hidden rounded-2xl border-2 border-line">
            <MapPanel pos={nav.pos} route={nav.route?.coords ?? null} dest={nav.dest?.at ?? null} />
          </div>
        )}
      </section>

      <motion.div key={banner.title + banner.text} initial={{ opacity: 0.3 }} animate={{ opacity: 1 }} role="status" aria-live="assertive"
                  className={`my-3 min-h-[70px] rounded-xl border-2 bg-panel p-4 text-2xl font-bold ${border[banner.tone]}`}>
        {banner.title}{banner.text && <small className="block text-base font-normal text-mute">{banner.text}</small>}
      </motion.div>

      <div role="radiogroup" aria-label="Mode" className="mb-3 grid grid-cols-4 gap-2">
        {MODES.map(({ id, label, Icon }) => (
          <button key={id} role="radio" aria-checked={mode === id} onClick={() => setMode(id)}
                  className={`grid min-h-16 justify-items-center gap-1 rounded-xl border-2 py-2 text-base font-bold ${mode === id ? 'border-amber bg-amber text-ink' : 'border-line bg-panel'}`}>
            <Icon size={24} />{label}
          </button>
        ))}
      </div>

      <div className="mb-3 flex gap-2">
        <button onClick={scan} className="min-h-16 flex-[2] rounded-xl bg-amber text-xl font-bold text-ink">Scan now</button>
        <button onClick={() => setLive((v) => !v)} aria-pressed={live} className={`flex min-h-16 flex-1 items-center justify-center gap-2 rounded-xl border-2 font-bold ${live ? 'border-amber' : 'border-line'} bg-panel`}><Radio size={20} />Live: {live ? 'on' : 'off'}</button>
        <button onClick={speakOnce} aria-label="Speak a question" className="flex min-h-16 flex-1 items-center justify-center gap-2 rounded-xl border-2 border-line bg-panel font-bold"><Mic size={20} />Speak</button>
      </div>

      <div className="mb-3 flex gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { void ask(q); setQ(''); } }}
               placeholder="Or type a question about what is around you" aria-label="Question" className="min-h-12 flex-1 rounded-xl border-2 border-line bg-panel px-3" />
        <button onClick={() => { void ask(q); setQ(''); }} className="min-h-12 rounded-xl border-2 border-line bg-panel px-5 font-bold">Ask</button>
      </div>

      <ol className="grid gap-2" aria-label="Recent guidance">
        {log.map((l) => <li key={l.id} className="rounded-r-xl border-l-4 border-amber bg-panel px-4 py-2"><b className="text-amber">{l.who}:</b> {l.text}</li>)}
      </ol>
      <p className="mt-3 text-sm text-mute">Drishti is an aid, not a replacement for a cane or a guide. Distances are approximate.</p>
    </div>
  );
}
