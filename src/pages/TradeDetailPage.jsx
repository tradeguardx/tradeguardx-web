import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import DashboardPageBanner from '../components/dashboard/DashboardPageBanner';
import { SkeletonBlock } from '../components/common/LoadingSkeleton';
import { useAuth } from '../context/AuthContext';
import { useTradingAccounts } from '../context/TradingAccountContext';
import { useDashboardTheme } from '../context/DashboardThemeContext';
import RealReplayChart from '../components/charts/RealReplayChart';
import { TradeShareCard, ShareModal } from '../components/share/ShareableCards';
import {
  fetchJournalEvents,
  fetchJournalMedia,
  fetchUnifiedTrades,
  requestTradeBehaviorNarrative,
} from '../api/tradesApi';
import {
  useTradeAnnotations,
  SETUP_TYPES,
  EMOTIONS,
  MISTAKE_TYPES,
} from '../hooks/useTradeAnnotations';

// ─── utils ──────────────────────────────────────────────────────────────────
function fmt$(v, currency = 'USD') {
  const n = Number(v);
  if (!Number.isFinite(n)) return '—';
  return new Intl.NumberFormat(undefined, { style: 'currency', currency, signDisplay: 'exceptZero', maximumFractionDigits: 4 }).format(n);
}
function fmtNum(v, dp = 4) {
  const n = Number(v);
  return Number.isFinite(n) ? n.toFixed(dp) : '—';
}
function fmtDate(v, opts = {}) {
  if (!v) return '—';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short', ...opts });
}
function fmtDuration(sec) {
  if (!sec || !Number.isFinite(sec)) return '—';
  if (sec < 60) return `${Math.round(sec)}s`;
  if (sec < 3600) return `${Math.round(sec / 60)}m`;
  const h = Math.floor(sec / 3600);
  const m = Math.round((sec % 3600) / 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

// ─── Narrative parser ─────────────────────────────────────────────────────────
function parseNarrative(raw) {
  if (!raw) return { verdict: '', timeline: [], violations: [], cost: '', fix: '', full: '' };

  const section = (marker, next) => {
    const re = new RegExp(`---${marker}---\\s*([\\s\\S]*?)(?=---${next}---|$)`);
    return (raw.match(re)?.[1] || '').trim();
  };
  const bullets = (s) => s.split('\n').map((l) => l.replace(/^[•\-*]\s*/, '').trim()).filter(Boolean);

  const verdict = section('VERDICT', 'TIMELINE');
  const timeline = bullets(section('TIMELINE', 'VIOLATIONS'));
  const violationLines = bullets(section('VIOLATIONS', 'COST'));
  const cost = section('COST', 'FIX');
  const fix = section('FIX', '___END___');

  let full = raw.replace(/---(?:VERDICT|TIMELINE|VIOLATIONS|COST|FIX)---/g, '').trim();
  full = full.replace(/^\s*(TRADE\s*NARRATIVE|Trade\s*narrative)\s*(\n|$)/i, '').trim();

  return { verdict, timeline, violations: violationLines, cost, fix, full };
}

// ─── TTS hook (sentence-by-sentence with natural pauses) ─────────────────────
function useNarrativeTTS(text) {
  const [playing, setPlaying] = useState(false);
  const [paused, setPaused] = useState(false);
  const [supported, setSupported] = useState(false);
  const [progress, setProgress] = useState(0);
  const queueRef = useRef([]);
  const idxRef = useRef(0);
  const stoppedRef = useRef(false);
  const pauseTimerRef = useRef(null);

  useEffect(() => {
    setSupported(typeof window !== 'undefined' && 'speechSynthesis' in window);
  }, []);

  // Prime voice list (Chrome often returns [] until voiceschanged / delayed call)
  useEffect(() => {
    if (!supported || typeof window === 'undefined' || !window.speechSynthesis) return;
    const synth = window.speechSynthesis;
    const prime = () => { synth.getVoices(); };
    prime();
    synth.addEventListener('voiceschanged', prime);
    const t = setTimeout(prime, 400);
    return () => {
      clearTimeout(t);
      synth.removeEventListener('voiceschanged', prime);
    };
  }, [supported]);

  useEffect(() => {
    return () => {
      clearTimeout(pauseTimerRef.current);
      if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel();
    };
  }, []);

  /**
   * Prefer warm female voices (voicemail / assistant style). Avoid obvious male voices.
   * Order: Indian English female → explicit “Female” → known female names → best English female match.
   */
  const pickVoice = useCallback(() => {
    const voices =
      typeof window !== 'undefined' && window.speechSynthesis
        ? window.speechSynthesis.getVoices()
        : [];
    if (!voices.length) return null;
    const en = voices.filter((v) => v.lang.startsWith('en'));
    if (!en.length) return voices[0] || null;

    const soundsMale = (v) =>
      /male|daniel|fred|aaron|bruce|david|james|john|mark|tom\b|nick\b|ralph|lee\b|arthur|albert|frederick/i.test(v.name);

    const isEnIn = (v) =>
      v.lang === 'en-IN'
      || v.lang.startsWith('en-IN')
      || /english \(india\)|english india/i.test(v.name);
    const enIn = en.filter(isEnIn);

    // 1) Indian English — female-first (Neerja sounds like phone voicemail on Edge)
    const inPrefer = ['Neerja', 'Riya', 'Google English India', 'English India', 'India English'];
    for (const fragment of inPrefer) {
      const v = enIn.find((x) => x.name.includes(fragment) && !soundsMale(x));
      if (v) return v;
    }

    // 2) Explicitly labelled female / UK Female (clear “assistant” tone)
    const femaleLabel = en.find(
      (v) =>
        !soundsMale(v)
        && (/english.*female|female|woman|girl/i.test(v.name) || /Google UK English Female/i.test(v.name))
    );
    if (femaleLabel) return femaleLabel;

    // 3) Known female voice names (macOS / Windows / Google)
    const femaleNames = [
      'Samantha (Enhanced)',
      'Samantha',
      'Karen (Enhanced)',
      'Karen',
      'Victoria',
      'Moira',
      'Fiona',
      'Tessa',
      'Serena',
      'Susan',
      'Allison',
      'Ava',
      'Zoe',
      'Microsoft Jenny',
      'Microsoft Aria',
      'Microsoft Zira',
      'Microsoft Michelle',
      'Microsoft Sonia',
    ];
    for (const name of femaleNames) {
      const v = en.find((x) => x.name.includes(name) && !soundsMale(x));
      if (v) return v;
    }

    // 4) Any English voice whose name suggests female (not perfect, but better than random)
    const soft = /neerja|riya|samantha|karen|jenny|zira|aria|moira|fiona|tessa|victoria|priya|isha|female/i;
    const guessed = en.find((v) => soft.test(v.name) && !soundsMale(v));
    if (guessed) return guessed;

    // 5) Last resort: first non-male-sounding English voice
    const notMale = en.find((v) => !soundsMale(v));
    return notMale || en[0];
  }, []);

  /** Voicemail-style: clear, warm, slightly bright female read (easy on the ear). */
  const applyVoiceStyle = useCallback((utter, voice) => {
    if (!voice) {
      utter.rate = 0.86;
      utter.pitch = 1.06;
      utter.volume = 0.94;
      return;
    }
    const indian =
      voice.lang === 'en-IN'
      || voice.lang.startsWith('en-IN')
      || /india|neerja|riya|google english india/i.test(voice.name);
    if (indian) {
      utter.rate = 0.82;
      utter.pitch = 1.1;
      utter.volume = 0.96;
    } else {
      utter.rate = 0.88;
      utter.pitch = 1.05;
      utter.volume = 0.94;
    }
  }, []);

  const splitSentences = useCallback((raw) => {
    if (!raw) return [];
    return raw
      .replace(/([.!?…])\s+/g, '$1\n')
      .split('\n')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }, []);

  const speakNext = useCallback(() => {
    if (stoppedRef.current) return;
    const sentences = queueRef.current;
    const i = idxRef.current;
    if (i >= sentences.length) {
      setPlaying(false); setPaused(false); setProgress(0);
      return;
    }
    setProgress(Math.round(((i + 1) / sentences.length) * 100));
    const utter = new SpeechSynthesisUtterance(sentences[i]);
    const voice = pickVoice();
    if (voice) utter.voice = voice;
    applyVoiceStyle(utter, voice);
    utter.onend = () => {
      idxRef.current += 1;
      const pauseMs = sentences[i].endsWith('?') ? 500 : sentences[i].endsWith('!') ? 400 : 320;
      pauseTimerRef.current = setTimeout(() => speakNext(), pauseMs);
    };
    utter.onerror = () => {
      setPlaying(false); setPaused(false); setProgress(0);
    };
    window.speechSynthesis.speak(utter);
  }, [pickVoice, applyVoiceStyle]);

  const play = useCallback(() => {
    if (!supported || !text) return;
    window.speechSynthesis.cancel();
    clearTimeout(pauseTimerRef.current);
    stoppedRef.current = false;
    queueRef.current = splitSentences(text);
    idxRef.current = 0;
    setPlaying(true);
    setPaused(false);
    setProgress(0);
    speakNext();
  }, [supported, text, splitSentences, speakNext]);

  const pause = useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.pause();
    clearTimeout(pauseTimerRef.current);
    setPaused(true);
  }, [supported]);

  const resume = useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.resume();
    setPaused(false);
  }, [supported]);

  const stop = useCallback(() => {
    if (!supported) return;
    stoppedRef.current = true;
    clearTimeout(pauseTimerRef.current);
    window.speechSynthesis.cancel();
    setPlaying(false);
    setPaused(false);
    setProgress(0);
  }, [supported]);

  const toggle = useCallback(() => {
    if (!playing) play();
    else if (paused) resume();
    else pause();
  }, [playing, paused, play, pause, resume]);

  return { playing, paused, supported, toggle, stop, progress };
}

// ─── Event type meta ─────────────────────────────────────────────────────────
const EVENT_META = {
  OPEN:        { label: 'Opened',           color: '#00d4aa', dot: '●', bg: 'rgba(0,212,170,0.12)' },
  SNAPSHOT:    { label: 'Snapshot',         color: '#60a5fa', dot: '◈', bg: 'rgba(96,165,250,0.1)' },
  SL_UPDATE:   { label: 'SL Updated',       color: '#f87171', dot: '▼', bg: 'rgba(248,113,113,0.1)' },
  TP_UPDATE:   { label: 'TP Updated',       color: '#fb923c', dot: '△', bg: 'rgba(251,146,60,0.1)' },
  SIZE_UPDATE: { label: 'Size Changed',     color: '#a78bfa', dot: '◆', bg: 'rgba(167,139,250,0.1)' },
  PARTIAL_CLOSE: { label: 'Partial Close',  color: '#facc15', dot: '◐', bg: 'rgba(250,204,21,0.1)' },
  CLOSE:       { label: 'Closed',           color: '#94a3b8', dot: '■', bg: 'rgba(148,163,184,0.1)' },
  RULE_BLOCK:  { label: 'Rule Blocked',     color: '#f97316', dot: '⛔', bg: 'rgba(249,115,22,0.1)' },
};

// ─── Media Reel (stories-style carousel) ────────────────────────────────────
function MediaReel({ media }) {
  const [active, setActive] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const timerRef = useRef(null);
  const containerRef = useRef(null);

  const go = useCallback((dir) => setActive((a) => (a + dir + media.length) % media.length), [media.length]);

  useEffect(() => {
    if (!lightbox && media.length > 1) {
      timerRef.current = setTimeout(() => go(1), 5000);
    }
    return () => clearTimeout(timerRef.current);
  }, [active, lightbox, media.length, go]);

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'ArrowLeft') go(-1);
      else if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'Escape' && lightbox) setLightbox(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, lightbox]);

  if (!media.length) {
    return (
      <div className="flex flex-col h-52 items-center justify-center rounded-2xl border text-center gap-2" style={{ borderColor: 'var(--dash-border)', backgroundColor: 'var(--dash-bg-card)' }}>
        <svg className="h-8 w-8" style={{ color: 'var(--dash-text-faint)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
        <p className="text-sm font-semibold" style={{ color: 'var(--dash-text-faint)' }}>No screenshots captured</p>
        <p className="text-[11px]" style={{ color: 'var(--dash-text-faint)' }}>Screenshots are taken automatically during your trade</p>
      </div>
    );
  }

  const current = media[active];
  const meta = EVENT_META[current.eventType] || { label: current.eventType, color: '#94a3b8', bg: 'rgba(148,163,184,0.1)' };

  return (
    <div className="space-y-3" ref={containerRef}>
      {/* Main viewer */}
      <div className="relative overflow-hidden rounded-2xl border" style={{ borderColor: 'var(--dash-border)', backgroundColor: '#0a0a0f' }}>
        {/* Instagram-style progress bars */}
        {media.length > 1 && (
          <div className="absolute top-0 left-0 right-0 z-20 flex gap-[3px] px-3 pt-2.5">
            {media.map((_, i) => (
              <div key={i} className="h-[2.5px] flex-1 overflow-hidden rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: '#00d4aa' }}
                  initial={false}
                  animate={{ width: i < active ? '100%' : i === active ? '100%' : '0%' }}
                  transition={{ duration: i === active ? 0.4 : 0.15, ease: 'easeOut' }}
                />
              </div>
            ))}
          </div>
        )}

        {/* Counter badge */}
        <div className="absolute top-3 right-3 z-20 rounded-lg px-2.5 py-1 text-[10px] font-bold backdrop-blur-md" style={{ backgroundColor: 'rgba(0,0,0,0.55)', color: 'rgba(255,255,255,0.8)' }}>
          {active + 1} / {media.length}
        </div>

        {/* Image */}
        <div className="relative aspect-[16/9] w-full cursor-pointer" onClick={() => setLightbox(true)}>
          <AnimatePresence mode="wait">
            <motion.img
              key={current.id}
              src={current.storageUrl}
              alt={meta.label}
              initial={{ opacity: 0, scale: 1.02 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.25 }}
              className="h-full w-full object-contain bg-black/40"
            />
          </AnimatePresence>

          {/* Bottom info bar */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-4 pb-3.5 pt-10">
            <div className="flex items-end justify-between">
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-bold backdrop-blur-sm" style={{ backgroundColor: meta.bg, color: meta.color }}>
                  <span className="text-[9px]">{EVENT_META[current.eventType]?.dot || '●'}</span>
                  {meta.label}
                </span>
                <span className="text-[10px] font-medium text-white/50">{fmtDate(current.capturedAt)}</span>
              </div>
              <button type="button" onClick={(e) => { e.stopPropagation(); setLightbox(true); }}
                className="flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-semibold text-white/70 backdrop-blur-sm transition-colors hover:text-white hover:bg-white/10"
                style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" /></svg>
                Zoom
              </button>
            </div>
          </div>
        </div>

        {/* Nav arrows */}
        {media.length > 1 && (
          <>
            <button type="button" onClick={(e) => { e.stopPropagation(); go(-1); }}
              className="absolute left-3 top-1/2 -translate-y-1/2 z-10 flex h-9 w-9 items-center justify-center rounded-full backdrop-blur-md transition-all hover:scale-110 hover:bg-white/15"
              style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}>
              <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <button type="button" onClick={(e) => { e.stopPropagation(); go(1); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 z-10 flex h-9 w-9 items-center justify-center rounded-full backdrop-blur-md transition-all hover:scale-110 hover:bg-white/15"
              style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}>
              <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
            </button>
          </>
        )}
      </div>

      {/* Thumbnail strip */}
      {media.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 px-0.5">
          {media.map((m, i) => {
            const tmeta = EVENT_META[m.eventType] || { color: '#94a3b8' };
            const isActive = i === active;
            return (
              <button key={m.id} type="button" onClick={() => setActive(i)}
                className="group/thumb shrink-0 relative overflow-hidden rounded-xl transition-all duration-200"
                style={{
                  width: isActive ? 88 : 72,
                  height: isActive ? 56 : 48,
                  border: isActive ? '2px solid #00d4aa' : '2px solid transparent',
                  boxShadow: isActive ? '0 0 12px rgba(0,212,170,0.25)' : 'none',
                  opacity: isActive ? 1 : 0.6,
                }}>
                <img src={m.storageUrl} alt={tmeta.label || m.eventType} className="h-full w-full object-cover transition-transform duration-300 group-hover/thumb:scale-110" loading="lazy" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover/thumb:opacity-100 transition-opacity" />
                <div className="absolute bottom-0.5 left-0.5 h-1.5 w-1.5 rounded-full" style={{ backgroundColor: tmeta.color }} />
              </button>
            );
          })}
        </div>
      )}

      {/* Fullscreen lightbox */}
      <AnimatePresence>
        {lightbox && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4"
            onClick={() => setLightbox(false)}
          >
            {/* Close */}
            <button type="button" onClick={() => setLightbox(false)}
              className="absolute top-4 right-4 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-colors hover:bg-white/20">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>

            {/* Counter */}
            {media.length > 1 && (
              <div className="absolute top-5 left-1/2 -translate-x-1/2 z-50 rounded-full px-4 py-1.5 text-xs font-bold text-white/80 backdrop-blur-md" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
                {active + 1} of {media.length}
              </div>
            )}

            {/* Image */}
            <motion.div
              key={current.id}
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="relative"
              onClick={(e) => e.stopPropagation()}
            >
              <img src={current.storageUrl} alt={meta.label} className="max-h-[85vh] max-w-[90vw] rounded-xl object-contain" />
              <div className="absolute bottom-0 left-0 right-0 rounded-b-xl bg-gradient-to-t from-black/70 to-transparent px-4 pb-3 pt-8">
                <div className="flex items-center gap-2">
                  <span className="rounded-md px-2 py-0.5 text-[10px] font-bold" style={{ backgroundColor: meta.bg, color: meta.color }}>{meta.label}</span>
                  <span className="text-[10px] text-white/50">{fmtDate(current.capturedAt)}</span>
                </div>
              </div>
            </motion.div>

            {/* Lightbox arrows */}
            {media.length > 1 && (
              <>
                <button type="button" onClick={(e) => { e.stopPropagation(); go(-1); }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-all hover:bg-white/20 hover:scale-110">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <button type="button" onClick={(e) => { e.stopPropagation(); go(1); }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-all hover:bg-white/20 hover:scale-110">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                </button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Event Timeline ───────────────────────────────────────────────────────────
function EventTimeline({ events }) {
  if (!events.length) return (
    <div className="text-sm" style={{ color: 'var(--dash-text-faint)' }}>No events recorded yet.</div>
  );

  return (
    <div className="relative">
      <div className="absolute left-3.5 top-0 bottom-0 w-px" style={{ backgroundColor: 'var(--dash-border)' }} />
      <div className="space-y-3">
        {events.map((e, i) => {
          const meta = EVENT_META[e.eventType] || { label: e.eventType, color: '#94a3b8', dot: '●', bg: 'rgba(148,163,184,0.1)' };
          const detail = [];
          if (e.currentPrice) detail.push(`Price: ${fmtNum(e.currentPrice)}`);
          if (e.slBefore && e.slAfter) detail.push(`SL ${fmtNum(e.slBefore)} → ${fmtNum(e.slAfter)}`);
          if (e.tpBefore && e.tpAfter) detail.push(`TP ${fmtNum(e.tpBefore)} → ${fmtNum(e.tpAfter)}`);
          if (e.pnl != null) detail.push(`P&L: ${fmtNum(e.pnl, 2)}`);
          if (e.quantity) detail.push(`Qty: ${e.quantity}`);
          const payloadNote = e.payload?.reason || e.payload?.rule || null;

          return (
            <motion.div key={e.id || i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: Math.min(i * 0.04, 0.6) }}
              className="relative flex gap-3 pl-8">
              <div className="absolute left-0 flex h-7 w-7 items-center justify-center rounded-full text-[13px]" style={{ backgroundColor: meta.bg, color: meta.color }}>
                {meta.dot}
              </div>
              <div className="flex-1 rounded-xl border px-3 py-2.5" style={{ borderColor: 'var(--dash-border)', backgroundColor: 'var(--dash-bg-card)' }}>
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs font-semibold" style={{ color: meta.color }}>{meta.label}</span>
                  <span className="text-[10px]" style={{ color: 'var(--dash-text-faint)' }}>{fmtDate(e.eventAt)}</span>
                </div>
                {detail.length > 0 && (
                  <p className="mt-1 text-[11px]" style={{ color: 'var(--dash-text-muted)' }}>{detail.join(' · ')}</p>
                )}
                {payloadNote && (
                  <p className="mt-1 text-[11px] italic" style={{ color: 'var(--dash-text-faint)' }}>{payloadNote}</p>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Star Rating ──────────────────────────────────────────────────────────────
function StarRating({ value, onChange }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((s) => (
        <button key={s} type="button" onClick={() => onChange(s)}
          onMouseEnter={() => setHover(s)} onMouseLeave={() => setHover(0)}
          className="text-lg transition-transform hover:scale-125"
          style={{ color: s <= (hover || value) ? '#f59e0b' : 'var(--dash-text-faint)' }}>
          {s <= (hover || value) ? '★' : '☆'}
        </button>
      ))}
    </div>
  );
}

// ─── Chip Picker ──────────────────────────────────────────────────────────────
function ChipPicker({ label, options, selected, onToggle }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--dash-text-faint)' }}>{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => {
          const on = selected.includes(opt);
          return (
            <button key={opt} type="button" onClick={() => onToggle(opt)}
              className="rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-all"
              style={{ borderColor: on ? 'rgba(0,212,170,0.4)' : 'var(--dash-border)', backgroundColor: on ? 'rgba(0,212,170,0.12)' : 'transparent', color: on ? '#00d4aa' : 'var(--dash-text-muted)' }}>
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Journal Notes Tab ────────────────────────────────────────────────────────
function JournalNotesPanel({ tradeUid, trade }) {
  const ann = useTradeAnnotations(tradeUid);
  const [notes, setNotes] = useState('');
  const [dirty, setDirty] = useState(false);

  useEffect(() => { setNotes(ann.notes || ''); setDirty(false); }, [ann.notes]);

  function toggle(list, item) {
    const next = list.includes(item) ? list.filter((x) => x !== item) : [...list, item];
    return next;
  }

  const rMultiple = useMemo(() => {
    if (!trade) return null;
    const entry = Number(trade.entryPrice);
    const sl = Number(trade.stopLoss || trade.sl);
    const exit = Number(trade.exitPrice);
    if (!Number.isFinite(entry) || !Number.isFinite(sl) || !Number.isFinite(exit) || sl === entry) return null;
    const risk = Math.abs(entry - sl);
    const reward = exit - entry;
    const side = (trade.side || '').toLowerCase();
    const mult = (side === 'sell' || side === 'short') ? -reward / risk : reward / risk;
    return Number(mult.toFixed(2));
  }, [trade]);

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border p-4" style={{ borderColor: 'var(--dash-border)', backgroundColor: 'var(--dash-bg-raised)' }}>
          <p className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--dash-text-faint)' }}>Execution Rating</p>
          <StarRating value={ann.rating} onChange={(v) => ann.save({ rating: v })} />
          <p className="mt-1 text-[10px]" style={{ color: 'var(--dash-text-faint)' }}>How well did you execute your plan?</p>
        </div>
        <div className="rounded-2xl border p-4" style={{ borderColor: 'var(--dash-border)', backgroundColor: 'var(--dash-bg-raised)' }}>
          <p className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--dash-text-faint)' }}>R-Multiple</p>
          {rMultiple != null ? (
            <p className={`text-2xl font-bold ${rMultiple >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{rMultiple > 0 ? '+' : ''}{rMultiple}R</p>
          ) : (
            <p className="text-sm" style={{ color: 'var(--dash-text-faint)' }}>No SL data — set stop loss to calculate</p>
          )}
          <div className="mt-2 flex items-center gap-2">
            <span className="text-[11px] font-semibold uppercase" style={{ color: 'var(--dash-text-faint)' }}>Plan followed?</span>
            <div className="flex gap-1">
              {[{ label: 'Yes', v: true, c: '#22c55e' }, { label: 'No', v: false, c: '#ef4444' }].map((opt) => (
                <button key={opt.label} type="button" onClick={() => ann.save({ followedPlan: opt.v })}
                  className="rounded-md border px-2 py-0.5 text-[10px] font-semibold transition-all"
                  style={{ borderColor: ann.followedPlan === opt.v ? opt.c + '60' : 'var(--dash-border)', backgroundColor: ann.followedPlan === opt.v ? opt.c + '18' : 'transparent', color: ann.followedPlan === opt.v ? opt.c : 'var(--dash-text-muted)' }}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border p-4" style={{ borderColor: 'var(--dash-border)', backgroundColor: 'var(--dash-bg-raised)' }}>
        <ChipPicker label="Setup / Strategy" options={SETUP_TYPES}
          selected={ann.setupType ? [ann.setupType] : []}
          onToggle={(v) => ann.save({ setupType: ann.setupType === v ? '' : v })} />
      </div>

      <div className="rounded-2xl border p-4" style={{ borderColor: 'var(--dash-border)', backgroundColor: 'var(--dash-bg-raised)' }}>
        <ChipPicker label="Emotion Before / During Trade" options={EMOTIONS}
          selected={ann.emotion ? [ann.emotion] : []}
          onToggle={(v) => ann.save({ emotion: ann.emotion === v ? '' : v })} />
      </div>

      <div className="rounded-2xl border p-4" style={{ borderColor: 'var(--dash-border)', backgroundColor: 'var(--dash-bg-raised)' }}>
        <ChipPicker label="Mistakes (select all that apply)" options={MISTAKE_TYPES}
          selected={ann.mistakes || []}
          onToggle={(v) => ann.save({ mistakes: toggle(ann.mistakes || [], v) })} />
      </div>

      <div className="rounded-2xl border p-4" style={{ borderColor: 'var(--dash-border)', backgroundColor: 'var(--dash-bg-raised)' }}>
        <p className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--dash-text-faint)' }}>Trade Notes</p>
        <textarea
          value={notes}
          onChange={(e) => { setNotes(e.target.value); setDirty(true); }}
          placeholder="What was your thesis? What did you observe? What would you do differently?"
          className="w-full min-h-[120px] rounded-xl border bg-transparent p-3 text-sm outline-none resize-y transition-colors focus:border-accent/40"
          style={{ borderColor: 'var(--dash-border)', color: 'var(--dash-text-primary)' }}
        />
        <div className="mt-2 flex items-center justify-between">
          <p className="text-[10px]" style={{ color: 'var(--dash-text-faint)' }}>{notes.length > 0 ? `${notes.length} chars` : 'No notes yet'}</p>
          {dirty && (
            <button type="button" onClick={() => { ann.save({ notes }); setDirty(false); }}
              className="rounded-lg bg-accent/15 px-3 py-1 text-xs font-semibold text-accent transition-colors hover:bg-accent/25">
              Save Notes
            </button>
          )}
        </div>
      </div>

      {ann.updatedAt && (
        <p className="text-[10px] text-right" style={{ color: 'var(--dash-text-faint)' }}>
          Last saved: {new Date(ann.updatedAt).toLocaleString()}
        </p>
      )}
    </div>
  );
}

// ─── Narrative Block ──────────────────────────────────────────────────────────
const SEVERITY_COLORS = { CRITICAL: '#ef4444', HIGH: '#f97316', MEDIUM: '#facc15', LOW: '#94a3b8' };
const SEVERITY_BG = { CRITICAL: 'rgba(239,68,68,0.08)', HIGH: 'rgba(249,115,22,0.08)', MEDIUM: 'rgba(250,204,21,0.06)', LOW: 'rgba(148,163,184,0.06)' };
const SEVERITY_BORDER = { CRITICAL: 'rgba(239,68,68,0.20)', HIGH: 'rgba(249,115,22,0.18)', MEDIUM: 'rgba(250,204,21,0.15)', LOW: 'rgba(148,163,184,0.12)' };

function ScoreRing({ score, size = 56, stroke = 5 }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(score, 100)) / 100;
  const color = score >= 80 ? '#22c55e' : score >= 50 ? '#facc15' : '#ef4444';
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="rotate-[-90deg]">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={c} strokeDashoffset={c * (1 - pct)} strokeLinecap="round" className="transition-all duration-700" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-black" style={{ color }}>{score}</span>
      </div>
    </div>
  );
}

function NarrativeBlock({ narrative, narrativeBusy, narrativeErr, fetchNarrative }) {
  const parsed = useMemo(() => parseNarrative(narrative?.narrative), [narrative?.narrative]);
  const analysis = narrative?.analysis;
  const ds = analysis?.disciplineScore;
  const vs = analysis?.violationSummary;
  const upt = analysis?.unprotectedTime;
  const mc = analysis?.mistakeCost;
  const behaviorTags = narrative?.behaviorTags;
  const tts = useNarrativeTTS(parsed.full);

  const verdictColor = !vs ? '#94a3b8' : vs.total === 0 ? '#22c55e' : vs.critical > 0 ? '#ef4444' : vs.high > 0 ? '#f97316' : '#facc15';

  return (
    <div className="space-y-4">

      {/* ── Discipline Score + Violation Summary Row ──────────────────────── */}
      {ds && (
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
          {/* Score card */}
          <div className="rounded-2xl border p-4" style={{ borderColor: 'var(--dash-border)', backgroundColor: 'var(--dash-bg-raised)' }}>
            <div className="flex items-center gap-4">
              <ScoreRing score={ds.overall} />
              <div className="flex-1 min-w-0">
                <p className="text-[9px] font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--dash-text-faint)' }}>Discipline Score</p>
                <div className="space-y-1.5">
                  {[
                    { label: 'Risk', score: ds.breakdown.riskDiscipline.score, color: '#ef4444' },
                    { label: 'Execution', score: ds.breakdown.executionDiscipline.score, color: '#60a5fa' },
                    { label: 'Emotional', score: ds.breakdown.emotionalDiscipline.score, color: '#a78bfa' },
                  ].map((p) => (
                    <div key={p.label} className="flex items-center gap-2">
                      <span className="text-[9px] font-semibold w-14 shrink-0" style={{ color: 'var(--dash-text-faint)' }}>{p.label}</span>
                      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${p.score}%`, backgroundColor: p.color }} />
                      </div>
                      <span className="text-[10px] font-bold w-7 text-right" style={{ color: p.color }}>{p.score}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Violation summary card */}
          <div className="rounded-2xl border p-4" style={{ borderColor: SEVERITY_BORDER[vs?.worstViolation ? (vs.critical > 0 ? 'CRITICAL' : vs.high > 0 ? 'HIGH' : 'MEDIUM') : 'LOW'] || 'var(--dash-border)', backgroundColor: 'var(--dash-bg-raised)' }}>
            <p className="text-[9px] font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--dash-text-faint)' }}>Violations Found</p>
            {vs && vs.total > 0 ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-3xl font-black" style={{ color: verdictColor }}>{vs.total}</span>
                  <span className="text-xs" style={{ color: 'var(--dash-text-muted)' }}>violation{vs.total !== 1 ? 's' : ''} detected</span>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {vs.critical > 0 && <span className="rounded-lg px-2 py-0.5 text-[10px] font-bold" style={{ backgroundColor: SEVERITY_BG.CRITICAL, color: SEVERITY_COLORS.CRITICAL, border: `1px solid ${SEVERITY_BORDER.CRITICAL}` }}>{vs.critical} Critical</span>}
                  {vs.high > 0 && <span className="rounded-lg px-2 py-0.5 text-[10px] font-bold" style={{ backgroundColor: SEVERITY_BG.HIGH, color: SEVERITY_COLORS.HIGH, border: `1px solid ${SEVERITY_BORDER.HIGH}` }}>{vs.high} High</span>}
                  {vs.medium > 0 && <span className="rounded-lg px-2 py-0.5 text-[10px] font-bold" style={{ backgroundColor: SEVERITY_BG.MEDIUM, color: SEVERITY_COLORS.MEDIUM, border: `1px solid ${SEVERITY_BORDER.MEDIUM}` }}>{vs.medium} Medium</span>}
                  {vs.low > 0 && <span className="rounded-lg px-2 py-0.5 text-[10px] font-bold" style={{ backgroundColor: SEVERITY_BG.LOW, color: SEVERITY_COLORS.LOW, border: `1px solid ${SEVERITY_BORDER.LOW}` }}>{vs.low} Low</span>}
                </div>
              </div>
            ) : vs ? (
              <div className="flex items-center gap-2">
                <span className="text-3xl font-black" style={{ color: '#22c55e' }}>0</span>
                <span className="text-xs" style={{ color: '#22c55e' }}>Clean execution</span>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* ── Violation Cards ───────────────────────────────────────────────── */}
      {analysis?.violations?.length > 0 && (
        <div className="space-y-2">
          {analysis.violations.map((v) => {
            const sColor = SEVERITY_COLORS[v.severity] || '#94a3b8';
            return (
              <div key={v.id} className="flex items-start gap-3 rounded-xl border p-3" style={{ borderColor: SEVERITY_BORDER[v.severity], backgroundColor: SEVERITY_BG[v.severity] }}>
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[10px] font-black" style={{ backgroundColor: sColor + '20', color: sColor }}>
                  {v.severity === 'CRITICAL' ? '!!' : v.severity === 'HIGH' ? '!' : v.severity === 'MEDIUM' ? '~' : '-'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-bold" style={{ color: sColor }}>{v.type.replace(/_/g, ' ')}</span>
                    <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded" style={{ backgroundColor: sColor + '15', color: sColor }}>{v.severity}</span>
                    {v.durationSeconds != null && (
                      <span className="text-[9px]" style={{ color: 'var(--dash-text-faint)' }}>{v.durationSeconds}s</span>
                    )}
                  </div>
                  <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--dash-text-muted)' }}>{v.message}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Behavior Identity Tags ─────────────────────────────────────── */}
      {behaviorTags?.length > 0 && (
        <div className="rounded-2xl border p-4" style={{ borderColor: 'var(--dash-border)', backgroundColor: 'var(--dash-bg-raised)' }}>
          <p className="text-[9px] font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--dash-text-faint)' }}>Behavior Patterns (Last {behaviorTags[0]?.tradeCount || 20} Trades)</p>
          <div className="space-y-2.5">
            {behaviorTags.map((bt) => {
              const isPositive = bt.severity === 'POSITIVE';
              const tagColor = isPositive ? '#22c55e' : (SEVERITY_COLORS[bt.severity] || '#94a3b8');
              const tagBg = isPositive ? 'rgba(34,197,94,0.06)' : (SEVERITY_BG[bt.severity] || 'rgba(148,163,184,0.06)');
              const tagBorder = isPositive ? 'rgba(34,197,94,0.15)' : (SEVERITY_BORDER[bt.severity] || 'rgba(148,163,184,0.12)');
              const pct = Math.round(bt.confidence * 100);
              return (
                <div key={bt.tag} className="rounded-xl border p-3" style={{ borderColor: tagBorder, backgroundColor: tagBg }}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black tracking-wide" style={{ color: tagColor }}>{bt.tag.replace(/_/g, ' ')}</span>
                      {!isPositive && (
                        <span className="text-[8px] font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: tagColor + '15', color: tagColor }}>{bt.severity}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-mono font-bold" style={{ color: tagColor }}>{bt.matchCount}/{bt.tradeCount}</span>
                      <div className="w-12 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: tagColor }} />
                      </div>
                      <span className="text-[9px] font-mono" style={{ color: 'var(--dash-text-faint)' }}>{pct}%</span>
                    </div>
                  </div>
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--dash-text-muted)' }}>{bt.description}</p>
                  <p className="text-[10px] mt-1 font-mono" style={{ color: 'var(--dash-text-faint)' }}>{bt.evidence}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Unprotected Time + Mistake Cost Row ──────────────────────────── */}
      {(upt?.timeWithoutSL?.totalSeconds > 0 || mc?.comparison?.riskExceededBy) && (
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
          {upt?.timeWithoutSL?.totalSeconds > 0 && (
            <div className="rounded-xl border p-3.5" style={{ borderColor: 'rgba(239,68,68,0.15)', backgroundColor: 'rgba(239,68,68,0.04)' }}>
              <div className="flex items-center gap-1.5 mb-2">
                <svg className="h-3.5 w-3.5" style={{ color: '#ef4444' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
                <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#ef4444' }}>Unprotected Time</p>
              </div>
              <p className="text-2xl font-black" style={{ color: '#ef4444' }}>{upt.timeWithoutSL.percentOfTrade}%</p>
              <p className="text-[10px] mt-1" style={{ color: 'var(--dash-text-muted)' }}>
                {upt.timeWithoutSL.totalSeconds}s without stop loss out of {upt.tradeDurationSeconds}s total
              </p>
              {upt.timeToFirstSLSeconds != null && (
                <p className="text-[10px] mt-0.5" style={{ color: 'var(--dash-text-faint)' }}>
                  SL placed {upt.timeToFirstSLSeconds}s after entry
                </p>
              )}
            </div>
          )}
          {mc?.comparison?.riskExceededBy && (
            <div className="rounded-xl border p-3.5" style={{ borderColor: 'rgba(249,115,22,0.15)', backgroundColor: 'rgba(249,115,22,0.04)' }}>
              <div className="flex items-center gap-1.5 mb-2">
                <svg className="h-3.5 w-3.5" style={{ color: '#f97316' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" /></svg>
                <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#f97316' }}>Mistake Cost</p>
              </div>
              <p className="text-2xl font-black" style={{ color: '#f97316' }}>{mc.comparison.riskExceededBy}</p>
              <p className="text-[10px] mt-1" style={{ color: 'var(--dash-text-muted)' }}>risk exceeded vs planned</p>
              {mc.plannedRisk?.maxLoss != null && (
                <p className="text-[10px] mt-0.5" style={{ color: 'var(--dash-text-faint)' }}>
                  Planned max loss: {mc.comparison.currency === 'USD' ? '$' : ''}{mc.plannedRisk.maxLoss}
                  {mc.comparison.additionalLossFromViolation != null && ` | Extra loss: ${mc.comparison.currency === 'USD' ? '$' : ''}${mc.comparison.additionalLossFromViolation}`}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── AI Coach Narrative ────────────────────────────────────────────── */}
      <div className="rounded-2xl border overflow-hidden" style={{ borderColor: verdictColor + '30', background: `linear-gradient(135deg, ${verdictColor}08 0%, rgba(96,165,250,0.03) 100%)` }}>
        <div className="p-5 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs ring-1" style={{ backgroundColor: verdictColor + '15', color: verdictColor, ringColor: verdictColor + '25' }}>
                {narrativeBusy ? <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-t-transparent" style={{ borderColor: verdictColor + '40', borderTopColor: verdictColor }} /> : '✦'}
              </div>
              <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: verdictColor + '90' }}>Discipline Coach</p>
            </div>
            <div className="flex items-center gap-1.5">
              {tts.supported && parsed.full && (
                <div className="flex items-center gap-1.5">
                  <button type="button" onClick={tts.toggle}
                    className="relative flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[10px] font-semibold transition-all hover:bg-white/5 overflow-hidden"
                    style={{ borderColor: tts.playing && !tts.paused ? 'rgba(0,212,170,0.4)' : 'var(--dash-border)', color: tts.playing && !tts.paused ? '#00d4aa' : 'var(--dash-text-muted)' }}>
                    {tts.playing && tts.progress > 0 && (
                      <div className="absolute bottom-0 left-0 h-[2px] rounded-full transition-all duration-500" style={{ width: `${tts.progress}%`, backgroundColor: '#00d4aa' }} />
                    )}
                    {tts.playing && !tts.paused ? 'Pause' : tts.playing && tts.paused ? 'Resume' : 'Listen'}
                  </button>
                  {tts.playing && (
                    <button type="button" onClick={tts.stop}
                      className="flex h-7 w-7 items-center justify-center rounded-lg border transition-all hover:bg-white/5"
                      style={{ borderColor: 'var(--dash-border)', color: 'var(--dash-text-faint)' }}>
                      <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="2" /></svg>
                    </button>
                  )}
                </div>
              )}
              {narrative && !narrativeBusy && (
                <button type="button" onClick={() => fetchNarrative(true)}
                  className="rounded-xl border px-3 py-1.5 text-[10px] font-semibold transition-all hover:bg-white/5"
                  style={{ borderColor: 'var(--dash-border)', color: 'var(--dash-text-muted)' }}>
                  Regenerate
                </button>
              )}
            </div>
          </div>

          {/* Loading skeleton */}
          {narrativeBusy && !narrative && (
            <div className="space-y-2 py-2">
              {[90, 75, 60, 45].map((w, i) => (
                <div key={i} className="h-3 rounded-full animate-pulse" style={{ backgroundColor: 'var(--dash-border)', width: `${w}%` }} />
              ))}
            </div>
          )}

          {narrativeErr && <p className="text-xs text-amber-400">{narrativeErr}</p>}

          {narrative?.narrative && (
            <div className="space-y-4">
              {/* Verdict */}
              {parsed.verdict && (
                <div className="rounded-xl px-4 py-3" style={{ backgroundColor: verdictColor + '10', borderLeft: `3px solid ${verdictColor}` }}>
                  <p className="text-sm font-bold leading-relaxed" style={{ color: verdictColor }}>{parsed.verdict}</p>
                </div>
              )}

              {/* Timeline */}
              {parsed.timeline.length > 0 && (
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-widest mb-2" style={{ color: '#60a5fa80' }}>Timeline</p>
                  <div className="space-y-1">
                    {parsed.timeline.map((t, i) => (
                      <p key={i} className="text-xs leading-relaxed font-mono" style={{ color: 'var(--dash-text-muted)' }}>{t}</p>
                    ))}
                  </div>
                </div>
              )}

              {/* LLM Violations */}
              {parsed.violations.length > 0 && parsed.violations[0] !== 'None detected — disciplined execution.' && (
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-widest mb-2" style={{ color: '#ef444480' }}>Violations</p>
                  <div className="space-y-1">
                    {parsed.violations.map((v, i) => (
                      <p key={i} className="text-xs leading-relaxed" style={{ color: 'var(--dash-text-muted)' }}>{v}</p>
                    ))}
                  </div>
                </div>
              )}

              {/* Cost */}
              {parsed.cost && (
                <div className="rounded-xl border px-3.5 py-2.5" style={{ borderColor: 'rgba(249,115,22,0.15)', backgroundColor: 'rgba(249,115,22,0.04)' }}>
                  <p className="text-[9px] font-bold uppercase tracking-widest mb-1.5" style={{ color: '#f9731680' }}>Cost Analysis</p>
                  <p className="text-xs font-mono leading-relaxed" style={{ color: 'var(--dash-text-muted)' }}>{parsed.cost}</p>
                </div>
              )}

              {/* Fix */}
              {parsed.fix && (
                <div className="rounded-xl border px-3.5 py-2.5" style={{ borderColor: 'rgba(0,212,170,0.18)', backgroundColor: 'rgba(0,212,170,0.05)' }}>
                  <p className="text-[9px] font-bold uppercase tracking-widest mb-1.5" style={{ color: '#00d4aa80' }}>Fix</p>
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--dash-text-muted)' }}>{parsed.fix}</p>
                </div>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-1">
            <p className="text-[9px]" style={{ color: 'var(--dash-text-faint)' }}>Educational discipline analysis — not financial advice</p>
            {narrative?.model && (
              <p className="text-[9px]" style={{ color: 'var(--dash-text-faint)' }}>{narrative.cached ? 'Cached' : 'Fresh'} · {narrative.model}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function TradeDetailPage() {
  const { tradeUid = '' } = useParams();
  const { session } = useAuth();
  const { selectedTradingAccountId } = useTradingAccounts();
  const { isDark } = useDashboardTheme();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [trade, setTrade] = useState(null);
  const [media, setMedia] = useState([]);
  const [events, setEvents] = useState([]);
  const [tab, setTab] = useState('overview');
  const [shareOpen, setShareOpen] = useState(false);
  const shareCardRef = useRef(null);

  // AI narrative — single source of truth from the API
  const [narrative, setNarrative] = useState(null);
  const [narrativeBusy, setNarrativeBusy] = useState(false);
  const [narrativeErr, setNarrativeErr] = useState('');
  const narrativeFired = useRef(false);

  const load = useCallback(async () => {
    const token = session?.access_token;
    if (!token || !selectedTradingAccountId || !tradeUid) { setLoading(false); return; }
    setLoading(true); setError('');
    try {
      const [trades, mediaRows, eventRows] = await Promise.all([
        fetchUnifiedTrades({ accessToken: token, tradingAccountId: selectedTradingAccountId, limit: 500 }).catch(() => []),
        fetchJournalMedia({ accessToken: token, tradingAccountId: selectedTradingAccountId, tradeUid }).catch(() => []),
        fetchJournalEvents({ accessToken: token, tradingAccountId: selectedTradingAccountId, tradeUid }).catch(() => []),
      ]);
      const t = (Array.isArray(trades) ? trades : []).find((t) => t?.tradeUid === tradeUid) || null;
      setTrade(t);
      setMedia(Array.isArray(mediaRows) ? mediaRows : []);
      setEvents(Array.isArray(eventRows) ? eventRows : []);
    } catch (e) {
      setError(e?.message || 'Could not load trade.');
    } finally {
      setLoading(false);
    }
  }, [session?.access_token, selectedTradingAccountId, tradeUid]);

  useEffect(() => { load(); }, [load]);

  const fetchNarrative = useCallback(
    async (forceRefresh = false) => {
      const token = session?.access_token;
      if (!token || !selectedTradingAccountId || !tradeUid) return;
      setNarrativeBusy(true);
      setNarrativeErr('');
      try {
        const result = await requestTradeBehaviorNarrative({
          accessToken: token,
          tradingAccountId: selectedTradingAccountId,
          tradeUid,
          forceRefresh,
        });
        setNarrative(result);
      } catch (e) {
        setNarrativeErr(e?.message || 'Could not generate narrative.');
      } finally {
        setNarrativeBusy(false);
      }
    },
    [session?.access_token, selectedTradingAccountId, tradeUid]
  );

  // Auto-fire narrative once trade data loads (returns cached version if available)
  useEffect(() => {
    if (!trade || narrativeFired.current) return;
    narrativeFired.current = true;
    fetchNarrative(false);
  }, [trade, fetchNarrative]);

  const holdSeconds = useMemo(() => {
    if (!trade?.openedAt || !trade?.closedAt) return null;
    return Math.max(0, Math.floor((new Date(trade.closedAt) - new Date(trade.openedAt)) / 1000));
  }, [trade]);

  const TABS = [
    { id: 'overview', label: 'Overview' },
    { id: 'journal', label: 'Journal' },
    { id: 'replay', label: 'Replay' },
    { id: 'media', label: `Story ${media.length > 0 ? `(${media.length})` : ''}` },
    { id: 'timeline', label: 'Timeline' },
  ];

  if (loading) {
    return (
      <div className="space-y-4">
        <SkeletonBlock className="h-14 w-full" />
        <div className="grid gap-3 md:grid-cols-4">{[...Array(4)].map((_, i) => <SkeletonBlock key={i} className="h-20 w-full" />)}</div>
        <SkeletonBlock className="h-72 w-full" />
      </div>
    );
  }

  if (error) return (
    <div className="space-y-3">
      <DashboardPageBanner accent="violet" title="Trade Detail" subtitle="Inspect one trade in depth." actions={<Link to="/dashboard/trades" className="inline-flex items-center rounded-xl border px-4 py-2 text-sm font-semibold" style={{ borderColor: 'var(--dash-border)', color: 'var(--dash-text-secondary)' }}>← Back</Link>} />
      <p className="text-sm text-amber-400">{error}</p>
    </div>
  );

  if (!trade) return (
    <div className="space-y-3">
      <DashboardPageBanner accent="violet" title="Trade Detail" subtitle="Trade not found or outside history window." actions={<Link to="/dashboard/trades" className="inline-flex items-center rounded-xl border px-4 py-2 text-sm font-semibold" style={{ borderColor: 'var(--dash-border)', color: 'var(--dash-text-secondary)' }}>← Back</Link>} />
    </div>
  );

  const pnl = Number(trade.pnl);
  const isWin = pnl > 0;
  const side = (trade.side || '').toLowerCase();
  const isLong = side === 'buy' || side === 'long';
  const isClosed = String(trade.status || '').toUpperCase() === 'CLOSED';
  const pnlColor = isClosed && Number.isFinite(pnl) ? (isWin ? '#22c55e' : '#ef4444') : '#f59e0b';

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">

      {/* ── Hero header ─────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl border" style={{ borderColor: 'var(--dash-border)', backgroundColor: 'var(--dash-bg-raised)' }}>
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full blur-[80px] opacity-20" style={{ backgroundColor: pnlColor }} />
        <div className="pointer-events-none absolute left-1/3 -bottom-12 h-48 w-48 rounded-full blur-[60px] opacity-10" style={{ backgroundColor: isLong ? '#22c55e' : '#ef4444' }} />

        <div className="relative flex items-center justify-between px-6 lg:px-8 pt-5 pb-0">
          <div className="flex items-center gap-4">
            <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-lg font-black ring-1 ${isLong ? 'bg-emerald-500/12 text-emerald-400 ring-emerald-500/20' : 'bg-red-500/12 text-red-400 ring-red-500/20'}`}>
              {isLong ? 'L' : 'S'}
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-display font-black tracking-tight" style={{ color: 'var(--dash-text-primary)' }}>{trade.symbol || 'Unknown'}</h1>
                <span className={`rounded-lg px-2.5 py-1 text-[10px] font-bold ${isLong ? 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/15' : 'bg-red-500/10 text-red-400 ring-1 ring-red-500/15'}`}>{(trade.side || '—').toUpperCase()}</span>
                <span className={`rounded-lg px-2.5 py-1 text-[10px] font-bold ${isClosed ? 'bg-slate-500/10 text-slate-400' : 'bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/15'}`}>{trade.status}</span>
              </div>
              <p className="mt-1 text-[10px] font-mono" style={{ color: 'var(--dash-text-faint)' }}>{trade.tradeUid}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isClosed && (
              <button type="button" onClick={() => setShareOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-[12px] font-bold transition-all active:scale-95"
                style={{ background: 'linear-gradient(135deg, rgba(0,212,170,0.15), rgba(0,212,170,0.08))', color: '#00d4aa', border: '1px solid rgba(0,212,170,0.2)' }}>
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                Share
              </button>
            )}
            <Link to="/dashboard/trades" className="inline-flex items-center gap-1.5 rounded-xl border px-4 py-2.5 text-[12px] font-semibold transition-all hover:border-accent/25 hover:shadow-sm active:scale-95"
              style={{ borderColor: 'var(--dash-border)', color: 'var(--dash-text-muted)', backgroundColor: 'var(--dash-bg-card)' }}>
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" /></svg>
              All Trades
            </Link>
          </div>
        </div>

        <div className="relative px-6 lg:px-8 pb-6 pt-5">
          <div className="mb-5 flex flex-wrap items-end gap-4">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: pnlColor + '70' }}>Profit / Loss</p>
              <p className="text-5xl font-display font-black tracking-tighter" style={{ color: pnlColor, textShadow: isClosed ? `0 0 60px ${pnlColor}30` : 'none' }}>
                {isClosed && Number.isFinite(pnl) ? fmt$(pnl, trade.currency || 'USD') : 'OPEN'}
              </p>
            </div>
            {isClosed && Number.isFinite(pnl) && trade.entryPrice && (
              <span className="rounded-xl px-3 py-1.5 text-xs font-bold mb-1" style={{ backgroundColor: pnlColor + '12', color: pnlColor }}>
                {((pnl / (Number(trade.entryPrice) * (Number(trade.quantity) || 1))) * 100).toFixed(2)}% return
              </span>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {[
              { label: 'Entry', value: fmtNum(trade.entryPrice, 4), color: '#22c55e' },
              { label: 'Exit', value: fmtNum(trade.exitPrice, 4), color: '#ef4444' },
              { label: 'Hold Time', value: fmtDuration(holdSeconds), color: '#f59e0b' },
              { label: 'Quantity', value: trade.quantity || '—', color: '#8b5cf6' },
              { label: 'Opened', value: trade.openedAt ? new Date(trade.openedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—', color: '#60a5fa' },
              { label: 'Closed', value: trade.closedAt ? new Date(trade.closedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—', color: '#94a3b8' },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border px-3 py-3" style={{ borderColor: s.color + '15', backgroundColor: s.color + '06' }}>
                <p className="text-[8px] font-bold uppercase tracking-widest" style={{ color: s.color + '80' }}>{s.label}</p>
                <p className="mt-1.5 text-sm font-bold font-mono" style={{ color: 'var(--dash-text-primary)' }}>{s.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Tabs ────────────────────────────────────────────────────────────── */}
      <div className="flex gap-1 overflow-x-auto rounded-2xl border p-1.5" style={{ borderColor: 'var(--dash-border)', backgroundColor: 'var(--dash-bg-raised)' }}>
        {TABS.map((t) => (
          <button key={t.id} type="button" onClick={() => setTab(t.id)}
            className="relative shrink-0 rounded-xl px-4 py-2.5 text-[11px] font-bold transition-all"
            style={{ color: tab === t.id ? '#00d4aa' : 'var(--dash-text-muted)' }}>
            {tab === t.id && (
              <motion.div layoutId="activeTab" className="absolute inset-0 rounded-xl"
                style={{ backgroundColor: 'rgba(0,212,170,0.1)', border: '1px solid rgba(0,212,170,0.25)', boxShadow: '0 1px 4px rgba(0,212,170,0.08)' }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }} />
            )}
            <span className="relative">{t.label}</span>
          </button>
        ))}
      </div>

      {/* ── Tab content ─────────────────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.2 }}>

          {tab === 'overview' && (
            <div className="space-y-5">
              {/* Quick stats */}
              <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
                {[
                  { label: 'Events', value: events.length, color: '#60a5fa', icon: <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg> },
                  { label: 'Screenshots', value: media.length, color: '#00d4aa', icon: <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg> },
                  { label: 'Source', value: trade.source || '—', color: '#94a3b8', icon: <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg> },
                  { label: 'Currency', value: trade.currency || 'USD', color: '#94a3b8', icon: <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
                ].map((s) => (
                  <div key={s.label} className="rounded-2xl border p-4 transition-all hover:shadow-sm" style={{ borderColor: s.color + '15', backgroundColor: s.color + '06' }}>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ backgroundColor: s.color + '18', color: s.color }}>{s.icon}</div>
                      <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: s.color + '80' }}>{s.label}</p>
                    </div>
                    <p className="text-xl font-black" style={{ color: s.color }}>{s.value}</p>
                  </div>
                ))}
              </div>

              {/* AI narrative inline */}
              <NarrativeBlock narrative={narrative} narrativeBusy={narrativeBusy} narrativeErr={narrativeErr} fetchNarrative={fetchNarrative} />

              {/* Snapshot preview */}
              {media.length > 0 && (
                <div className="group relative overflow-hidden rounded-2xl border cursor-pointer transition-all hover:shadow-lg hover:border-accent/20" style={{ borderColor: 'var(--dash-border)' }} onClick={() => setTab('media')}>
                  {/* Stacked card effect for multiple screenshots */}
                  {media.length > 1 && (
                    <>
                      <div className="absolute -right-1 top-2 bottom-2 w-full rounded-2xl border opacity-30" style={{ borderColor: 'var(--dash-border)', backgroundColor: 'var(--dash-bg-card)', transform: 'translateX(6px) scale(0.97)' }} />
                      <div className="absolute -right-0.5 top-1 bottom-1 w-full rounded-2xl border opacity-50" style={{ borderColor: 'var(--dash-border)', backgroundColor: 'var(--dash-bg-card)', transform: 'translateX(3px) scale(0.985)' }} />
                    </>
                  )}
                  <div className="relative">
                    <img src={media[0].storageUrl} alt="Trade snapshot" className="h-40 w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

                    {/* Count badge */}
                    <div className="absolute top-3 right-3 flex items-center gap-1.5 rounded-lg px-2.5 py-1 backdrop-blur-md" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                      <svg className="h-3 w-3 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /></svg>
                      <span className="text-[10px] font-bold text-white/80">{media.length}</span>
                    </div>

                    {/* Bottom bar */}
                    <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-4 pb-3.5 pt-6">
                      <div>
                        <p className="text-sm font-bold text-white">Trade Snapshots</p>
                        <p className="text-[10px] text-white/50 mt-0.5">{media.length} screenshot{media.length !== 1 ? 's' : ''} during this trade</p>
                      </div>
                      <span className="flex items-center gap-1.5 rounded-xl bg-white/10 px-3.5 py-2 text-[11px] font-bold text-white backdrop-blur-sm transition-all group-hover:bg-accent/25 group-hover:text-accent">
                        View
                        <svg className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                      </span>
                    </div>
                  </div>

                  {/* Mini thumbnail strip preview */}
                  {media.length > 1 && (
                    <div className="flex gap-1.5 px-3 py-2.5" style={{ backgroundColor: 'var(--dash-bg-card)' }}>
                      {media.slice(0, 5).map((m, i) => {
                        const tmeta = EVENT_META[m.eventType] || { color: '#94a3b8' };
                        return (
                          <div key={m.id} className="relative h-8 flex-1 overflow-hidden rounded-md">
                            <img src={m.storageUrl} alt={m.eventType} className="h-full w-full object-cover" loading="lazy" />
                            <div className="absolute bottom-0.5 right-0.5 h-1.5 w-1.5 rounded-full ring-1 ring-black/30" style={{ backgroundColor: tmeta.color }} />
                          </div>
                        );
                      })}
                      {media.length > 5 && (
                        <div className="flex h-8 flex-1 items-center justify-center rounded-md text-[10px] font-bold" style={{ backgroundColor: 'var(--dash-bg-raised)', color: 'var(--dash-text-faint)' }}>
                          +{media.length - 5}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {tab === 'journal' && <JournalNotesPanel tradeUid={tradeUid} trade={trade} />}

          {tab === 'replay' && <RealReplayChart trade={trade} isDark={isDark} />}

          {tab === 'media' && <MediaReel media={media} />}

          {tab === 'timeline' && (
            <div className="rounded-2xl border p-5" style={{ borderColor: 'var(--dash-border)', backgroundColor: 'var(--dash-bg-raised)' }}>
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold" style={{ color: 'var(--dash-text-secondary)' }}>Event Timeline</h3>
                  <p className="text-[10px] mt-0.5" style={{ color: 'var(--dash-text-faint)' }}>Every modification and action during this trade</p>
                </div>
                {events.length > 0 && (
                  <span className="rounded-lg px-2.5 py-1 text-[10px] font-bold" style={{ backgroundColor: 'var(--dash-bg-card)', color: 'var(--dash-text-faint)' }}>{events.length} event{events.length !== 1 ? 's' : ''}</span>
                )}
              </div>
              <EventTimeline events={events} />
            </div>
          )}

        </motion.div>
      </AnimatePresence>

      {/* Share modal */}
      <ShareModal isOpen={shareOpen} onClose={() => setShareOpen(false)} cardRef={shareCardRef} title={`${trade.symbol} Trade`}>
        <TradeShareCard ref={shareCardRef} trade={trade} disciplineScore={narrative?.analysis?.disciplineScore?.overall ?? 100} events={events} />
      </ShareModal>
    </motion.div>
  );
}
