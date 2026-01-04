export type TonePreference = 'Zen' | 'Poetic' | 'Grounded';
export type JarTheme = 'Classic' | 'Midnight' | 'Ceramic';
export type MarbleSize = 'sm' | 'md' | 'lg' | 'xl';

export interface Marble {
  id: string;
  timestamp: number;
  note?: string;
  color: string;
  position: { x: number; y: number };
  isHonoring?: boolean;
  category?: string;
  label?: string;
  size?: MarbleSize;
  isMilestone?: boolean;
}

export interface AppState {
  marbles: Marble[];
  tone: TonePreference;
  theme: JarTheme;
  lastCheckIn: number | null;
  milestonesReached: number[];
  soundEnabled: boolean;
  ambientEnabled: boolean;
}

export const MILESTONES = [7, 13, 30, 60, 90, 100, 365];

export const MARBLE_COLORS = [
  '#4ECDC4', // Bright Aquamarine
  '#FF8C42', // Radiant Sunset
  '#FFD700', // Sunshine Gold
  '#4361EE', // Royal Blue
  '#F72585', // Electric Rose
  '#70E000', // Spring Lime
  '#9B5DE5', // Amethyst Purple
  '#00BBF9', // Sky Cerulean
];

export const CATEGORIES = [
  { id: 'sober', name: 'Sobriety', label: 'SOBER', color: '#4361EE' },
  { id: 'water', name: 'Hydration', label: 'WATER', color: '#4ECDC4' },
  { id: 'move', name: 'Movement', label: 'MOVE', color: '#70E000' },
  { id: 'rest', name: 'Rest', label: 'REST', color: '#9B5DE5' },
  { id: 'general', name: 'General', label: '', color: '#FFD700' },
];

export const THEMES: Record<JarTheme, { bg: string; jarClass: string; text: string }> = {
  Classic: {
    bg: '#E3F3F1',
    jarClass: 'border-white/80 bg-white/10 backdrop-blur-[2px]',
    text: 'text-slate-900'
  },
  Midnight: {
    bg: '#0a0a0c',
    jarClass: 'border-indigo-400/30 bg-indigo-950/10 backdrop-blur-[3px]',
    text: 'text-indigo-50'
  },
  Ceramic: {
    bg: '#f5ebe0',
    jarClass: 'border-stone-500/40 bg-stone-300/20',
    text: 'text-stone-900'
  }
};