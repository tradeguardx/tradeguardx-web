function formatPrice(price) {
  const a = Math.abs(price);
  if (a >= 100) return price.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (a >= 1) return price.toFixed(4);
  if (a === 0) return '0';
  return price.toFixed(Math.min(Math.ceil(-Math.log10(a)) + 3, 10));
}

/** Case/whitespace-insensitive — the AI is told to echo the exact requested timeframe string but occasionally "normalizes" it (e.g. "4H"). */
function sameTimeframe(a, b) {
  return (a || '').trim().toLowerCase() === (b || '').trim().toLowerCase();
}

const SECTION_LABEL = { color: 'var(--dash-text-faint)' };

/** Purely descriptive role labels by position in the analyzed set (1d/4h/1h/15m/5m) — never a directional call. */
const TIMEFRAME_ROLE = { '1d': 'Macro', '4h': 'Major', '1h': 'Intermediate', '15m': 'Local', '5m': 'Recent' };

const TIMEFRAME_BAR_MS = { '1d': 86_400_000, '4h': 14_400_000, '1h': 3_600_000, '15m': 900_000, '5m': 300_000, '1m': 60_000 };
/** "Fresh" = within the last ~15 bars of that finding's OWN timeframe — scales with granularity instead of a flat wall-clock window. */
const RECENT_BARS = 15;
function isRecentFinding(timestampMs, timeframe) {
  if (timestampMs == null) return false;
  const barMs = TIMEFRAME_BAR_MS[timeframe] ?? 3_600_000;
  return Date.now() - timestampMs <= RECENT_BARS * barMs;
}

/** Same categorical palette as `MarketStructureCanvasPrimitive` — never red/green, never keyed to bullish/bearish. */
const KIND_STYLE = {
  BOS: { color: 'var(--accent)', label: 'Structure Break', icon: 'bolt' },
  CHoCH: { color: '#f59e0b', label: 'Character Change', icon: 'swap' },
  LIQUIDITY_SWEEP: { color: '#e879f9', label: 'Liquidity Sweep', icon: 'wave' },
  ORDER_BLOCK: { color: '#a78bfa', label: 'Order Block', icon: 'box' },
  FVG: { color: '#facc15', label: 'Fair Value Gap', icon: 'gap' },
  PRICE_ACTION: { color: '#38bdf8', label: 'Current Price Action', icon: 'pulse' },
  VOLUME: { color: '#2dd4bf', label: 'Volume Confirmation', icon: 'volume' },
};

/** The one place conventional green/red is used — the trade-setup card is an explicit directional call, unlike everything else above. */
const TRADE_DIRECTION_COLOR = { bullish: '#34d399', bearish: '#f87171', neutral: 'var(--dash-text-muted)' };

function KindIcon({ icon, color }) {
  const common = { width: 14, height: 14, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: 2.25, strokeLinecap: 'round', strokeLinejoin: 'round' };
  if (icon === 'bolt') return <svg {...common}><path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z" /></svg>;
  if (icon === 'swap') return <svg {...common}><path d="M6 8h12M15 5l3 3-3 3M18 16H6M9 13l-3 3 3 3" /></svg>;
  if (icon === 'wave') return <svg {...common}><path d="M2 12c2-4 4-4 6 0s4 4 6 0 4-4 6 0" /></svg>;
  if (icon === 'box') return <svg {...common}><path d="M4 8l8-4 8 4-8 4-8-4z" /><path d="M4 8v8l8 4 8-4V8" /><path d="M12 12v8" /></svg>;
  if (icon === 'gap') return <svg {...common}><path d="M4 6h6M14 6h6M4 18h6M14 18h6" /><rect x="4" y="10" width="16" height="4" rx="1" /></svg>;
  if (icon === 'pulse') return <svg {...common}><path d="M3 12h4l2 7 4-14 2 7h6" /></svg>;
  if (icon === 'volume') return <svg {...common}><path d="M5 15v-4M10 17v-8M15 19v-12M20 13v-2" /></svg>;
  return null;
}

/** Bullish/bearish/ranging conveyed by icon SHAPE only, never by color — color-coding direction reads as a buy/sell signal. */
function StructureIcon({ type }) {
  const common = { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'var(--accent)', strokeWidth: 2.25, strokeLinecap: 'round', strokeLinejoin: 'round' };
  if (type === 'bullish') return <svg {...common}><path d="M4 17l6-6 4 4 6-8" /><path d="M14 7h6v6" /></svg>;
  if (type === 'bearish') return <svg {...common}><path d="M4 7l6 6 4-4 6 8" /><path d="M14 17h6v-6" /></svg>;
  return <svg {...common}><path d="M4 12h16" /><path d="M15 8l5 4-5 4" /></svg>;
}

function StatusIcon({ status }) {
  if (status === 'completed') {
    return (
      <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
        <circle cx={12} cy={12} r={9.5} opacity={0.35} />
        <path d="M8 12.5l2.5 2.5L16 9" />
      </svg>
    );
  }
  if (status === 'started') {
    return (
      <span className="relative flex h-2.5 w-2.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" style={{ backgroundColor: 'var(--accent)' }} />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full" style={{ backgroundColor: 'var(--accent)' }} />
      </span>
    );
  }
  return <span className="h-2 w-2 rounded-full" style={{ backgroundColor: 'var(--dash-border)' }} />;
}

/**
 * Real progress only — every line here corresponds to an operation that
 * actually happened (chart capture, vision call, DeepSeek call, validation),
 * driven by `captureEvents` (local, during the capture phase) and
 * `serverEvents` (polled from the session's `events` column). No fabricated
 * "thinking..." steps.
 */
export function AiActivityTimeline({ captureEvents, serverEvents, timeframes }) {
  const captureStateByTimeframe = {};
  for (const e of captureEvents) {
    if (e.type === 'TIMEFRAME_CAPTURE') captureStateByTimeframe[e.timeframe] = { status: e.status, thumbnailUrl: e.thumbnailUrl };
  }

  return (
    <div className="rounded-xl border p-3" style={{ borderColor: 'var(--dash-border)', background: 'linear-gradient(180deg, rgba(0,212,170,0.05), transparent)' }}>
      <p className="mb-2 text-[10px] font-bold uppercase tracking-wide" style={SECTION_LABEL}>AI Market Analysis</p>
      <div className="space-y-1.5 text-xs">
        {timeframes.map((tf) => {
          const { status, thumbnailUrl } = captureStateByTimeframe[tf] ?? {};
          const color = status === 'completed' ? 'var(--dash-text-secondary)' : status === 'started' ? 'var(--dash-text-primary)' : 'var(--dash-text-faint)';
          const label = status === 'completed' ? `${tf} captured` : status === 'started' ? `Capturing ${tf}…` : tf;
          return (
            <div key={tf} className="flex items-center gap-2" style={{ color }}>
              <span className="flex w-3.5 items-center justify-center">
                <StatusIcon status={status} />
              </span>
              {/* Real screenshot just captured, not a decorative placeholder. */}
              {thumbnailUrl && (
                <img src={thumbnailUrl} alt="" className="h-5 w-8 rounded object-cover" style={{ border: '1px solid var(--dash-border)' }} />
              )}
              <span className={status === 'started' ? 'font-semibold' : ''}>{label}</span>
            </div>
          );
        })}
        {serverEvents.map((e, i) => (
          <div key={i} className="flex items-center gap-2" style={{ color: 'var(--dash-text-secondary)' }}>
            <span className="flex w-3.5 items-center justify-center"><StatusIcon status="completed" /></span>
            <span>{e.message || e.type}</span>
          </div>
        ))}
        {serverEvents.length === 0 && Object.values(captureStateByTimeframe).every((s) => s.status === 'completed') && (
          <div className="flex items-center gap-2" style={{ color: 'var(--dash-text-muted)' }}>
            <span className="flex w-3.5 items-center justify-center"><StatusIcon status="started" /></span>
            <span className="font-semibold">Sending charts for analysis…</span>
          </div>
        )}
      </div>
    </div>
  );
}

function FindingCard({ kindKey, title, subtitle, description, onView }) {
  const style = KIND_STYLE[kindKey] ?? { color: 'var(--dash-text-secondary)', icon: null };
  return (
    <div className="flex gap-2.5 rounded-lg border-l-2 px-2.5 py-2" style={{ borderColor: style.color, backgroundColor: 'var(--dash-bg-input)' }}>
      <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md" style={{ backgroundColor: `color-mix(in srgb, ${style.color} 18%, transparent)` }}>
        <KindIcon icon={style.icon} color={style.color} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-bold" style={{ color: 'var(--dash-text-primary)' }}>{title}</p>
          {onView && (
            <button type="button" onClick={onView}
              className="shrink-0 rounded-md px-2 py-1 text-[10px] font-bold transition-colors hover:opacity-80"
              style={{ backgroundColor: `color-mix(in srgb, ${style.color} 16%, transparent)`, color: style.color }}>
              View
            </button>
          )}
        </div>
        <p className="text-[11px] font-semibold" style={{ color: 'var(--dash-text-muted)' }}>{subtitle}</p>
        {description && <p className="mt-1 text-[11px] leading-relaxed" style={{ color: 'var(--dash-text-muted)' }}>{description}</p>}
      </div>
    </div>
  );
}

/**
 * The scan ran across every analyzed timeframe at once, but the chart can
 * only plot one at a time — these pills make that explicit and let the user
 * switch which timeframe's structure is drawn without leaving the summary.
 */
function TimeframeSwitcher({ timeframes, activeTimeframe, resultTimeframes, onSwitchTimeframe }) {
  if (!timeframes?.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {timeframes.map((tf) => {
        const isActive = tf === activeTimeframe;
        const hasFindings = resultTimeframes.has(tf.trim().toLowerCase());
        return (
          <button key={tf} type="button" onClick={() => onSwitchTimeframe?.(tf)}
            disabled={!onSwitchTimeframe}
            className="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide transition-all"
            style={{
              backgroundColor: isActive ? 'var(--accent)' : 'var(--dash-bg-input)',
              color: isActive ? 'var(--surface-950, #0d0f14)' : hasFindings ? 'var(--dash-text-secondary)' : 'var(--dash-text-faint)',
              border: isActive ? 'none' : '1px solid var(--dash-border)',
              boxShadow: isActive ? '0 0 0 3px color-mix(in srgb, var(--accent) 22%, transparent)' : 'none',
            }}>
            {tf}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Confluence across every analyzed timeframe, computed purely by counting
 * the already-validated per-timeframe `structure` classifications — no new
 * AI call, no invented "confidence score". This is the headline: how much
 * of the analyzed structure agrees, stated as a count, never as a call.
 */
function StructuralConfluence({ structure }) {
  if (!structure?.length) return null;
  const counts = { bullish: 0, bearish: 0, ranging: 0 };
  for (const s of structure) {
    if (counts[s.type] != null) counts[s.type] += 1;
  }
  const total = structure.length;
  const parts = [
    counts.bullish > 0 && { type: 'bullish', label: 'Bullish', count: counts.bullish },
    counts.bearish > 0 && { type: 'bearish', label: 'Bearish', count: counts.bearish },
    counts.ranging > 0 && { type: 'ranging', label: 'Ranging', count: counts.ranging },
  ].filter(Boolean);

  return (
    <div className="rounded-xl border px-3 py-2.5"
      style={{ borderColor: 'var(--dash-border)', background: 'linear-gradient(135deg, color-mix(in srgb, var(--accent) 10%, transparent), transparent)' }}>
      <p className="text-[10px] font-bold uppercase tracking-wide" style={SECTION_LABEL}>Structural confluence · {total} timeframes analyzed</p>
      <div className="mt-1.5 flex flex-wrap items-center gap-3">
        {parts.map((p) => (
          <div key={p.type} className="flex items-center gap-1.5">
            <StructureIcon type={p.type} />
            <span className="text-sm font-bold" style={{ color: 'var(--dash-text-primary)' }}>{p.count}</span>
            <span className="text-[11px] font-semibold" style={{ color: 'var(--dash-text-muted)' }}>{p.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * A directional confidence tally + entry/SL/TP — every number here comes
 * straight from the backend's `tradeSetup` (derived from already-validated
 * findings, never a fresh AI numeric claim). Renders nothing when the
 * signals were mixed (`direction === 'neutral'`) — never forces a call out
 * of a genuinely unclear read. The disclaimer is mandatory and never
 * conditionally hidden: this is the one place in the app that IS an
 * explicit directional call, unlike every other descriptive annotation.
 */
/**
 * Where this timeframe's call sits relative to the timeframes above it.
 *
 * The setup itself is derived purely from the active timeframe — a 15m trade
 * is read off the 15m chart. The higher timeframes never change the direction;
 * they answer the separate question of whether the trade runs with or against
 * the larger move, which is precisely what a trader needs before sizing it.
 *
 * "counter" gets the loudest treatment: taking a counter-trend trade is fine,
 * taking one without realising it is the mistake worth preventing.
 */
function HigherTimeframeRow({ context, direction, activeTimeframe }) {
  if (!context || context.total === 0) return null;

  const list = context.timeframes.map((t) => t.timeframe.toUpperCase()).join(' · ');
  const copy = {
    aligned: {
      color: '#34d399',
      icon: 'M5 13l4 4L19 7',
      text: `${list} agree — ${direction} on ${activeTimeframe.toUpperCase()} runs with the higher timeframes`,
    },
    counter: {
      color: '#fbbf24',
      icon: 'M12 9v4m0 4h.01M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L14.7 3.9a2 2 0 00-3.4 0z',
      text: `Counter-trend — ${list} read ${context.bias}, against this ${activeTimeframe.toUpperCase()} ${direction} call`,
    },
    mixed: {
      color: 'var(--dash-text-muted)',
      icon: 'M4 12h16',
      text: `${list} disagree with each other — no clear higher-timeframe bias`,
    },
  }[context.alignment];

  if (!copy) return null;

  return (
    <div className="mt-2 flex items-start gap-1.5 rounded-lg px-2 py-1.5"
      style={{ backgroundColor: `color-mix(in srgb, ${copy.color} 10%, transparent)` }}>
      <svg className="mt-px h-3 w-3 shrink-0" fill="none" stroke={copy.color} strokeWidth={2.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d={copy.icon} />
      </svg>
      <span className="text-[10px] font-semibold leading-snug" style={{ color: copy.color }}>{copy.text}</span>
    </div>
  );
}

function TradeSetupCard({ tradeSetup }) {
  if (!tradeSetup || tradeSetup.direction === 'neutral') return null;
  const { direction, confidence, entry, stopLoss, takeProfit, strategy } = tradeSetup;
  const color = TRADE_DIRECTION_COLOR[direction];
  const isRange = strategy === 'range';
  const agreeing = direction === 'bullish' ? confidence.bullish : confidence.bearish;
  const headline = isRange
    ? (direction === 'bullish' ? 'Range reversal · Long' : 'Range reversal · Short')
    : (direction === 'bullish' ? 'Bullish setup' : 'Bearish setup');

  const chips = [
    entry != null && { label: 'Entry', value: formatPrice(entry), color: '#38bdf8' },
    stopLoss != null && { label: 'Stop Loss', value: formatPrice(stopLoss), color: '#f87171' },
    ...(takeProfit || []).map((tp, i) => ({ label: `Take Profit ${i + 1}`, value: formatPrice(tp), color: '#34d399' })),
  ].filter(Boolean);

  return (
    <div className="rounded-xl border px-3 py-2.5" style={{ borderColor: color, background: `linear-gradient(135deg, color-mix(in srgb, ${color} 12%, transparent), transparent)` }}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <StructureIcon type={direction} />
          <span className="text-sm font-bold" style={{ color }}>{headline}</span>
        </div>
        {/* A range call comes from proximity to the range boundary, not vote
            consensus — showing "N of M agree" here would misrepresent how
            it was actually derived, so it gets a plain methodology tag instead. */}
        {isRange ? (
          <span className="text-[10px] font-bold" style={{ color: 'var(--dash-text-muted)' }}>Range-bound · no trend confluence</span>
        ) : (
          <div className="flex items-center gap-1">
            {Array.from({ length: confidence.total }).map((_, i) => (
              <span key={i} className="h-1.5 w-4 rounded-full" style={{ backgroundColor: i < agreeing ? color : 'var(--dash-bg-input)' }} />
            ))}
            <span className="ml-1 text-[10px] font-bold" style={{ color: 'var(--dash-text-muted)' }}>{agreeing} of {confidence.total} agree</span>
          </div>
        )}
      </div>
      <HigherTimeframeRow context={tradeSetup.higherTimeframe} direction={direction} activeTimeframe={tradeSetup.timeframe} />
      {chips.length > 0 && (
        <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
          {chips.map((c) => (
            <div key={c.label} className="rounded-lg px-2 py-1.5" style={{ backgroundColor: `color-mix(in srgb, ${c.color} 10%, transparent)` }}>
              <p className="text-[9px] font-bold uppercase tracking-wide" style={{ color: c.color }}>{c.label}</p>
              <p className="font-mono text-[12px] font-bold" style={{ color: 'var(--dash-text-primary)' }}>{c.value}</p>
            </div>
          ))}
        </div>
      )}
      <p className="mt-2 text-[10px] leading-relaxed" style={{ color: 'var(--dash-text-faint)' }}>
        Informational analysis only — not financial advice. Not a recommendation to buy or sell.
      </p>
    </div>
  );
}

/** Shown once `aiAnalysis.phase === 'completed'` — every value here traces back to a validated finding, never invented in the panel. */
export function AiCompletedSummary({ result, activeTimeframe, onNavigate, analyzedTimeframes, onSwitchTimeframe }) {
  // Always the timeframe the user actually has selected on the chart — the
  // AI's own "primaryTimeframe" pick is its own judgement call, not the
  // user's, and must never override what's actually showing on-screen.
  const structureForActive = (result.structure || []).find((s) => sameTimeframe(s.timeframe, activeTimeframe)) || result.structure?.[0];
  const resultTimeframes = new Set([
    ...(result.structure || []).map((s) => (s.timeframe || '').trim().toLowerCase()),
    ...(result.swings || []).map((s) => (s.timeframe || '').trim().toLowerCase()),
    ...(result.levels || []).map((s) => (s.timeframe || '').trim().toLowerCase()),
  ]);

  // The broken swing's PRICE is never trusted from the model directly — only
  // its timestamp is (validated to precede the break). The price shown here
  // is looked up from that same swing in the already-validated `swings` list,
  // so it can never disagree with what's drawn on the chart.
  const swingByTimestamp = new Map((result.swings || []).map((s) => [`${s.timeframe}:${s.timestamp}`, s]));

  const findings = [
    ...(result.events || []).map((e) => {
      const brokenSwing = e.brokenSwingTimestamp != null ? swingByTimestamp.get(`${e.timeframe}:${e.brokenSwingTimestamp}`) : null;
      return {
        kindKey: e.type,
        title: KIND_STYLE[e.type]?.label ?? e.type,
        price: e.price,
        timeframe: e.timeframe,
        timestamp: e.timestamp,
        description: brokenSwing
          ? `${e.description ?? ''}${e.description ? ' — ' : ''}broke ${brokenSwing.type} ${formatPrice(brokenSwing.price)}`.trim()
          : e.description,
        importance: e.importance,
      };
    }),
    ...(result.liquiditySweeps || []).map((s) => ({
      kindKey: 'LIQUIDITY_SWEEP',
      title: KIND_STYLE.LIQUIDITY_SWEEP.label,
      price: s.price,
      timeframe: s.timeframe,
      timestamp: s.timestamp,
      description: s.description,
      importance: s.importance,
    })),
    ...(result.orderBlocks || []).map((ob) => ({
      kindKey: 'ORDER_BLOCK',
      title: KIND_STYLE.ORDER_BLOCK.label,
      rangeLabel: `${formatPrice(ob.low)} – ${formatPrice(ob.high)}`,
      timeframe: ob.timeframe,
      startTimestamp: ob.startTimestamp,
      endTimestamp: ob.endTimestamp,
      description: ob.description,
      importance: ob.importance,
    })),
    ...(result.fairValueGaps || []).map((g) => ({
      kindKey: 'FVG',
      title: KIND_STYLE.FVG.label,
      rangeLabel: `${formatPrice(g.low)} – ${formatPrice(g.high)}`,
      timeframe: g.timeframe,
      startTimestamp: g.startTimestamp,
      endTimestamp: g.endTimestamp,
      description: g.description,
      importance: g.importance,
    })),
    ...(result.volumeFindings || []).map((v) => ({
      kindKey: 'VOLUME',
      title: KIND_STYLE.VOLUME.label,
      price: v.price,
      timeframe: v.timeframe,
      timestamp: v.timestamp,
      description: v.description,
      importance: v.importance,
    })),
  ];

  // The AI writes a DEDICATED "what's happening in the last few candles"
  // entry per timeframe (never optional, unlike everything else) — that's a
  // deliberate judgement call, so it's preferred over a blunt recency filter
  // through the historical findings above. Falls back to that filter only
  // if an older/incomplete result never populated the dedicated field.
  const currentPriceAction = (result.currentPriceAction || [])
    .filter((f) => sameTimeframe(f.timeframe, activeTimeframe))
    .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

  // Freshest developments surface separately from established/major findings
  // — "price just swept the prior low" reads very differently from "price
  // broke this level three weeks ago," even at equal importance.
  const recentFindings = currentPriceAction.length > 0
    ? []
    : findings
        .filter((f) => isRecentFinding(f.timestamp ?? f.endTimestamp ?? f.startTimestamp, f.timeframe))
        .sort((a, b) => (b.timestamp ?? b.endTimestamp ?? 0) - (a.timestamp ?? a.endTimestamp ?? 0));
  const historicalFindings = findings
    .filter((f) => !recentFindings.includes(f))
    .sort((a, b) => (b.importance || 0) - (a.importance || 0));

  const tradeSetup = (result.tradeSetups || []).find((t) => sameTimeframe(t.timeframe, activeTimeframe)) || null;

  return (
    <div className="space-y-3">
      <TradeSetupCard tradeSetup={tradeSetup} />
      <StructuralConfluence structure={result.structure} />

      {analyzedTimeframes?.length > 1 && (
        <div>
          <p className="mb-1 text-[10px] font-bold uppercase tracking-wide" style={SECTION_LABEL}>
            Scanned every timeframe below · showing
          </p>
          <TimeframeSwitcher
            timeframes={analyzedTimeframes}
            activeTimeframe={activeTimeframe}
            resultTimeframes={resultTimeframes}
            onSwitchTimeframe={onSwitchTimeframe}
          />
        </div>
      )}

      {structureForActive && (
        <div className="flex items-center gap-3 rounded-xl border px-3 py-2.5"
          style={{ borderColor: 'var(--dash-border)', background: 'linear-gradient(135deg, color-mix(in srgb, var(--accent) 8%, transparent), transparent)' }}>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: 'color-mix(in srgb, var(--accent) 16%, transparent)' }}>
            <StructureIcon type={structureForActive.type} />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide" style={SECTION_LABEL}>Structure</p>
            <p className="text-sm font-bold capitalize" style={{ color: 'var(--dash-text-primary)' }}>{structureForActive.type}</p>
          </div>
        </div>
      )}

      {result.structure?.length > 1 && (
        <div>
          <p className="mb-1 text-[10px] font-bold uppercase tracking-wide" style={SECTION_LABEL}>Timeframe summary</p>
          <div className="space-y-1">
            {result.structure.map((s) => (
              <div key={s.id} className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[11px]" style={{ backgroundColor: 'var(--dash-bg-input)' }}>
                <StructureIcon type={s.type} />
                <span className="font-bold" style={{ color: 'var(--dash-text-secondary)' }}>{s.timeframe.toUpperCase()}</span>
                {TIMEFRAME_ROLE[s.timeframe] && (
                  <span className="rounded px-1 py-0.5 text-[9px] font-bold uppercase tracking-wide" style={{ backgroundColor: 'var(--dash-bg-raised)', color: 'var(--dash-text-faint)' }}>
                    {TIMEFRAME_ROLE[s.timeframe]}
                  </span>
                )}
                <span style={{ color: 'var(--dash-text-muted)' }}>· {s.description}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {(() => {
        const activeLevels = (result.levels || [])
          .filter((l) => sameTimeframe(l.timeframe, activeTimeframe))
          .sort((a, b) => (b.importance || 0) - (a.importance || 0))
          .slice(0, 5);
        if (activeLevels.length === 0) return null;
        return (
          <div>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-wide" style={SECTION_LABEL}>Important levels</p>
            <div className="space-y-1">
              {activeLevels.map((l) => (
                <button key={l.id} type="button" onClick={() => onNavigate?.(l)}
                  className="flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left text-[11px] transition-colors hover:bg-[var(--dash-bg-card-hover)]"
                  style={{ backgroundColor: 'var(--dash-bg-input)' }}>
                  <span className="font-bold" style={{ color: '#38bdf8' }}>{formatPrice(l.price)}</span>
                  <span className="flex-1 truncate" style={{ color: 'var(--dash-text-muted)' }}>{l.reason || (l.type === 'resistance' ? 'Resistance' : 'Support')}</span>
                </button>
              ))}
            </div>
          </div>
        );
      })()}

      {currentPriceAction.length > 0 && (
        <div>
          <p className="mb-1 text-[10px] font-bold uppercase tracking-wide" style={SECTION_LABEL}>Current price action</p>
          <div className="space-y-1.5">
            {currentPriceAction.map((f) => (
              <FindingCard key={f.id}
                kindKey="PRICE_ACTION"
                title={KIND_STYLE.PRICE_ACTION.label}
                subtitle={`${formatPrice(f.price)} · ${f.timeframe}`}
                description={f.description}
                onView={() => onNavigate?.({ ...f, kindKey: 'PRICE_ACTION' })}
              />
            ))}
          </div>
        </div>
      )}

      {recentFindings.length > 0 && (
        <div>
          <p className="mb-1 text-[10px] font-bold uppercase tracking-wide" style={SECTION_LABEL}>Recent price action</p>
          <div className="space-y-1.5">
            {recentFindings.slice(0, 4).map((f, i) => (
              <FindingCard key={i}
                kindKey={f.kindKey}
                title={f.title}
                subtitle={f.rangeLabel ? `${f.rangeLabel} · ${f.timeframe}` : `${formatPrice(f.price)} · ${f.timeframe}`}
                description={f.description}
                onView={() => onNavigate?.(f)}
              />
            ))}
          </div>
        </div>
      )}

      {historicalFindings.length > 0 && (
        <div>
          <p className="mb-1 text-[10px] font-bold uppercase tracking-wide" style={SECTION_LABEL}>Key findings</p>
          <div className="space-y-1.5">
            {historicalFindings.slice(0, 6).map((f, i) => (
              <FindingCard key={i}
                kindKey={f.kindKey}
                title={f.title}
                subtitle={f.rangeLabel ? `${f.rangeLabel} · ${f.timeframe}` : `${formatPrice(f.price)} · ${f.timeframe}`}
                description={f.description}
                onView={() => onNavigate?.(f)}
              />
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="mb-1 text-[10px] font-bold uppercase tracking-wide" style={SECTION_LABEL}>AI explanation</p>
        <div className="rounded-xl border px-3 py-2.5 text-[13px] leading-relaxed" style={{ borderColor: 'var(--dash-border)', color: 'var(--dash-text-secondary)', whiteSpace: 'pre-wrap' }}>
          {result.analysis?.summary}
        </div>
      </div>
    </div>
  );
}
