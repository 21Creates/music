import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import type { JamSession, Track, RoomMember } from '@/types';
import { Radio, Play, Square, Users } from 'lucide-react';
import { navigate } from '@/hooks/useRoute';

interface JamBannerProps {
  roomId: string;
  tracks?: Track[];
  membership?: RoomMember | null;
  onJamUpdate?: () => void;
}

export default function JamBanner({ roomId, tracks: _tracks, membership: _membership, onJamUpdate }: JamBannerProps) {
  const { user } = useAuth();
  const toast = useToast();
  const [jam, setJam] = useState<JamSession | null>(null);
  const [participants, setParticipants] = useState<number>(0);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);

  useEffect(() => {
    const loadJam = async () => {
      const { data } = await supabase
        .from('jam_sessions')
        .select('*')
        .eq('room_id', roomId)
        .eq('status', 'active')
        .maybeSingle();
      setJam(data as JamSession | null);

      if (data) {
        const { count } = await supabase
          .from('jam_participants')
          .select('*', { count: 'exact', head: true })
          .eq('jam_id', data.id);
        setParticipants(count || 0);

        if (data.current_track_id) {
          const { data: track } = await supabase
            .from('tracks')
            .select('*')
            .eq('id', data.current_track_id)
            .maybeSingle();
          setCurrentTrack(track as Track | null);
        }
      }
    };
    loadJam();

    const channel = supabase
      .channel(`jam-${roomId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'jam_sessions', filter: `room_id=eq.${roomId}` },
        loadJam
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'jam_participants' },
        loadJam
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [roomId]);

  const startJam = async () => {
    if (!user) return;
    const { data, error } = await supabase.rpc('start_jam', { p_room_id: roomId });
    if (error) { toast.error(error.message); return; }
    toast.success('Jam session started!');
    onJamUpdate?.();
  };

  const endJam = async () => {
    if (!jam) return;
    const { error } = await supabase.rpc('end_jam', { p_jam_id: jam.id });
    if (error) { toast.error(error.message); return; }
    toast.success('Jam session ended');
    onJamUpdate?.();
  };

  if (!jam) {
    return (
      <button
        onClick={startJam}
        className="w-full glass-card-hover p-3 flex items-center gap-3 group"
      >
        <div className="w-10 h-10 rounded-xl bg-magenta-500/15 flex items-center justify-center">
          <Radio className="w-5 h-5 text-magenta-400" />
        </div>
        <div className="text-left flex-1">
          <p className="text-sm font-semibold">Start a Jam Session</p>
          <p className="text-xs text-muted">Listen together in real-time</p>
        </div>
        <Play className="w-4 h-4 text-muted group-hover:text-ink-100 transition-colors" />
      </button>
    );
  }

  return (
    <div className="glass-card p-3 border-magenta-500/20 animate-slide-down">
      <div className="flex items-center gap-3">
        <div className="relative w-10 h-10 rounded-xl bg-magenta-500/15 flex items-center justify-center shrink-0">
          <Radio className="w-5 h-5 text-magenta-400" />
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-magenta-500 rounded-full animate-pulse" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold">Jam Session Live</p>
            <span className="badge-red flex items-center gap-1"><Users className="w-3 h-3" /> {participants}</span>
          </div>
          {currentTrack && <p className="text-xs text-muted truncate">Now: {currentTrack.title}</p>}
        </div>
        {jam.host_id === user?.id && (
          <button onClick={endJam} className="btn-danger px-3 py-1.5 text-xs">
            <Square className="w-3.5 h-3.5" /> End
          </button>
        )}
        <button onClick={() => navigate(`/room?roomId=${roomId}`)} className="btn-secondary px-3 py-1.5 text-xs">
          Join
        </button>
      </div>
    </div>
  );
}
