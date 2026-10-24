import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { saveCatalog, getCatalog } from '@/lib/offlineDB';
import { initOfflineIds } from '@/hooks/useOfflineTracks';
import type { Room, Track } from '@/types';

const PRELOAD_ARTWORK_COUNT = 30;
const PRELOAD_BUDGET_BYTES = 25 * 1024 * 1024;
const IMAGE_CACHE = 'vinyl-images-v7';

export function useBackgroundPreload(userId: string | undefined) {
  const done = useRef(false);

  useEffect(() => {
    if (!userId || done.current) return;
    done.current = true;

    const run = async () => {
      const ric = (window as Window & { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number }).requestIdleCallback;
      const schedule = (cb: () => void) => {
        if (ric) ric(cb, { timeout: 4000 });
        else setTimeout(cb, 2000);
      };

      schedule(async () => {
        await syncCatalog(userId);
        await preloadArtwork();
        await initOfflineIds();
      });
    };

    run();
  }, [userId]);
}

async function syncCatalog(userId: string) {
  try {
    const [roomsRes, memberRes] = await Promise.all([
      supabase.from('rooms').select('*').eq('visibility', 'public').order('created_at', { ascending: false }).limit(24),
      supabase.from('room_members').select('room:rooms(*)').eq('user_id', userId).eq('status', 'active').order('created_at', { ascending: false }),
    ]);

    const rooms = [
      ...((roomsRes.data as Room[]) || []),
      ...((memberRes.data || []).map((m: { room: Room }) => m.room).filter(Boolean)),
    ];
    const seen = new Set<string>();
    const deduped = rooms.filter((r) => r && !seen.has(r.id) && seen.add(r.id));

    const roomIds = deduped.map((r) => r.id);
    let tracks: Track[] = [];
    if (roomIds.length > 0) {
      const { data: trackData } = await supabase
        .from('tracks')
        .select('*, profiles!tracks_uploaded_by_fkey(*)')
        .in('room_id', roomIds)
        .order('created_at', { ascending: false })
        .limit(200);
      tracks = (trackData as unknown as Track[]) || [];
    }

    await saveCatalog(deduped, tracks);
  } catch {}
}

async function preloadArtwork() {
  try {
    const catalog = await getCatalog();
    if (!catalog) return;

    const newest = catalog.tracks.slice(0, PRELOAD_ARTWORK_COUNT);
    const cache = await caches.open(IMAGE_CACHE);
    let totalSize = 0;

    for (const track of newest) {
      if (!track.cover_url) continue;
      if (totalSize >= PRELOAD_BUDGET_BYTES) break;

      const existing = await cache.match(track.cover_url);
      if (existing) continue;

      try {
        const res = await fetch(track.cover_url);
        if (!res.ok) continue;
        const size = parseInt(res.headers.get('content-length') || '0', 10);
        if (totalSize + size > PRELOAD_BUDGET_BYTES) break;
        totalSize += size || 50000;
        await cache.put(track.cover_url, res.clone());
      } catch {}
    }
  } catch {}
}
