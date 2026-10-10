// Six user-selectable palettes, each with a light and a dark mode.
// Applied at runtime as CSS custom properties on <html>, so every component, chart and alert follows.
export type PaletteId = 'ocean' | 'forest' | 'warm' | 'lavender' | 'sunset' | 'contrast';
export type Mode = 'light' | 'dark';

export type Tokens = Record<
  | 'bg' | 'surface' | 'surface-2' | 'ink' | 'muted' | 'line'
  | 'primary' | 'primary-ink' | 'primary-soft' | 'secondary' | 'secondary-soft'
  | 'ok' | 'ok-soft' | 'warn' | 'warn-soft' | 'danger' | 'danger-soft' | 'info' | 'info-soft' | 'focus' | 'shadow',
  string
>;

const semanticLight = {
  ok: '#1f6b3a', 'ok-soft': '#dcf0e1', warn: '#8f5400', 'warn-soft': '#fcedcb',
  danger: '#b42318', 'danger-soft': '#fde4e1', info: '#2a5a86', 'info-soft': '#e1ecf6', shadow: '0 1px 2px rgba(20,24,30,.06), 0 4px 16px rgba(20,24,30,.06)',
};
const semanticDark = {
  ok: '#8fd6a3', 'ok-soft': '#173322', warn: '#f2b75a', 'warn-soft': '#3a2c12',
  danger: '#ff8d80', 'danger-soft': '#3f1b18', info: '#9cc7ee', 'info-soft': '#182b3d', shadow: '0 1px 2px rgba(0,0,0,.4), 0 6px 20px rgba(0,0,0,.35)',
};

export const PALETTES: { id: PaletteId; name: string; blurb: string; light: Tokens; dark: Tokens }[] = [
  {
    id: 'ocean', name: 'Ocean Blue', blurb: 'Calm blues and teal',
    light: { bg: '#f2f6f9', surface: '#ffffff', 'surface-2': '#e7eef4', ink: '#17222c', muted: '#526170', line: '#d3dee8', primary: '#0b5c8a', 'primary-ink': '#ffffff', 'primary-soft': '#dbeaf4', secondary: '#3c9a9c', 'secondary-soft': '#d8efef', focus: '#c46a00', ...semanticLight },
    dark: { bg: '#0c141c', surface: '#131e29', 'surface-2': '#1b2936', ink: '#e6eef5', muted: '#9fb0c0', line: '#2a3a4a', primary: '#6cbbe8', 'primary-ink': '#06202f', 'primary-soft': '#173246', secondary: '#5cc2c1', 'secondary-soft': '#173537', focus: '#f2b75a', ...semanticDark },
  },
  {
    id: 'forest', name: 'Forest Green', blurb: 'Deep green and sage',
    light: { bg: '#f4f2ea', surface: '#fffefa', 'surface-2': '#e9e6da', ink: '#232824', muted: '#566057', line: '#d7d3c3', primary: '#1f4d3a', 'primary-ink': '#fdfbf3', 'primary-soft': '#dde9dc', secondary: '#7f9d82', 'secondary-soft': '#e2eadb', focus: '#c46a00', ...semanticLight },
    dark: { bg: '#111814', surface: '#18221c', 'surface-2': '#213027', ink: '#e9e7dc', muted: '#a6b0a4', line: '#33433a', primary: '#86c29c', 'primary-ink': '#0e1f16', 'primary-soft': '#203a2b', secondary: '#6f9476', 'secondary-soft': '#24362a', focus: '#f2b75a', ...semanticDark },
  },
  {
    id: 'warm', name: 'Warm Neutral', blurb: 'Sand, clay and walnut',
    light: { bg: '#f7f3ee', surface: '#fffdfa', 'surface-2': '#eee6dc', ink: '#2a231d', muted: '#685b4f', line: '#ddd2c4', primary: '#7a4b2a', 'primary-ink': '#fffaf4', 'primary-soft': '#f1e2d4', secondary: '#b08d6e', 'secondary-soft': '#efe5da', focus: '#1d5fa8', ...semanticLight },
    dark: { bg: '#181410', surface: '#211b16', 'surface-2': '#2c241d', ink: '#efe7dd', muted: '#b8a999', line: '#3e342b', primary: '#e3ad82', 'primary-ink': '#2a1709', 'primary-soft': '#3b2a1c', secondary: '#c7a585', 'secondary-soft': '#33291f', focus: '#9cc7ee', ...semanticDark },
  },
  {
    id: 'lavender', name: 'Lavender', blurb: 'Soft violet and slate',
    light: { bg: '#f6f4fb', surface: '#ffffff', 'surface-2': '#ece8f6', ink: '#221f2e', muted: '#5d5873', line: '#dcd6ec', primary: '#5b45a0', 'primary-ink': '#ffffff', 'primary-soft': '#e8e2f8', secondary: '#8b7cc4', 'secondary-soft': '#ebe7f7', focus: '#c46a00', ...semanticLight },
    dark: { bg: '#14121c', surface: '#1c1927', 'surface-2': '#262236', ink: '#ece9f6', muted: '#aaa4c2', line: '#363049', primary: '#bba9f2', 'primary-ink': '#1b1236', 'primary-soft': '#2e2648', secondary: '#9c8fd2', 'secondary-soft': '#28233c', focus: '#f2b75a', ...semanticDark },
  },
  {
    id: 'sunset', name: 'Sunset', blurb: 'Terracotta and marigold',
    light: { bg: '#fbf4ef', surface: '#fffcf9', 'surface-2': '#f4e7de', ink: '#2c1f1a', muted: '#6e5a50', line: '#ebd8cb', primary: '#a83f26', 'primary-ink': '#fffaf6', 'primary-soft': '#f8e0d6', secondary: '#d08a2c', 'secondary-soft': '#f8ead3', focus: '#1d5fa8', ...semanticLight },
    dark: { bg: '#1b1310', surface: '#241a16', 'surface-2': '#30231d', ink: '#f3e8e1', muted: '#bfa79b', line: '#45332b', primary: '#ff9c7c', 'primary-ink': '#2e0f05', 'primary-soft': '#43251b', secondary: '#f0b35e', 'secondary-soft': '#3a2a15', focus: '#9cc7ee', ...semanticDark },
  },
  {
    id: 'contrast', name: 'High Contrast', blurb: 'Maximum legibility (7:1)',
    light: { bg: '#ffffff', surface: '#ffffff', 'surface-2': '#f0f0f0', ink: '#000000', muted: '#1f1f1f', line: '#000000', primary: '#0030b8', 'primary-ink': '#ffffff', 'primary-soft': '#dde5ff', secondary: '#005a5a', 'secondary-soft': '#d8f0f0', ok: '#0b4a1d', 'ok-soft': '#d6f0dc', warn: '#5c3300', 'warn-soft': '#ffe9c2', danger: '#8a0b04', 'danger-soft': '#ffdcd8', info: '#00305e', 'info-soft': '#dbe9ff', focus: '#d40078', shadow: 'none' },
    dark: { bg: '#000000', surface: '#000000', 'surface-2': '#161616', ink: '#ffffff', muted: '#e6e6e6', line: '#ffffff', primary: '#ffe14d', 'primary-ink': '#000000', 'primary-soft': '#332c00', secondary: '#7ff0f0', 'secondary-soft': '#002e2e', ok: '#9ff5b6', 'ok-soft': '#0c2a15', warn: '#ffd27a', 'warn-soft': '#2e2000', danger: '#ffb3aa', 'danger-soft': '#3a0b07', info: '#bfe0ff', 'info-soft': '#0b2238', focus: '#ff6ec7', shadow: 'none' },
  },
];

export function applyPalette(id: PaletteId, mode: Mode) {
  const p = PALETTES.find((x) => x.id === id) ?? PALETTES[1];
  const t = mode === 'dark' ? p.dark : p.light;
  const root = document.documentElement;
  (Object.keys(t) as (keyof Tokens)[]).forEach((k) => root.style.setProperty(`--${k}`, t[k]));
  root.style.colorScheme = mode;
  root.dataset.palette = id;
  root.dataset.mode = mode;
}
