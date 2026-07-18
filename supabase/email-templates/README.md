# Supabase auth email templates

The emails Supabase sends on our behalf — password reset, signup confirmation.
They are configured in the Supabase dashboard, not in this repo, so these files
are the source of truth: edit here, paste there, and the two stay in sync.

Design matches `tradeguardx-notifier-service/src/services/templates.ts` (the
breach-alert emails) so every email from us looks like it came from the same
company: white card, black header bar, `#00d4aa` accent, teal CTA.

## Two separate things to fix

Branding the template does **not** change who the email is from. Both need doing.

### 1. Templates (fixes the content)

Supabase Dashboard → **Authentication → Email Templates**. Paste each file into
its matching template and set the subject line:

| File | Template | Subject |
|---|---|---|
| `recovery.html` | Reset Password | `Reset your TradeGuardX password` |
| `confirm-signup.html` | Confirm signup | `Confirm your email — TradeGuardX` |
| `confirm-signup-otp.html` | Confirm signup (code instead of link) | `Your TradeGuardX verification code` |

Supabase substitutes `{{ .ConfirmationURL }}` and `{{ .Email }}` at send time;
leave them exactly as written.

#### Link or code?

Use **one** of the two confirm-signup files. Supabase decides by what the
template contains, not by a setting:

- `{{ .ConfirmationURL }}` → a click-to-verify **link** (`confirm-signup.html`)
- `{{ .Token }}` → a 6-digit **code** the user types (`confirm-signup-otp.html`)

The link is one click and converts better, so it's the default. The code wins in
exactly one situation: when users open mail on a phone but signed up on desktop —
a link verifies the wrong device's session, a code doesn't. If mobile-mail
signups turn out to be common, switch by pasting the OTP file over the same
template.

Whichever you pick, the app must handle it. Today the web app expects the
**link** flow. Moving to codes means adding a "enter your code" screen that calls
`supabase.auth.verifyOtp` — don't switch the template without that screen, or
signups will dead-end holding a code with nowhere to type it.

### 2. Custom SMTP (fixes the sender)

Until this is done, the emails come from `noreply@mail.app.supabase.io` with a
"powered by Supabase" footer we cannot remove — and, more importantly, Supabase's
shared SMTP is **rate-limited to a handful of emails per hour**. That limit is a
launch blocker, not a cosmetic one: during a campaign, signup confirmations
silently stop being delivered.

`tradeguardx.com` is already a verified domain in Resend (the notifier service
sends from `alerts@tradeguardx.com`), so this is just configuration:

Supabase Dashboard → **Authentication → SMTP Settings** → enable custom SMTP:

```
Host:        smtp.resend.com
Port:        465
Username:    resend
Password:    <the Resend API key — same one at SSM /tradeguardx/prod/resend/api-key>
Sender email: no-reply@tradeguardx.com
Sender name:  TradeGuardX
```

Use a **separate** `no-reply@` address rather than reusing `alerts@`. Auth mail
and breach alerts have very different engagement patterns, and if one of them
ever damages the sending reputation you don't want it taking the other down with
it — a trader must receive a kill-switch alert even if marketing mail is in the
doghouse.

### 3. Redirect allowlist (or the reset link goes nowhere)

Supabase Dashboard → **Authentication → URL Configuration → Redirect URLs**:

```
https://tradeguardx.com/reset-password
http://localhost:5173/reset-password
```

Without these, Supabase drops the redirect and sends the user to the Site URL
with a token the reset page never sees — the link appears to "do nothing".

## What is NOT in here

The **welcome email** is not a Supabase template — Supabase only sends auth
transactional mail and has no welcome hook. It lives in the user service
(`tradeguardx-user-service/src/services/welcomeEmail.ts`), is composed by us, and
goes out through Resend directly when a profile is first created, from
`no-reply@tradeguardx.com` (hardcoded in that service's `serverless.yml` — a
sender address is public, so only the Resend API key needs SSM). It carries the
same four setup steps as the in-app checklist plus the demo video, and it is the
one onboarding email whose content we fully control.

## Testing

Trigger a real reset from `/forgot-password` after each change. The template
preview in the Supabase dashboard does not render `{{ .ConfirmationURL }}`, so a
template that looks right in preview can still ship a broken link.
