import { useEffect, useState, useCallback } from 'react';
import { useOfflineTracks } from '@/hooks/useOfflineTracks';
import { usePremium } from '@/context/PremiumContext';
import { useToast } from '@/context/ToastContext';
import { usePlayer } from '@/hooks/usePlayer';
import { getCatalog } from '@/lib/offlineDB';
import type { Room, Track } from '@/types';
import { Play, Trash2, Download, Crown, Wifi, WifiOff, Loader2, Music2, HardDrive } from 'lucide-react';
import { formatTime, timeAgo } from '@/lib/utils';

export default function OfflineScreen() {
  const { isPremium } = usePremium();
  const toast = useToast();
  const { allOfflineTracks, removeTrack, removeAll, savedCount, limit } = useOfflineTracks(isPremium);
  const { playTrack } = usePlayer();
  const [online, setOnline] = useState(navigator.onLine);
  const [catalogRooms, setCatalogRooms] = useState<Room[]>([]);
  const [catalogTracks, setCatalogTracks] = useState<Track[]>([]);
  const [storageUsed, setStorageUsed] = useState(0);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  const loadCatalog = useCallback(async () => {
    const cat = await getCatalog();
    if (cat) {
      setCatalogRooms(cat.rooms);
      setCatalogTracks(cat.tracks);
    }
  }, []);

  const loadStorage = useCallback(async () => {
    if (navigator.storage?.estimate) {
      const est = await navigator.storage.estimate();
      setStorageUsed(est.usage || 0);
    }
  }, []);

  useEffect(() => {
    loadCatalog();
    loadStorage();
  }, [loadCatalog, loadStorage, allOfflineTracks]);

  const totalSize = allOfflineTracks.reduce((sum, t) => sum + t.sizeBytes, 0);
  const persisted = navigator.storage?.persisted ? true : false;

  const handleRemoveAll = async () => {
    await removeAll();
    setStorageUsed(0);
    toast.success('All offline tracks removed');
  };

  const handlePlay = (trackId: string) => {
    const track = catalogTracks.find((t) => t.id === trackId);
    if (track) {
      playTrack(track, catalogTracks.filter((t) => allOfflineTracks.some((o) => o.trackId === t.id)));
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-8 py-6 md:py-8">
      <div className="flex items-center gap-3 mb-6">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${online ? 'bg-electric-500/15' : 'bg-amber-500/15'}`}>
          {online ? <Wifi className="w-5 h-5 text-electric-400" /> : <WifiOff className="w-5 h-5 text-amber-400" />}
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Offline Library</h1>
          <p className="text-sm text-muted">
            {online ? 'Online -- browse and save tracks' : 'Offline -- playing saved tracks only'}
          </p>
        </div>
      </div>

      {/* Storage info */}
      <div className="glass-card p-4 mb-6">
        <div className="flex items-center gap-3 mb-3">
          <HardDrive className="w-5 h-5 text-electric-400" />
          <h2 className="text-sm font-bold">Storage</h2>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center">
            <div className="text-lg font-bold text-electric-400">{savedCount}/{limit}</div>
            <div className="text-[10px] text-muted-2 uppercase tracking-wider font-bold">Tracks saved</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-magenta-400">{formatSize(totalSize)}</div>
            <div className="text-[10px] text-muted-2 uppercase tracking-wider font-bold">Space used</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-emerald-400">{formatSize(storageUsed)}</div>
            <div className="text-[10px] text-muted-2 uppercase tracking-wider font-bold">Total app data</div>
          </div>
        </div>
        <p className="text-xs text-muted mt-3">
          Offline tracks are stored in Vinyl on this device. Clearing your browser or app data will remove them.
          {!persisted && ' Storage may be cleared by the system under pressure.'}
        </p>
        {!isPremium && savedCount >= limit && (
          <div className="mt-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center gap-2">
            <Crown className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="text-xs text-amber-300 flex-1">Free plan saves up to {limit} tracks offline. Go Premium for {100}.</span>
          </div>
        )}
        {savedCount > 0 && (
          <button
            onClick={handleRemoveAll}
            className="btn-danger w-full mt-3 flex items-center justify-center gap-2 !py-2.5 text-sm"
          >
            <Trash2 className="w-4 h-4" /> Remove all offline tracks
          </button>
        )}
      </div>

      {/* Saved tracks */}
      {savedCount === 0 ? (
        <div className="glass-card p-12 text-center">
          <Download className="w-12 h-12 text-muted mx-auto mb-3" />
          <h3 className="text-sm font-bold mb-1">No tracks saved offline</h3>
          <p className="text-xs text-muted">
            Open a room and tap the download icon on any track to save it for offline listening.
          </p>
        </div>
      ) : (
        <div className="space-y-1.5">
          <h3 className="text-sm font-bold mb-2 flex items-center gap-2">
            <Music2 className="w-4 h-4 text-electric-400" /> Saved Tracks
          </h3>
          {allOfflineTracks.map((rec) => {
            const track = catalogTracks.find((t) => t.id === rec.trackId);
            return (
              <div key={rec.trackId} className="glass-card p-3 flex items-center gap-3 group">
                <button
                  onClick={() => handlePlay(rec.trackId)}
                  className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-ink-800 hover:bg-electric-500 hover:text-white text-ink-300 transition-all"
                >
                  <Play className="w-5 h-5 ml-0.5" fill="currentColor" />
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{rec.title}</p>
                  <p className="text-xs text-muted truncate">{rec.artistName}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-muted-2 tabular-nums">{formatSize(rec.sizeBytes)}</p>
                  {rec.lastPlayedAt && <p className="text-[10px] text-muted-2">Played {timeAgo(new Date(rec.lastPlayedAt).toISOString())}</p>}
                </div>
                <button
                  onClick={() => { removeTrack(rec.trackId); toast.success('Removed from offline'); }}
                  className="p-1.5 rounded-lg text-muted hover:text-magenta-400 transition-colors shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Cached catalog (offline browseable) */}
      {catalogRooms.length > 0 && (
        <div className="mt-8">
          <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
            <WifiOff className="w-4 h-4 text-muted" /> Cached Library
            <span className="text-xs text-muted-2 font-normal">Browseable offline</span>
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {catalogRooms.slice(0, 12).map((room) => {
              const roomTracks = catalogTracks.filter((t) => t.room_id === room.id);
              const savedCount = roomTracks.filter((t) => allOfflineTracks.some((o) => o.trackId === t.id)).length;
              return (
                <div key={room.id} className="glass-card p-3">
                  {room.cover_url ? (
                    <img src={room.cover_url} alt="" className="w-full aspect-square rounded-lg object-cover mb-2" />
                  ) : (
                    <div className="w-full aspect-square rounded-lg mb-2 flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${room.theme_color}40, ${room.theme_color}10)` }}>
                      <Music2 className="w-6 h-6" style={{ color: room.theme_color }} />
                    </div>
                  )}
                  <p className="text-sm font-semibold truncate">{room.name}</p>
                  <p className="text-xs text-muted">{roomTracks.length} tracks{savedCount > 0 && ` - ${savedCount} saved`}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
