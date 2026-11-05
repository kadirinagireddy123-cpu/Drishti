import { GLASSES } from '../config';

const KEY = 'drishti_glasses';
export const savedId = () => localStorage.getItem(KEY);
export const forgetSaved = () => localStorage.removeItem(KEY);
export const pickDevice = () => navigator.bluetooth.requestDevice({ acceptAllDevices: true, optionalServices: [GLASSES.service] });

export async function savedDevice() {
  const id = savedId();
  if (!id || !navigator.bluetooth?.getDevices) return null;
  return (await navigator.bluetooth.getDevices()).find((d) => d.id === id) ?? null;
}

/** Subscribes to JPEG frames sent as BLE notifications (FFD8 start marker ... FFD9 end marker). */
export async function openStream(dev: BluetoothDevice, onFrame: (b: Blob) => void) {
  const server = await dev.gatt!.connect();
  const ch = await (await server.getPrimaryService(GLASSES.service)).getCharacteristic(GLASSES.frame);
  let buf: Uint8Array[] = [];
  ch.addEventListener('characteristicvaluechanged', () => {
    const v = ch.value!;
    const u = new Uint8Array(v.buffer.slice(v.byteOffset, v.byteOffset + v.byteLength));
    if (u[0] === 0xff && u[1] === 0xd8) buf = [];
    buf.push(u);
    if (u.length > 1 && u[u.length - 2] === 0xff && u[u.length - 1] === 0xd9) {
      onFrame(new Blob(buf as BlobPart[], { type: 'image/jpeg' }));
      buf = [];
    }
  });
  await ch.startNotifications();
  localStorage.setItem(KEY, dev.id);
}
