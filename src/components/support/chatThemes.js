import { useCallback, useEffect, useState } from 'react';

/**
 * Chat themes — the WhatsApp idea: the user picks a wallpaper and bubble
 * colour for the assistant panel, and it sticks.
 *
 * Each theme is a complete palette for the PANEL only. The dashboard's own
 * light/dark tokens still drive the header chrome and the composer, so a
 * theme never fights the page; it changes the conversation surface — the
 * part the user stares at.
 *
 * Patterns are inline SVG data URIs, very low contrast, tiled. They give the
 * "wallpaper" feel without an image asset or a network request.
 */

const STORAGE_KEY = 'tgx_support_theme';

function svg(body, w = 40, h = 40) {
  return `url("data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}' viewBox='0 0 ${w} ${h}'>${body}</svg>`,
  )}")`;
}

const DOTS = (c) => svg(`<circle cx='20' cy='20' r='1.2' fill='${c}'/>`);
const GRID = (c) => svg(`<path d='M40 0H0v40' fill='none' stroke='${c}' stroke-width='0.6'/>`);
const DOODLE = (c) =>
  svg(
    `<g fill='none' stroke='${c}' stroke-width='1' stroke-linecap='round'>` +
      `<path d='M8 12c3-4 7-4 10 0'/><circle cx='44' cy='14' r='3'/><path d='M14 44l6-6M14 38l6 6'/>` +
      `<path d='M40 40h10M45 35v10'/><circle cx='24' cy='28' r='1.5' fill='${c}' stroke='none'/></g>`,
    60,
    60,
  );
const WAVES = (c) => svg(`<path d='M0 20c10-8 20 8 40 0' fill='none' stroke='${c}' stroke-width='0.8'/>`, 40, 40);

export const CHAT_THEMES = [
  {
    id: 'mint',
    heading: 'var(--dash-text-primary)',
    name: 'Mint',
    accent: '#00d4aa',
    accentSoft: 'rgba(0,212,170,0.12)',
    userGradient: 'linear-gradient(135deg, #00d4aa, #10b981)',
    userText: '#05221c',
    wall: 'var(--dash-bg-raised)',
    pattern: null,
    assistantBg: 'var(--dash-bg-card)',
    assistantText: 'var(--dash-text-secondary)',
    meta: 'var(--dash-text-faint)',
    swatch: 'linear-gradient(135deg, #00d4aa, #10b981)',
  },
  {
    id: 'paper',
    heading: '#1f1f1f',
    name: 'Paper',
    accent: '#0f9d7a',
    accentSoft: 'rgba(15,157,122,0.14)',
    userGradient: 'linear-gradient(135deg, #d9fdd3, #c5f2bd)',
    userText: '#0b3d2c',
    wall: '#efeae2',
    pattern: DOODLE('rgba(60,45,20,0.10)'),
    assistantBg: '#ffffff',
    assistantText: '#2b2b2b',
    meta: '#8a8378',
    swatch: 'linear-gradient(135deg, #efeae2 50%, #d9fdd3 50%)',
  },
  {
    id: 'ocean',
    heading: '#0f172a',
    name: 'Ocean',
    accent: '#3b82f6',
    accentSoft: 'rgba(59,130,246,0.14)',
    userGradient: 'linear-gradient(135deg, #3b82f6, #6366f1)',
    userText: '#ffffff',
    wall: 'linear-gradient(180deg, #e9f2ff 0%, #f4f8ff 100%)',
    pattern: WAVES('rgba(59,130,246,0.16)'),
    assistantBg: '#ffffff',
    assistantText: '#1e293b',
    meta: '#7c8ba1',
    swatch: 'linear-gradient(135deg, #3b82f6, #6366f1)',
  },
  {
    id: 'sunset',
    heading: '#2a1a12',
    name: 'Sunset',
    accent: '#f97316',
    accentSoft: 'rgba(249,115,22,0.14)',
    userGradient: 'linear-gradient(135deg, #fb923c, #ec4899)',
    userText: '#ffffff',
    wall: 'linear-gradient(180deg, #fff4ec 0%, #ffeef5 100%)',
    pattern: DOTS('rgba(236,72,153,0.22)'),
    assistantBg: '#ffffff',
    assistantText: '#3f2a1f',
    meta: '#a68a7c',
    swatch: 'linear-gradient(135deg, #fb923c, #ec4899)',
  },
  {
    id: 'lavender',
    heading: '#1e1636',
    name: 'Lavender',
    accent: '#8b5cf6',
    accentSoft: 'rgba(139,92,246,0.14)',
    userGradient: 'linear-gradient(135deg, #a78bfa, #8b5cf6)',
    userText: '#ffffff',
    wall: '#f3efff',
    pattern: GRID('rgba(139,92,246,0.14)'),
    assistantBg: '#ffffff',
    assistantText: '#2e2549',
    meta: '#8f86a8',
    swatch: 'linear-gradient(135deg, #a78bfa, #8b5cf6)',
  },
  {
    id: 'midnight',
    heading: '#f1f5f9',
    name: 'Midnight',
    accent: '#22d3ee',
    accentSoft: 'rgba(34,211,238,0.16)',
    userGradient: 'linear-gradient(135deg, #22d3ee, #0ea5e9)',
    userText: '#03202b',
    wall: 'linear-gradient(180deg, #0b1220 0%, #111a2e 100%)',
    pattern: DOTS('rgba(148,163,184,0.16)'),
    assistantBg: '#1a2437',
    assistantText: '#d5dde9',
    meta: '#6b7a90',
    swatch: 'linear-gradient(135deg, #0b1220 50%, #22d3ee 50%)',
  },
];

export const DEFAULT_THEME = CHAT_THEMES[0];

export function getChatTheme(id) {
  return CHAT_THEMES.find((t) => t.id === id) ?? DEFAULT_THEME;
}

function readStored() {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

/** Persisted per browser — a preference, not account data. */
export function useChatTheme() {
  const [id, setId] = useState(() => getChatTheme(readStored()).id);
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {
      /* private mode etc. — the choice just doesn't stick */
    }
  }, [id]);
  const set = useCallback((next) => setId(getChatTheme(next).id), []);
  return [getChatTheme(id), set];
}
