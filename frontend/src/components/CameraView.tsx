import { useImperativeHandle, useRef, useState, type Ref } from 'react';
import { Camera, Upload } from 'lucide-react';
import type { Hazard } from '../types';

export interface CameraHandle { capture: () => string | null; startCamera: () => Promise<void> }
interface Props { ref: Ref<CameraHandle>; glassesUrl: string | null; hazards: Hazard[]; compact?: boolean; onError: (m: string) => void }

const tone = { high: 'border-bad bg-bad', medium: 'border-amber bg-amber', low: 'border-ok bg-ok' } as const;

export function CameraView({ ref, glassesUrl, hazards, compact, onError }: Props) {
  const vid = useRef<HTMLVideoElement>(null);
  const img = useRef<HTMLImageElement>(null);
  const [camOn, setCamOn] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const imgSrc = glassesUrl ?? photo;

  const startCamera = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
      vid.current!.srcObject = s; await vid.current!.play(); setCamOn(true);
    } catch { onError('Camera unavailable. Allow camera access, or upload a photo.'); }
  };

  useImperativeHandle(ref, () => ({
    startCamera,
    capture() {
      const el = imgSrc ? img.current : camOn ? vid.current : null;
      if (!el) return null;
      const w = el instanceof HTMLVideoElement ? el.videoWidth : el.naturalWidth;
      const h = el instanceof HTMLVideoElement ? el.videoHeight : el.naturalHeight;
      if (!w) return null;
      const k = Math.min(1, 960 / w);
      const c = document.createElement('canvas'); c.width = w * k; c.height = h * k;
      c.getContext('2d')!.drawImage(el, 0, 0, c.width, c.height);
      return c.toDataURL('image/jpeg', 0.7).split(',')[1];
    },
  }), [imgSrc, camOn]);

  return (
    <div className={`relative ${compact ? "aspect-video" : "aspect-[4/3]"} overflow-hidden rounded-2xl border-2 border-line bg-black`}>
      <video ref={vid} playsInline muted className={`absolute inset-0 size-full object-cover ${imgSrc || !camOn ? 'hidden' : ''}`} />
      {imgSrc && <img ref={img} src={imgSrc} alt="Current view" className="absolute inset-0 size-full object-cover" />}
      {!imgSrc && !camOn && (
        <div className="absolute inset-0 grid place-content-center gap-3 p-5 text-center">
          <p>Point the camera ahead, or upload a photo to try it.</p>
          <div className="flex justify-center gap-2">
            <button onClick={startCamera} className="flex min-h-12 items-center gap-2 rounded-xl bg-amber px-4 font-bold text-ink"><Camera size={20} />Start camera</button>
            <label className="flex min-h-12 cursor-pointer items-center gap-2 rounded-xl border-2 border-line bg-panel px-4 font-bold">
              <Upload size={20} />Upload photo
              <input type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) setPhoto(URL.createObjectURL(f)); }} />
            </label>
          </div>
        </div>
      )}
      {hazards.map((h, i) => {
        const [a, b, c, d] = h.box;
        return (
          <div key={i} className={`absolute rounded border-[3px] bg-transparent ${tone[h.severity].split(' ')[0]}`}
               style={{ top: `${a / 10}%`, left: `${b / 10}%`, height: `${(c - a) / 10}%`, width: `${(d - b) / 10}%` }}>
            <span className={`absolute -top-7 -left-[3px] whitespace-nowrap rounded px-2 text-sm font-bold text-ink ${tone[h.severity].split(' ')[1]}`}>{h.label} {h.distance}</span>
          </div>
        );
      })}
    </div>
  );
}
