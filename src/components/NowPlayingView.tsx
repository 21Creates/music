import { usePlayer } from '@/hooks/usePlayer';
import { usePremium } from '@/context/PremiumContext';
import { useToast } from '@/context/ToastContext';
import { formatTime } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Play, Pause, SkipForward, SkipBack, X, Volume2, VolumeX, Waves, Crown, Heart, Share2, ListMusic } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import OfflineToggle from '@/components/OfflineToggle';

interface NowPlayingViewProps {
  open: boolean;
  onClose: () => void;
}

export function NowPlayingView({ open, onClose }: NowPlayingViewProps) {
  const { currentTrack, queue, queueIndex, isPlaying, currentTime, duration, volume, togglePlay, next, prev, seek, setVolume, setMixMode, mixMode } = usePlayer();
  const { isPremium, hasFeature } = usePremium();
  const toast = useToast();
  const { user } = useAuth();
  const [muted, setMuted] = useState(false);
  const [prevVol, setPrevVol] = useState(1);
  const [liked, setLiked] = useState(false);

  const logListening = useCallback(async () => {
    if (!currentTrack || !user) return;
    await supabase.from('listening_events').insert({
      room_id: currentTrack.room_id,
      track_id: currentTrack.id,
      user_id: user.id,
      listened_seconds: Math.floor(currentTime),
    }).then();
  }, [currentTrack, user, currentTime]);

  useEffect(() => {
    if (!open) return;
    const interval = setInterval(logListening, 15000);
    return () => clearInterval(interval);
  }, [open, logListening]);

  if (!open || !currentTrack) return null;

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const toggleMute = () => {
    if (muted) {
      setVolume(prevVol);
      setMuted(false);
    } else {
      setPrevVol(volume);
      setVolume(0);
      setMuted(true);
    }
  };

  const handleMixMode = () => {
    if (!hasFeature('mix_mode')) {
      toast.info('Mix Mode is a premium feature');
      return;
    }
    setMixMode(!mixMode);
    toast.success(mixMode ? 'Mix mode disabled' : 'Mix mode enabled');
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/#room?roomId=${currentTrack.room_id}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Room link copied');
    } catch {
      toast.error('Could not copy link');
    }
  };

  return (
    <div className="fixed inset-0 z-[180] animate-fade-in">
      <div className="absolute inset-0 bg-ink-950/95 backdrop-blur-2xl" onClick={onClose} />
      <div className="relative h-full flex flex-col items-center justify-center max-w-2xl mx-auto px-6 animate-scale-in">
        <button onClick={onClose} className="absolute top-4 right-4 btn-icon">
          <X className="w-6 h-6" />
        </button>

        <div className="w-full max-w-sm aspect-square rounded-3xl overflow-hidden shadow-2xl mb-8 relative group">
          {currentTrack.cover_url ? (
            <img src={currentTrack.cover_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-electric-500/40 via-magenta-500/20 to-ink-800 flex items-center justify-center">
              <Waves className="w-24 h-24 text-electric-400/50" />
            </div>
          )}
          {isPlaying && (
            <div className="absolute bottom-4 left-4 flex items-end gap-1">
              <div className="eq-bar h-6" />
              <div className="eq-bar h-8" />
              <div className="eq-bar h-5" />
              <div className="eq-bar h-7" />
            </div>
          )}
        </div>

        <div className="w-full text-center mb-6">
          <h2 className="text-2xl font-bold mb-1">{currentTrack.title}</h2>
          <p className="text-muted">{currentTrack.profiles?.display_name || 'Unknown artist'}</p>
        </div>

        <div className="w-full mb-6">
          <div
            className="relative h-1.5 bg-ink-700 rounded-full cursor-pointer group"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const pct = (e.clientX - rect.left) / rect.width;
              seek(pct * duration);
            }}
          >
            <div className="absolute inset-y-0 left-0 bg-electric-500 rounded-full" style={{ width: `${progress}%` }} />
            <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity" style={{ left: `${progress}%`, transform: 'translate(-50%, -50%)' }} />
          </div>
          <div className="flex justify-between mt-1.5 text-xs text-muted tabular-nums">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        <div className="flex items-center gap-6 mb-8">
          <button onClick={() => setLiked(!liked)} className="btn-icon">
            <Heart className={`w-6 h-6 ${liked ? 'fill-magenta-500 text-magenta-500' : ''}`} />
          </button>
          <button onClick={prev} className="btn-icon"><SkipBack className="w-6 h-6" /></button>
          <button onClick={togglePlay} className="w-14 h-14 rounded-full bg-white text-ink-950 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform shadow-xl">
            {isPlaying ? <Pause className="w-7 h-7" /> : <Play className="w-7 h-7 ml-1" />}
          </button>
          <button onClick={next} className="btn-icon"><SkipForward className="w-6 h-6" /></button>
          <button onClick={handleShare} className="btn-icon"><Share2 className="w-6 h-6" /></button>
        </div>

        <div className="w-full flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-1">
            <button onClick={toggleMute} className="btn-icon-sm shrink-0">
              {muted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <input type="range" min={0} max={1} step={0.01} value={muted ? 0 : volume} onChange={(e) => setVolume(parseFloat(e.target.value))} className="flex-1 max-w-32" />
          </div>
          <button
            onClick={handleMixMode}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${mixMode ? 'bg-electric-500/15 text-electric-400 border border-electric-500/20' : 'text-muted hover:text-ink-100 border border-transparent'}`}
          >
            <Waves className="w-4 h-4" />
            Mix Mode
            {!hasFeature('mix_mode') && <Crown className="w-3 h-3 text-amber-400" />}
          </button>
        </div>

        {currentTrack && (
          <div className="w-full mt-4 flex justify-center">
            <OfflineToggle track={currentTrack} variant="nowplaying" />
          </div>
        )}

        {queue.length > 1 && (
          <div className="w-full mt-6">
            <div className="flex items-center gap-2 mb-2 text-sm text-muted">
              <ListMusic className="w-4 h-4" /> Up Next
            </div>
            <div className="space-y-1 max-h-32 overflow-y-auto scrollbar-hide">
              {queue.slice(queueIndex + 1, queueIndex + 5).map((t) => (
                <div key={t.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm">
                  <div className="w-8 h-8 rounded bg-ink-700 overflow-hidden shrink-0">
                    {t.cover_url && <img src={t.cover_url} alt="" className="w-full h-full object-cover" />}
                  </div>
                  <span className="truncate flex-1">{t.title}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
