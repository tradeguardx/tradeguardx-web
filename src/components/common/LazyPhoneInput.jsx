import { lazy, Suspense } from 'react';

/**
 * PhoneInput, loaded on demand.
 *
 * libphonenumber's metadata is ~38 kB gzipped, and the app ships as one
 * bundle that the landing pages load too. Every phone field is behind a login
 * (first-time prompt, Alerts, support form), so the number metadata waits in
 * its own chunk until one of them renders instead of taxing every visitor.
 */
const PhoneInput = lazy(() => import('./PhoneInput'));

// Roughly the field's own height per variant, so nothing jumps when it lands.
const FALLBACK_HEIGHT = { prompt: 50, settings: 44, support: 42 };

export default function LazyPhoneInput(props) {
  const h = FALLBACK_HEIGHT[props.variant] ?? FALLBACK_HEIGHT.prompt;
  return (
    <Suspense fallback={<div aria-hidden style={{ height: h }} />}>
      <PhoneInput {...props} />
    </Suspense>
  );
}
