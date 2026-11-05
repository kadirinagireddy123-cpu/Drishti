import { useCallback, useEffect, useRef, useState } from 'react';
import { forgetSaved, openStream, pickDevice, savedDevice, savedId } from '../lib/glasses';

export type GlassesStatus = 'off' | 'searching' | 'on';

/** Connects to the glasses, remembers them, and reconnects on its own when they come back in range. */
export function useGlasses(onLost: () => void) {
  const [status, setStatus] = useState<GlassesStatus>('off');
  const [name, setName] = useState('');
  const [url, setUrl] = useState<string | null>(null);
  const lost = useRef(onLost); lost.current = onLost;
  const on = useRef(false); on.current = status === 'on';
  const busy = useRef(false);
  const dev = useRef<BluetoothDevice | null>(null);

  const onFrame = useCallback((b: Blob) => setUrl((old) => { if (old) URL.revokeObjectURL(old); return URL.createObjectURL(b); }), []);

  const attach = useCallback(async (d: BluetoothDevice) => {
    if (!(d as any)._wired) {
      (d as any)._wired = true;
      d.addEventListener('gattserverdisconnected', () => { setStatus('searching'); lost.current(); });
    }
    await openStream(d, onFrame);
    dev.current = d; setName(d.name ?? 'glasses'); setStatus('on');
  }, [onFrame]);

  const tryAuto = useCallback(async () => {
    if (on.current || busy.current) return;
    busy.current = true;
    try {
      const d = await savedDevice();
      if (d) {
        setStatus('searching');
        try { await attach(d); } catch {
          if (d.watchAdvertisements) {
            const ac = new AbortController();
            (d as any).addEventListener('advertisementreceived', () => { ac.abort(); attach(d).catch(() => {}); }, { once: true });
            await d.watchAdvertisements({ signal: ac.signal });
            setTimeout(() => ac.abort(), 9000);
          }
        }
      }
    } catch { /* browser without getDevices: helper pairs manually */ }
    busy.current = false;
  }, [attach]);

  useEffect(() => {
    if (!savedId()) return;
    void tryAuto();
    const t = setInterval(tryAuto, 10000);
    return () => clearInterval(t);
  }, [tryAuto]);

  const connect = useCallback(async () => { await attach(await pickDevice()); }, [attach]);
  const forget = useCallback(() => {
    forgetSaved();
    if (dev.current?.gatt?.connected) dev.current.gatt.disconnect();
    setStatus('off'); setUrl(null);
  }, []);

  return { status, name, url, connect, forget };
}
