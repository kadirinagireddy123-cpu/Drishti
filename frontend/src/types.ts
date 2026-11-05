export type Mode = 'safety' | 'read' | 'money' | 'ask';
export type Severity = 'low' | 'medium' | 'high';
/** box = [ymin, xmin, ymax, xmax] on a 0-1000 scale, as returned by Gemini. */
export type HazardKind = 'obstacle' | 'vehicle' | 'dropoff' | 'person' | 'other';
export type Direction = 'left' | 'ahead' | 'right';
export interface Hazard { kind?: HazardKind; direction?: Direction; label: string; box: [number, number, number, number]; severity: Severity; distance?: string; action?: string }
export interface VisionResult { path_clear: boolean; alert?: string; text?: string; hazards: Hazard[] }
export interface ChatResult { reply: string }
export interface LogItem { id: number; who: string; text: string }

export type LatLng = [number, number];
export interface Step { type: string; mod?: string; at: LatLng; dist: number }
export interface Route { coords: LatLng[]; steps: Step[] }
