import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import * as Sentry from '@sentry/react';
import { setIOSViewportHeight } from './lib/utils/ios-viewport.ts';

// Initialize iOS viewport height fix
setIOSViewportHeight();

// Optional Sentry init (set localStorage.sentry_dsn to enable)
const __dsn = (window as any)?.__SENTRY_DSN__ || localStorage.getItem('sentry_dsn');
if (__dsn) {
  Sentry.init({ dsn: __dsn, tracesSampleRate: 0.1 });
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
