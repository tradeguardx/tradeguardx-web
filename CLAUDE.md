# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

React SPA — the main user-facing application. Includes a public landing/pricing page and an authenticated dashboard for managing trading accounts, viewing trade journal, and billing.

**Tech**: React 19, React Router v7, TailwindCSS, Vite 7 | **Local port**: 5173

## Commands

```bash
npm run dev          # Vite dev server (port 5173)
npm run build        # Production build to dist/
npm run preview      # Preview production build
npm run lint         # ESLint
```

## Architecture

### API Configuration
`src/api/config.js` is the single source of truth for all backend service URLs. It resolves based on `VITE_APP_ENV`:
- `local`: hits `localhost:{port}` for each service
- `dev`: hits `dev.api.tradeguardx.com/{basePath}`
- `prod`: hits `api.tradeguardx.com/{basePath}`

When adding a new service or changing ports, update this file.

### Auth
Supabase is used for authentication. The Supabase client is initialized once and used across the app. The JWT from Supabase is passed as `Authorization: Bearer <token>` to all API calls.

### Route Structure
Pages live in `src/pages/`. Key routes:
- `/` — landing page
- `/login`, `/signup` — auth pages
- `/pricing` — plan selection → triggers checkout via payments service
- `/trading-accounts` — account management + pairing flow
- `/trades` — trade list
- `/trades/:id` — trade detail + journal
- `/billing` — subscription management
- `/install` — Chrome extension install guide

### Pairing Flow (Critical UX)
`/trading-accounts` includes the extension pairing flow:
1. User clicks "Pair Extension" → calls user service to generate a pairing code
2. User enters code in the Chrome extension popup
3. Extension exchanges code for a session token
The UI must handle pending/paired/expired states from the pairing status endpoint.

### Rules Terminal (`src/components/dashboard/RulesTerminal.jsx`)
- Rule fields are defined server-side in `rule_templates.definition.fields` (declarative JSON schema rendered dynamically).
- `buildFields(template, instance, accountSize)` merges: saved instance config > trading account `accountSize` > template default.
- The `accountSize` field across all rule types (daily-loss, risk-per-trade, max-total-loss) is pre-filled from `selectedAccount.accountSize` so users don't have to retype it. Saved values always win.

### Prop Firm Picker (`src/pages/TradingAccountsPage.jsx`)
- Broker list comes from `GET /user/trading-accounts/supported-props`, backed by the `prop_firms` DB table.
- `status = 'active'` → selectable; `status = 'planned'` → "Coming soon" badge, disabled; `deprecated` → never returned.
- No `hasMapping` concept — `prop_firms.status` is the only gate.

### Charts
- `lightweight-charts` for candlestick/price charts in trade details
- `recharts` for analytics charts (win rate, P&L over time) in journal stats

## Environment Variables (.env.local)

```
VITE_APP_ENV=local|dev|prod
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```
