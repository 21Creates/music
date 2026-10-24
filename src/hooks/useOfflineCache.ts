import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { initOfflineIds } from '@/hooks/useOfflineTracks';
import { getAllOfflineTracks, removeOfflineTrack } from '@/lib/offlineDB';

export function useOfflineCache() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    // Reconcile offline tracks on load (detect iOS 7-day eviction)
    reconcileOfflineTracks();
    initOfflineIds();

    const handleOnline = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigator.serviceWorker.controller?.postMessage({
          type: 'SYNC_AUTH',
          token: session.access_token,
        });
      }
      reconcileOfflineTracks();
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);
}

async function reconcileOfflineTracks() {
  try {
    const all = await getAllOfflineTracks();
    const cache = await caches.open('vinyl-offline-audio');
    let changed = false;
    for (const rec of all) {
      const match = await cache.match(rec.audioUrl);
      if (!match) {
        await removeOfflineTrack(rec.trackId);
        changed = true;
      }
    }
    if (changed) initOfflineIds();
  } catch {}
}
