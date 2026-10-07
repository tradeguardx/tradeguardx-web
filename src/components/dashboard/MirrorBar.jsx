import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { sx } from './shell/sx';

/**
 * The bar across the top of a mirrored dashboard.
 *
 * It exists so an operator can never be in any doubt about three things: whose
 * account this is, that nothing here can be changed, and how long is left.
 *
 * IT IS DELIBERATELY LOUD. A subtle indicator is how someone ends up reading a
 * figure off the wrong account and telling a customer their balance. Violet
 * rather than red because nothing is wrong — red is the guard's colour and it
 * means something specific on these screens.
 *
 * The countdown is not decoration either. When it runs out every request
 * starts failing with a 401, and a dashboard that silently fills with errors
 * reads as a broken product rather than an expired token.
 */
export default function MirrorBar() {
  const { mirroring, mirror } = useAuth();
  const [left, setLeft] = useState(() => remaining(mirror?.expiresAt));

  useEffect(() => {
    if (!mirroring) return undefined;
    const id = setInterval(() => setLeft(remaining(mirror?.expiresAt)), 1000);
    return () => clearInterval(id);
  }, [mirroring, mirror?.expiresAt]);

  if (!mirroring || !mirror) return null;

  const who = mirror.email || mirror.userId;
  const dead = mirror.expired || left === '00:00';

  return (
    <div
      role="status"
      style={sx(
        /* Normal flow, not sticky. It sat on top of the guard band and made
           the top of the page unreadable — see DashboardLayout. It is the
           first thing on the page, so it does not need to float to be seen. */
        'display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding:9px 16px;border-bottom:1px solid rgba(124,58,237,.4)',
        { background: dead ? 'rgba(239,68,68,.16)' : 'rgba(124,58,237,.16)' },
      )}
    >
      <span
        style={sx(
          "flex:none;font:600 9.5px/1 'JetBrains Mono',monospace;letter-spacing:.16em;text-transform:uppercase;padding:4px 8px;border-radius:999px",
          { background: dead ? 'var(--red-tint)' : 'rgba(124,58,237,.22)', color: dead ? 'var(--red)' : '#c4b0ff' },
        )}
      >
        {dead ? 'Mirror expired' : 'Mirror · read only'}
      </span>

      <span style={sx('flex:1;min-width:min(240px,100%);font-size:12.5px;color:var(--ink-2)')}>
        {dead ? (
          <>
            This mirror of <strong style={sx('color:var(--ink)')}>{who}</strong> has expired. Reload
            to return to your own account, or mint a new one from the admin panel.
          </>
        ) : (
          <>
            You are seeing <strong style={sx('color:var(--ink)')}>{who}</strong>&rsquo;s dashboard
            exactly as they see it. Nothing on it can be changed — every write is refused by the
            server, not just hidden here.
          </>
        )}
      </span>

      {!dead && (
        <span
          style={sx(
            "flex:none;font:600 12px/1 'JetBrains Mono',monospace;font-variant-numeric:tabular-nums;color:var(--ink-2)",
          )}
        >
          {left} left
        </span>
      )}

      <button
        type="button"
        onClick={() => {
          // A reload drops the in-memory token and restores whoever is
          // actually signed in on this browser. There is nothing to clear.
          window.location.href = '/dashboard';
        }}
        style={sx(
          'flex:none;padding:6px 12px;border:1px solid var(--line);border-radius:8px;background:var(--surface);font:700 12px/1 Manrope,sans-serif;color:var(--ink);cursor:pointer',
        )}
      >
        Exit mirror
      </button>
    </div>
  );
}

function remaining(at) {
  if (!at) return '--:--';
  const ms = at.getTime() - Date.now();
  if (ms <= 0) return '00:00';
  const total = Math.floor(ms / 1000);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}
