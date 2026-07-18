import { useState } from 'react';

function EyeOpen() {
  return (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function EyeClosed() {
  return (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12c1.292 4.338 5.31 7.5 10.066 7.5.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
    </svg>
  );
}

/**
 * Password input with a show/hide toggle, styled to match the auth cards.
 * Extracted because the same field now appears in five places (login, signup ×2,
 * reset ×2, account settings ×3) and hand-copying the markup is how they drift.
 *
 * `autoComplete` matters more than it looks: password managers save the wrong
 * thing when a "new password" field is labelled as the current one, so callers
 * pass "new-password" or "current-password" explicitly.
 */
export default function PasswordField({
  id,
  label,
  value,
  onChange,
  placeholder = '••••••••',
  autoComplete = 'new-password',
  required = true,
  error = null,
  hint = null,
  labelRight = null,
}) {
  const [show, setShow] = useState(false);
  const [focused, setFocused] = useState(false);

  const ring = focused
    ? 'border-accent/40 bg-surface-800/80 ring-1 ring-accent/20'
    : error
      ? 'border-red-500/40 bg-surface-800/50'
      : 'border-surface-700/60 bg-surface-800/50 hover:border-surface-600/60';

  return (
    <div>
      {(label || labelRight) && (
        <div className="mb-1.5 flex items-center justify-between">
          {label && (
            <label htmlFor={id} className="text-[13px] font-medium text-slate-400">
              {label}
            </label>
          )}
          {labelRight}
        </div>
      )}
      <div className="relative">
        <input
          id={id}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          required={required}
          autoComplete={autoComplete}
          placeholder={placeholder}
          aria-invalid={error ? 'true' : undefined}
          className={`w-full h-12 px-4 pr-12 rounded-xl border text-white text-[14px] placeholder-slate-600 focus:outline-none transition-all ${ring}`}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? 'Hide password' : 'Show password'}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-600 transition-colors hover:text-slate-400"
        >
          {show ? <EyeClosed /> : <EyeOpen />}
        </button>
      </div>
      {error && <p className="mt-1.5 text-[12px] text-red-400">{error}</p>}
      {!error && hint && <p className="mt-1.5 text-[12px] text-slate-600">{hint}</p>}
    </div>
  );
}
