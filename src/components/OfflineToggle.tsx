import { Download, Check, Loader2, Crown } from 'lucide-react';
import { useOfflineTracks } from '@/hooks/useOfflineTracks';
import { usePremium } from '@/context/PremiumContext';
import { useToast } from '@/context/ToastContext';
import type { Track } from '@/types';

interface OfflineToggleProps {
  track: Track;
  variant?: 'row' | 'nowplaying';
  onLimitHit?: () => void;
}

export default function OfflineToggle({ track, variant = 'row', onLimitHit }: OfflineToggleProps) {
  const { isPremium, hasFeature } = usePremium();
  const toast = useToast();
  const { isOffline, saveTrack, removeTrack, limit, savedCount, progressMap } = useOfflineTracks(isPremium);

  const saved = isOffline(track.id);
  const prog = progressMap[track.id];

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (saved) {
      await removeTrack(track.id);
      toast.success('Removed from offline');
      return;
    }

    const limitReached = savedCount >= limit;
    if (limitReached) {
      if (!isPremium) {
        onLimitHit?.();
        toast.info('Free plan saves up to 3 tracks offline. Go Premium for 100.');
      } else {
        toast.error(`Offline limit of ${limit} tracks reached`);
      }
      return;
    }

    const result = await saveTrack(track);
    if (!result.ok) {
      if (result.reason === 'storage') toast.error('Not enough storage space on this device');
      else if (result.reason === 'limit') onLimitHit?.();
      else toast.error('Could not save track offline');
    } else {
      toast.success('Available offline in Vinyl');
    }
  };

  const sizeStr = (prog: { sizeBytes: number }) =>
    prog.sizeBytes > 0 ? `${(prog.sizeBytes / 1024 / 1024).toFixed(1)} MB` : '';

  if (variant === 'nowplaying') {
    return (
      <button
        onClick={handleClick}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${saved ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' : 'text-muted hover:text-ink-100 border border-transparent'}`}
      >
        {prog?.status === 'fetching' ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> {prog.progress}%</>
        ) : saved ? (
          <><Check className="w-4 h-4" /> Saved {sizeStr(prog)}</>
        ) : (
          <><Download className="w-4 h-4" /> Save offline {!isPremium && <Crown className="w-3 h-3 text-amber-400" />}</>
        )}
      </button>
    );
  }

  // Row variant: compact icon
  return (
    <button
      onClick={handleClick}
      title={saved ? 'Saved offline -- click to remove' : 'Save for offline listening'}
      className="p-1.5 rounded-lg transition-colors shrink-0"
    >
      {prog?.status === 'fetching' ? (
        <Loader2 className="w-4 h-4 text-electric-400 animate-spin" />
      ) : prog?.status === 'queued' ? (
        <Loader2 className="w-4 h-4 text-muted animate-pulse" />
      ) : saved ? (
        <Check className="w-4 h-4 text-emerald-400" />
      ) : (
        <Download className="w-4 h-4 text-muted hover:text-electric-400" />
      )}
    </button>
  );
}
