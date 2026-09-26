import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { initSentry } from './sentry.js';
import { applyDefaultUpgradesOnce } from './lib/prefs.js';

initSentry();

// Before render: both the prefs and the dashboard theme read localStorage in a
// useState initialiser, so anything that rewrites those values has to happen
// first or the old value is already in React state.
applyDefaultUpgradesOnce();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
