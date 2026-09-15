import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Unregister service worker if on an album URL to avoid interception
if (typeof window !== 'undefined' && window.location.pathname.startsWith('/album/')) {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      let unregistered = false;
      for (const registration of registrations) {
        registration.unregister();
        unregistered = true;
      }
      if (unregistered && !sessionStorage.getItem('sw_bypassed_main')) {
        sessionStorage.setItem('sw_bypassed_main', '1');
        window.location.reload();
      }
    });
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
