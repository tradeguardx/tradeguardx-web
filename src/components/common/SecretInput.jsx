import { useState } from 'react';

/**
 * A masked input for API secrets that does NOT trip browser/password-manager
 * behaviour.
 *
 * The problem: a `type="password"` field makes Chrome (and 1Password/LastPass)
 * offer to *generate* or *save* a password — nonsense for a Delta API secret the
 * user is pasting in, and it interrupts the connect flow. `autocomplete="off"`
 * isn't enough; Chrome ignores it on password fields.
 *
 * The fix: render a normal `type="text"` input (so nothing treats it as a
 * credential) and mask the characters visually with `-webkit-text-security`. An
 * eye toggle reveals it so the user can verify a pasted secret. Masking works in
 * Chromium + WebKit and, as of recent versions, Firefox; if a browser doesn't
 * support the property the value just shows as plain text — acceptable for a
 * value the user pasted and can hide again.
 */
export default function SecretInput({ value, onChange, placeholder, className = '', wrapperClassName = '', style, name = 'tgx-secret', ...rest }) {
  const [reveal, setReveal] = useState(false);

  return (
    <div className={`relative ${wrapperClassName}`}>
      <input
        type="text"
        name={name}
        inputMode="text"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        data-lpignore="true"
        data-1p-ignore="true"
        data-bwignore="true"
        data-form-type="other"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`${className} pr-10`}
        style={{ ...style, WebkitTextSecurity: reveal ? 'none' : 'disc' }}
        {...rest}
      />
      <button
        type="button"
        onClick={() => setReveal((r) => !r)}
        aria-label={reveal ? 'Hide secret' : 'Show secret'}
        title={reveal ? 'Hide' : 'Show'}
        tabIndex={-1}
        className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 transition-colors hover:text-slate-200"
      >
        {reveal ? (
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
          </svg>
        ) : (
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        )}
      </button>
    </div>
  );
}
