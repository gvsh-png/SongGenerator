import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { isLocalMode } from './lib/config';
import { ensureLocalConfig } from './lib/storage';
import './index.css';

if (isLocalMode()) {
  ensureLocalConfig();
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
