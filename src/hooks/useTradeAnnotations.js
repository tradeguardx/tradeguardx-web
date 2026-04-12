import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'tgx_trade_annotations';

function readAll() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

function persist(all) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

const EMPTY = Object.freeze({
  notes: '',
  rating: 0,
  tags: [],
  setupType: '',
  emotion: '',
  mistakes: [],
  followedPlan: null,
});

/**
 * Per-trade annotations stored in localStorage.
 * Swap the storage layer for an API later without changing consumers.
 */
export function useTradeAnnotations(tradeUid) {
  const [data, setData] = useState(EMPTY);

  useEffect(() => {
    if (!tradeUid) return;
    const all = readAll();
    setData({ ...EMPTY, ...(all[tradeUid] || {}) });
  }, [tradeUid]);

  const save = useCallback(
    (patch) => {
      if (!tradeUid) return;
      const all = readAll();
      const next = { ...(all[tradeUid] || {}), ...patch, updatedAt: new Date().toISOString() };
      all[tradeUid] = next;
      persist(all);
      setData((d) => ({ ...d, ...next }));
    },
    [tradeUid],
  );

  return { ...data, save };
}

/**
 * Bulk read annotations for a list of tradeUids (used in table views).
 */
export function useTradeAnnotationsBulk(tradeUids) {
  const [map, setMap] = useState({});

  useEffect(() => {
    const all = readAll();
    const m = {};
    for (const uid of tradeUids) {
      if (uid && all[uid]) m[uid] = { ...EMPTY, ...all[uid] };
    }
    setMap(m);
  }, [tradeUids.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  return map;
}

export const SETUP_TYPES = [
  'Breakout', 'Reversal', 'Trend Follow', 'Range', 'Scalp',
  'News Event', 'Mean Reversion', 'Momentum', 'Other',
];

export const EMOTIONS = [
  'Calm', 'Confident', 'Anxious', 'FOMO', 'Revenge',
  'Impatient', 'Greedy', 'Disciplined', 'Neutral',
];

export const MISTAKE_TYPES = [
  'Moved SL', 'No SL', 'Over-leveraged', 'FOMO entry',
  'Early exit', 'Late entry', 'Ignored plan', 'Revenge trade',
  'Over-traded', 'Wrong size',
];
