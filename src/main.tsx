import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Register service worker for installable PWA (no-op on unsupported browsers).
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      /* SW registration is best-effort; app works fine without it */
    });
  });
}

createRoot(document.getElementById('root')!).render(<App />);
