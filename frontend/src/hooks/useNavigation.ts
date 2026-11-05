import { useCallback, useEffect, useRef, useState } from 'react';
import { PHRASES, turn } from '../lib/phrases';
import type { Lang } from '../config';
import type { LatLng, Route } from '../types';

const hav = (a: LatLng, b: LatLng) => {
  const R = 6371000, r = Math.PI / 180, dLa = (b[0] - a[0]) * r, dLo = (b[1] - a[1]) * r;
  const x = Math.sin(dLa / 2) ** 2 + Math.cos(a[0] * r) * Math.cos(b[0] * r) * Math.sin(dLo / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
};
const here = () => new Promise<LatLng>((ok, no) => navigator.geolocation.getCurrentPosition(
  (p) => ok([p.coords.latitude, p.coords.longitude]), () => no(new Error('Location unavailable. Allow location access.')), { enableHighAccuracy: true }));

// Public walking router and geocoder for the prototype. Swap for Google Directions/Places or your own OSRM in production.
async function fetchRoute(a: LatLng, b: LatLng): Promise<Route> {
  const u = `https://routing.openstreetmap.de/routed-foot/route/v1/foot/${a[1]},${a[0]};${b[1]},${b[0]}?overview=full&geometries=geojson&steps=true`;
  const rt = (await (await fetch(u)).json()).routes?.[0];
  if (!rt) throw new Error('No walking route found');
  return {
    coords: rt.geometry.coordinates.map(([x, y]: number[]) => [y, x] as LatLng),
    steps: rt.legs[0].steps.map((s: any) => ({ type: s.maneuver.type, mod: s.maneuver.modifier, at: [s.maneuver.location[1], s.maneuver.location[0]] as LatLng, dist: Math.round(s.distance) })),
  };
}

/** Walking navigation spoken in the chosen language. Navigation prompts are queued; obstacle alerts interrupt them. */
export function useNavigation(lang: Lang, say: (t: string, urgent?: boolean) => void) {
  const [pos, setPos] = useState<LatLng | null>(null);
  const [dest, setDest] = useState<{ name: string; at: LatLng } | null>(null);
  const [route, setRoute] = useState<Route | null>(null);
  const [err, setErr] = useState('');
  const idx = useRef(0), phase = useRef(-1), lastReroute = useRef(0);
  const P = useRef(PHRASES[lang]); P.current = PHRASES[lang];

  useEffect(() => {
    if (!navigator.geolocation) return;
    const id = navigator.geolocation.watchPosition((p) => setPos([p.coords.latitude, p.coords.longitude]), () => setErr('Location unavailable. Allow location access.'), { enableHighAccuracy: true, maximumAge: 2000 });
    return () => navigator.geolocation.clearWatch(id);
  }, []);

  const stop = useCallback(() => { setRoute(null); setDest(null); }, []);

  const go = useCallback(async (query: string) => {
    if (!query.trim()) return;
    setErr('');
    try {
      const from = pos ?? (await here());
      const box = `&viewbox=${from[1] - 0.3},${from[0] + 0.3},${from[1] + 0.3},${from[0] - 0.3}`;
      const hit = (await (await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}${box}`)).json())[0];
      if (!hit) { say(P.current.nofound); return; }
      const to: LatLng = [+hit.lat, +hit.lon], name = String(hit.display_name).split(',')[0];
      const r = await fetchRoute(from, to);
      idx.current = 0; phase.current = -1;
      setDest({ name, at: to }); setRoute(r); say(P.current.go(name));
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); say(P.current.nofound); }
  }, [pos, say]);

  // follow the route: announce each turn once far, once near; detect arrival and leaving the route
  useEffect(() => {
    if (!route || !pos || !dest) return;
    const next = route.steps[idx.current + 1];
    if (!next) return;
    const d = Math.round(hav(pos, next.at));
    if (next.type === 'arrive') { if (d <= 18) { say(P.current.arrive); stop(); } return; }
    if (d <= 15) { idx.current++; phase.current = -1; return; }
    if (phase.current < 1 && d <= 30) { say(P.current.now + turn(next, P.current)); phase.current = 1; }
    else if (phase.current < 0) { say(P.current.in(d) + turn(next, P.current)); phase.current = 0; }
    if (Date.now() - lastReroute.current > 20000 && Math.min(...route.coords.map((c) => hav(pos, c))) > 40) {
      lastReroute.current = Date.now(); say(P.current.reroute);
      fetchRoute(pos, dest.at).then((r) => { idx.current = 0; phase.current = -1; setRoute(r); }).catch(() => {});
    }
  }, [pos, route, dest, say, stop]);

  return { pos, dest, route, err, go, stop, active: !!route };
}
