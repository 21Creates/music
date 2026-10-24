import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

if ('serviceWorker' in navigator) {
  let refreshing = false;

  navigator.serviceWorker.register('/sw.js').then((reg) => {
    reg.addEventListener('updatefound', () => {
      const installing = reg.installing;
      if (!installing) return;
      installing.addEventListener('statechange', () => {
        if (installing.state === 'installed' && navigator.serviceWorker.controller) {
          precacheAppAssets();
          showUpdateToast();
        }
      });
    });
    precacheAppAssets();
  }).catch(() => {});

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });

  function showUpdateToast() {
    const existing = document.getElementById('sw-update-toast');
    if (existing) return;
    const toast = document.createElement('div');
    toast.id = 'sw-update-toast';
    toast.style.cssText = 'position:fixed;bottom:5rem;right:1rem;z-index:9999;background:#13131F;border:1px solid rgba(255,255,255,0.06);border-radius:0.75rem;padding:0.75rem 1rem;display:flex;align-items:center;gap:0.75rem;box-shadow:0 20px 50px rgba(0,0,0,0.5);font-family:Inter,system-ui,sans-serif;max-width:20rem;';
    toast.innerHTML = '<span style="color:#E8EAEE;font-size:0.875rem">New version available</span>';
    const btn = document.createElement('button');
    btn.textContent = 'Refresh';
    btn.style.cssText = 'background:#4D7CFE;color:#fff;border:none;padding:0.375rem 1rem;border-radius:0.5rem;font-size:0.8125rem;font-weight:600;cursor:pointer;';
    btn.onclick = () => {
      navigator.serviceWorker.controller?.postMessage({ type: 'SKIP_WAITING' });
    };
    toast.appendChild(btn);
    document.body.appendChild(toast);
  }

  function precacheAppAssets() {
    const precacheUrls: string[] = [];

    document.querySelectorAll('link[rel="stylesheet"]').forEach((el) => {
      const href = (el as HTMLLinkElement).href;
      if (href) precacheUrls.push(href);
    });

    document.querySelectorAll('script[src]').forEach((el) => {
      const src = (el as HTMLScriptElement).src;
      if (src) precacheUrls.push(src);
    });

    document.querySelectorAll('link[rel="preload"], link[rel="icon"]').forEach((el) => {
      const href = (el as HTMLLinkElement).href;
      if (href) precacheUrls.push(href);
    });

    navigator.serviceWorker.controller?.postMessage({
      type: 'PRECACHE_ASSETS',
      urls: precacheUrls,
    });
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
