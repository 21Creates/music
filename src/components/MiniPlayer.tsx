import { usePlayer } from '@/hooks/usePlayer';
import { formatTime } from '@/lib/utils';
import { Play, Pause, SkipForward, SkipBack, ChevronUp, Volume2, VolumeX, Waves, WifiOff } from 'lucide-react';
import { useState, useEffect } from 'react';

interface MiniPlayerProps {
  onExpand: () => void;
}

export default function MiniPlayer({ onExpand }: MiniPlayerProps) {
  const { currentTrack, isPlaying, currentTime, duration, volume, togglePlay, next, prev, setVolume } = usePlayer();
  const [muted, setMuted] = useState(false);
  const [prevVol, setPrevVol] = useState(1);
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  useEffect(() => {
    if (volume > 0) setMuted(false);
  }, [volume]);

  if (!currentTrack) return null;

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

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] glass-panel border-t border-white/[0.06] safe-bottom">
      <div className="px-3 py-2.5 flex items-center gap-3 max-w-screen-2xl mx-auto">
        <button onClick={onExpand} className="flex items-center gap-3 min-w-0 flex-1 md:flex-none md:w-64 group">
          <div className="relative w-11 h-11 rounded-lg overflow-hidden shrink-0 bg-ink-700">
            {currentTrack.cover_url ? (
              <img src={currentTrack.cover_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-electric-500/30 to-magenta-500/20 flex items-center justify-center">
                <Waves className="w-5 h-5 text-electric-400" />
              </div>
            )}
            {isPlaying && (
              <div className="absolute inset-0 bg-black/40 flex items-end justify-center gap-0.5 pb-1.5">
                <div className="eq-bar h-3" />
                <div className="eq-bar h-4" />
                <div className="eq-bar h-2.5" />
                <div className="eq-bar h-3.5" />
              </div>
            )}
          </div>
          <div className="hidden md:block min-w-0">
            <p className="text-sm font-medium truncate group-hover:text-electric-400 transition-colors">{currentTrack.title}</p>
            <div className="flex items-center gap-1.5">
              <p className="text-xs text-muted truncate">{currentTrack.profiles?.display_name || 'Unknown'}</p>
              {!online && <span className="inline-flex items-center gap-0.5 text-[9px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded-full shrink-0"><WifiOff className="w-2.5 h-2.5" />Offline</span>}
            </div>
          </div>
          <ChevronUp className="w-5 h-5 text-muted shrink-0 md:hidden" />
        </button>

        <div className="flex-1 flex flex-col items-center gap-1 max-w-2xl mx-auto">
          <div className="flex items-center gap-2">
            <button onClick={prev} className="btn-icon-sm hidden sm:block"><SkipBack className="w-4 h-4" /></button>
            <button onClick={togglePlay} className="w-9 h-9 rounded-full bg-white text-ink-950 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform shadow-lg">
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
            </button>
            <button onClick={next} className="btn-icon-sm hidden sm:block"><SkipForward className="w-4 h-4" /></button>
          </div>
          <div className="w-full flex items-center gap-2">
            <span className="text-[10px] text-muted tabular-nums w-9 text-right hidden sm:block">{formatTime(currentTime)}</span>
            <div className="flex-1 h-1 bg-ink-700 rounded-full overflow-hidden">
              <div className="h-full bg-electric-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
            </div>
            <span className="text-[10px] text-muted tabular-nums w-9 hidden sm:block">{formatTime(duration)}</span>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-2 w-40">
          <button onClick={toggleMute} className="btn-icon-sm shrink-0">
            {muted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={muted ? 0 : volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="flex-1"
          />
        </div>
      </div>
    </div>
  );
}
