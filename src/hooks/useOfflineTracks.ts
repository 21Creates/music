import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { getAudioUrl, getAudioCacheKey } from '@/lib/audioUrl';


import {
  type OfflineTrackRecord,
  getAllOfflineTracks,
  getOfflineTrack,
  saveOfflineTrack,
  removeOfflineTrack,
  clearAllOfflineTracks,
  getOfflineTrackIds,
} from '@/lib/offlineDB';
import type { Track } from '@/types';

const OFFLINE_CACHE = 'vinyl-offline-audio';
const FREE_LIMIT = 3;
const PREMIUM_LIMIT = 100;

export type OfflineStatus = 'idle' | 'queued' | 'fetching' | 'saved' | 'error';

export interface OfflineTrackState {
  trackId: string;
  status: OfflineStatus;
  progress: number;
  sizeBytes: number;
}

let globalOfflineIds: Set<string> = new Set();
const listeners = new Set<() => void>();
function notify() { listeners.forEach((l) => l()); }

export async function initOfflineIds() {
  globalOfflineIds = await getOfflineTrackIds();
  notify();
}

function isOffline(trackId: string) {
  return globalOfflineIds.has(trackId);
}

export function useOfflineTracks(isPremium: boolean) {
  const [, forceUpdate] = useState({});
  const [progressMap, setProgressMap] = useState<Record<string, OfflineTrackState>>({});
  const [allTracks, setAllTracks] = useState<OfflineTrackRecord[]>([]);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    const listener = () => forceUpdate({});
    listeners.add(listener);
    return () => { mounted.current = false; listeners.delete(listener); };
  }, []);

  useEffect(() => {
    initOfflineIds();
    refreshList();
  }, []);

  const refreshList = useCallback(async () => {
    const list = await getAllOfflineTracks();
    if (mounted.current) setAllTracks(list);
  }, []);

  const checkStorage = useCallback(async (trackSize: number): Promise<boolean> => {
    if (navigator.storage?.estimate) {
      const est = await navigator.storage.estimate();
      if (est.quota && est.usage !== undefined) {
        const remaining = est.quota - est.usage;
        if (remaining < trackSize + 20 * 1024 * 1024) return false;
      }
    }
    return true;
  }, []);

  const requestPersist = useCallback(async () => {
    if (navigator.storage?.persist) {
      const already = await navigator.storage.persisted();
      if (!already) await navigator.storage.persist();
    }
  }, []);

  const saveTrack = useCallback(async (track: Track, roomName?: string): Promise<{ ok: boolean; reason?: string }> => {
    if (globalOfflineIds.has(track.id)) return { ok: true };

    const { data: allowed } = await supabase.rpc('increment_offline_track_count', { p_track_id: track.id });
    if (!allowed) {
      return { ok: false, reason: 'limit' };
    }

    const rollback = () => supabase.rpc('decrement_offline_track_count', { p_track_id: track.id });

    const audioUrl = await getAudioUrl(track.file_path);
    if (!audioUrl) {
      await rollback();
      setProgressMap((p) => ({ ...p, [track.id]: { trackId: track.id, status: 'error', progress: 0, sizeBytes: 0 } }));
      return { ok: false, reason: 'fetch-failed' };
    }
    const cacheKey = getAudioCacheKey(track.file_path);

    setProgressMap((p) => ({ ...p, [track.id]: { trackId: track.id, status: 'queued', progress: 0, sizeBytes: 0 } }));

    try {
      const headRes = await fetch(audioUrl, { method: 'HEAD' });
      if (!headRes.ok) {
        await rollback();
        setProgressMap((p) => ({ ...p, [track.id]: { trackId: track.id, status: 'error', progress: 0, sizeBytes: 0 } }));
        return { ok: false, reason: 'fetch-failed' };
      }
      const sizeBytes = parseInt(headRes.headers.get('content-length') || '0', 10);

      if (sizeBytes > 0 && !(await checkStorage(sizeBytes))) {
        await rollback();
        setProgressMap((p) => ({ ...p, [track.id]: { trackId: track.id, status: 'error', progress: 0, sizeBytes: 0 } }));
        return { ok: false, reason: 'storage' };
      }

      setProgressMap((p) => ({ ...p, [track.id]: { trackId: track.id, status: 'fetching', progress: 0, sizeBytes } }));

      const res = await fetch(audioUrl);
      if (!res.ok) {
        setProgressMap((p) => ({ ...p, [track.id]: { trackId: track.id, status: 'error', progress: 0, sizeBytes: 0 } }));
        return { ok: false, reason: 'fetch-failed' };
      }

      const contentLength = sizeBytes || parseInt(res.headers.get('content-length') || '0', 10);
      const reader = res.body?.getReader();
      const chunks: Uint8Array[] = [];
      let received = 0;

      if (reader && contentLength > 0) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) {
            chunks.push(value);
            received += value.length;
            const pct = Math.min(100, Math.round((received / contentLength) * 100));
            if (mounted.current) {
              setProgressMap((p) => ({ ...p, [track.id]: { trackId: track.id, status: 'fetching', progress: pct, sizeBytes: contentLength } }));
            }
          }
        }
      } else {
        const buffer = await res.arrayBuffer();
        chunks.push(new Uint8Array(buffer));
        received = buffer.byteLength;
      }

      const cache = await caches.open(OFFLINE_CACHE);
      const cacheReq = new Request(cacheKey);
      const fullRes = new Response(new Blob(chunks as BlobPart[]), {
        headers: { 'Content-Type': res.headers.get('content-type') || 'audio/mpeg' },
      });
      await cache.put(cacheReq, fullRes);

      const record: OfflineTrackRecord = {
        trackId: track.id,
        roomId: track.room_id,
        title: track.title,
        artistName: track.profiles?.display_name || 'Unknown',
        coverUrl: track.cover_url,
        audioUrl: cacheKey,
        sizeBytes: received || contentLength,
        addedAt: Date.now(),
        lastPlayedAt: null,
      };
      await saveOfflineTrack(record);
      globalOfflineIds.add(track.id);
      notify();

      await requestPersist();

      if (mounted.current) {
        setProgressMap((p) => ({ ...p, [track.id]: { trackId: track.id, status: 'saved', progress: 100, sizeBytes: record.sizeBytes } }));
      }
      refreshList();
      return { ok: true };
    } catch {
      await rollback();
      if (mounted.current) {
        setProgressMap((p) => ({ ...p, [track.id]: { trackId: track.id, status: 'error', progress: 0, sizeBytes: 0 } }));
      }
      return { ok: false, reason: 'fetch-failed' };
    }
  }, [checkStorage, requestPersist, refreshList]);

  const removeTrack = useCallback(async (trackId: string, audioUrl?: string) => {
    const rec = audioUrl ? null : await getOfflineTrack(trackId);
    const url = audioUrl || rec?.audioUrl;
    if (url) {
      const cache = await caches.open(OFFLINE_CACHE);
      await cache.delete(new Request(url));
    }
    await removeOfflineTrack(trackId);
    await supabase.rpc('decrement_offline_track_count', { p_track_id: trackId });
    globalOfflineIds.delete(trackId);
    notify();
    setProgressMap((p) => {
      const next = { ...p };
      delete next[trackId];
      return next;
    });
    refreshList();
  }, [refreshList]);

  const removeAll = useCallback(async () => {
    const all = await getAllOfflineTracks();
    const cache = await caches.open(OFFLINE_CACHE);
    for (const rec of all) {
      await cache.delete(new Request(rec.audioUrl));
      await supabase.rpc('decrement_offline_track_count', { p_track_id: rec.trackId });
    }
    await clearAllOfflineTracks();
    globalOfflineIds.clear();
    notify();
    setProgressMap({});
    refreshList();
  }, [refreshList]);

  const reconcile = useCallback(async () => {
    const all = await getAllOfflineTracks();
    const cache = await caches.open(OFFLINE_CACHE);
    let changed = false;
    for (const rec of all) {
      const match = await cache.match(new Request(rec.audioUrl));
      if (!match) {
        await removeOfflineTrack(rec.trackId);
        await supabase.rpc('decrement_offline_track_count', { p_track_id: rec.trackId });
        globalOfflineIds.delete(rec.trackId);
        changed = true;
      }
    }
    if (changed) {
      notify();
      refreshList();
    }
  }, [refreshList]);

  return {
    offlineIds: globalOfflineIds,
    isOffline,
    progressMap,
    allOfflineTracks: allTracks,
    saveTrack,
    removeTrack,
    removeAll,
    reconcile,
    refreshList,
    limit: isPremium ? PREMIUM_LIMIT : FREE_LIMIT,
    savedCount: globalOfflineIds.size,
  };
}
