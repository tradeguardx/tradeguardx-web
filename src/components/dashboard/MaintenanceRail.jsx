import { sx } from './shell/sx';

/**
 * TEMPORARY — delete this file and its one import in DashboardLayout when
 * Shark testing is finished. Nothing else references it.
 *
 * THE WORDING IS THE POINT, not the bar.
 *
 * "Maintenance mode" on its own, on a product whose whole job is closing
 * positions for you, reads as "my protection is off". It is the same false
 * alarm as the guard flashing "Not protected" at an armed account: the user
 * cannot verify it, so they believe it, and a trader who believes their kill
 * switch is down either stops trading or trades unprotected on purpose.
 *
 * Delta and CoinDCX enforcement is genuinely untouched by the Shark work —
 * separate ECS services, separate adapters, and their task definitions are
 * pinned to the image they are already running. So the bar says what is
 * actually happening and, more importantly, what is not.
 */
export default function MaintenanceRail() {
  return (
    <div
      role="status"
      style={sx(
        'display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:9px 24px;border-bottom:1px solid var(--amber-line);background:var(--amber-tint)',
      )}
    >
      <span
        style={sx(
          "flex:none;font:700 9px/1 'JetBrains Mono',monospace;letter-spacing:.14em;text-transform:uppercase;padding:4px 7px;border-radius:5px;background:var(--amber);color:var(--surface)",
        )}
      >
        Maintenance
      </span>
      <span style={sx('font-size:12.5px;line-height:1.5;color:var(--ink-2)')}>
        We&rsquo;re testing a new exchange, so parts of the dashboard may move around.{' '}
        <strong style={sx('color:var(--ink);font-weight:700')}>
          Your rules are still enforcing as normal
        </strong>{' '}
        &mdash; Delta and CoinDCX accounts are unaffected.
      </span>
    </div>
  );
}
