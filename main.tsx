import { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import './styles.css'

type BIP = Event & { prompt: () => Promise<void> }
function InstallBanner() {
  const [evt, setEvt] = useState<BIP | null>(null)
  const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent)
  const dismissedAt = Number(localStorage.getItem('install-dismissed') ?? 0)
  const [hide, setHide] = useState(Date.now() - dismissedAt < 14 * 864e5)
  useEffect(() => { const h = (e: Event) => { e.preventDefault(); setEvt(e as BIP) }; window.addEventListener('beforeinstallprompt', h); return () => window.removeEventListener('beforeinstallprompt', h) }, [])
  if (standalone || hide || (!evt && !ios)) return null
  const close = () => { localStorage.setItem('install-dismissed', String(Date.now())); setHide(true) }
  return (
    <div className="card" role="region" aria-label="Install Vinyl" style={{ margin: 16 }}>
      <span>{evt ? 'Install Vinyl on your device.' : 'To install: tap Share, then “Add to Home Screen”.'}</span>
      <span>{evt && <button className="p" onClick={() => void evt.prompt().then(close)}>Install</button>} <button onClick={close}>Not now</button></span>
    </div>
  )
}
function UpdateBanner() {
  const [reg, setReg] = useState<ServiceWorkerRegistration | null>(null)
  useEffect(() => {
    if (!('serviceWorker' in navigator) || !import.meta.env.PROD) return
    const had = !!navigator.serviceWorker.controller; let reloaded = false
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (had && !reloaded) { reloaded = true; location.reload() } })
    navigator.serviceWorker.register('/sw.js').then((r) => {
      const check = () => { if (r.waiting && navigator.serviceWorker.controller) setReg(r) }
      check(); r.addEventListener('updatefound', () => r.installing?.addEventListener('statechange', check))
    }).catch((e) => console.error('SW registration failed', e))
  }, [])
  if (!reg) return null
  const go = () => {
    const playing = Array.from(document.querySelectorAll('audio')).some((a) => !a.paused)
    if (playing && !confirm('Music is playing. Reload now?')) return
    reg.waiting?.postMessage('SKIP_WAITING')
  }
  return <div className="card" role="status" style={{ margin: 16 }}><span>Update available.</span><button className="p" onClick={go}>Reload</button></div>
}
createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={new QueryClient()}><InstallBanner /><UpdateBanner /><App /></QueryClientProvider>)
