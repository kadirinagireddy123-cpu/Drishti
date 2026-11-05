import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { LatLng } from '../types';

interface Props { pos: LatLng | null; route: LatLng[] | null; dest: LatLng | null }

export function MapPanel({ pos, route, dest }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const me = useRef<L.CircleMarker | null>(null);
  const line = useRef<L.Polyline | null>(null);
  const end = useRef<L.CircleMarker | null>(null);

  useEffect(() => {
    const m = L.map(el.current!, { zoomControl: false }).setView([12.97, 77.59], 16);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(m);
    map.current = m;
    return () => { m.remove(); map.current = null; };
  }, []);

  useEffect(() => {
    const m = map.current; if (!m) return;
    me.current?.remove(); me.current = null;
    if (pos) { me.current = L.circleMarker(pos, { radius: 9, color: '#FFB520', fillOpacity: 1 }).addTo(m); m.setView(pos, m.getZoom()); }
  }, [pos]);

  useEffect(() => {
    const m = map.current; if (!m) return;
    line.current?.remove(); end.current?.remove();
    if (route) line.current = L.polyline(route, { color: '#4ADE80', weight: 6 }).addTo(m);
    if (dest) end.current = L.circleMarker(dest, { radius: 9, color: '#FF6B5E', fillOpacity: 1 }).addTo(m);
  }, [route, dest]);

  return <div ref={el} className="size-full" aria-label="Walking route map" />;
}
