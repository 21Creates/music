import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { usePremium } from '@/context/PremiumContext';
import type { Room, Track, RoomMember, RoomMessage } from '@/types';
import { Music2, Upload, MessageSquare, Users, ListMusic, Send, Play, Trash2, Crown, Shield, X, Settings, Share2, BarChart3, Gamepad2, Radio, ArrowLeft, Plus, Image as ImageIcon, Film, Search, ImagePlus, Loader2, Check, Trophy, Headphones, UserPlus, Clock, KeyRound, UserCheck, XCircle } from 'lucide-react';
import { audioManager } from '@/lib/audioManager';
import { usePlayer } from '@/hooks/usePlayer';
import { cn, formatTime, timeAgo, initials, avatarColor } from '@/lib/utils';
import JamBanner from '@/components/JamBanner';
import PollsTab from '@/components/PollsTab';
import GamesTab from '@/components/GamesTab';
import { RoomSettingsModal, InviteShareModal } from '@/components/RoomSettingsModal';
import { EmptyState, EqualizerBars, SkeletonRow } from '@/components/ui/Skeletons';
import { navigate } from '@/hooks/useRoute';
import OfflineToggle from '@/components/OfflineToggle';

type Tab = 'queue' | 'chat' | 'members' | 'polls' | 'games' | 'leaderboard';

export default function RoomPage({ roomId }: { roomId: string }) {
  const { user } = useAuth();
  const player = usePlayer();
  const toast = useToast();
  const [room, setRoom] = useState<Room | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [members, setMembers] = useState<RoomMember[]>([]);
  const [membership, setMembership] = useState<RoomMember | null>(null);
  const [tab, setTab] = useState<Tab>('queue');
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showShare, setShowShare] = useState(false);

  const loadAll = useCallback(async () => {
    const [roomRes, tracksRes, membersRes] = await Promise.all([
      supabase.from('rooms').select('*').eq('id', roomId).maybeSingle(),
      supabase.from('tracks').select('*, profiles!tracks_uploaded_by_fkey(*)').eq('room_id', roomId).order('created_at', { ascending: true }),
      supabase.from('room_members').select('*, profiles!room_members_user_id_fkey(*)').eq('room_id', roomId).order('created_at', { ascending: true }),
    ]);

    setRoom(roomRes.data as Room | null);
    setTracks((tracksRes.data || []) as unknown as Track[]);
    setMembers((membersRes.data || []) as unknown as RoomMember[]);

    if (user) {
      const mem = (membersRes.data || []).find((m: any) => m.user_id === user.id);
      setMembership(mem as RoomMember | null);
    }
    setLoading(false);
  }, [roomId, user]);

  useEffect(() => {
    loadAll();
    const channel = supabase.channel(`room-${roomId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tracks', filter: `room_id=eq.${roomId}` }, loadAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'room_members', filter: `room_id=eq.${roomId}` }, loadAll)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [roomId, user, loadAll]);

  if (loading) {
    return (
      <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-3">
        <div className="skeleton h-48 rounded-2xl mb-4" />
        <div className="flex gap-2 mb-4">
          {[...Array(5)].map((_, i) => <div key={i} className="skeleton h-9 w-24 rounded-xl" />)}
        </div>
        {[...Array(4)].map((_, i) => <SkeletonRow key={i} />)}
      </div>
    );
  }

  if (!room) {
    return (
      <div className="p-8 max-w-md mx-auto">
        <EmptyState
          icon={Music2}
          title="Room not found"
          description="This room may have been deleted or you don't have access to it."
          action={{ label: 'Back to Home', onClick: () => navigate('/') }}
        />
      </div>
    );
  }

  const isOwner = room.owner_id === user?.id;
  const isAdmin = membership?.role === 'admin' || isOwner;
  const isActive = membership?.status === 'active';
  const isPending = membership?.status === 'pending';
  const isNotMember = !membership;

  const [joining, setJoining] = useState(false);
  const [showPassphraseInput, setShowPassphraseInput] = useState(false);
  const [passphrase, setPassphrase] = useState('');

  const handleJoin = async () => {
    if (!user) return;
    setJoining(true);
    const { data, error } = await supabase.rpc('join_room', { p_room_id: roomId, p_passphrase: passphrase || null });
    setJoining(false);
    if (error) { toast.error(error.message); return; }
    const result = (data as { status: string; message: string }) || { status: 'error', message: 'Unknown error' };
    if (result.status === 'active') {
      toast.success(result.message);
      loadAll();
    } else if (result.status === 'pending') {
      toast.success(result.message);
      loadAll();
    } else {
      toast.error(result.message);
    }
  };

  const needsPassphrase = room.visibility === 'private' && room.passphrase !== null;

  const tabs: { id: Tab; icon: typeof ListMusic; label: string }[] = [
    { id: 'queue', icon: ListMusic, label: 'Queue' },
    { id: 'chat', icon: MessageSquare, label: 'Chat' },
    { id: 'members', icon: Users, label: 'Members' },
    { id: 'polls', icon: BarChart3, label: 'Polls' },
    { id: 'games', icon: Gamepad2, label: 'Games' },
    { id: 'leaderboard', icon: Trophy, label: 'Top Charts' },
  ];

  return (
    <div className="pb-32 md:pb-8">
      {/* Hero Banner */}
      <div className="relative h-52 md:h-64 overflow-hidden">
        {room.cover_url ? (
          <img src={room.cover_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${room.theme_color}40, ${room.theme_color}10)` }} />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-ink-950/40 via-ink-950/60 to-ink-950" />

        {/* Back button */}
        <button onClick={() => navigate('/')} className="absolute top-4 left-4 md:left-8 z-10 btn-icon bg-ink-950/50 backdrop-blur-md">
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="absolute bottom-0 left-0 right-0 p-4 md:p-8 max-w-5xl mx-auto">
          <div className="flex items-end gap-4">
            <div className="w-24 h-24 md:w-32 md:h-32 rounded-2xl border border-white/[0.08] flex items-center justify-center shadow-2xl shrink-0 overflow-hidden bg-ink-800">
              {room.cover_url ? (
                <img src={room.cover_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <Music2 className="w-10 h-10" style={{ color: room.theme_color }} />
              )}
            </div>
            <div className="min-w-0 pb-1 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] uppercase tracking-wider text-ink-200/60 font-bold">{room.visibility} room</span>
              </div>
              <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight truncate">{room.name}</h1>
              {room.description && <p className="text-sm text-ink-200/70 mt-1 line-clamp-2">{room.description}</p>}
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                <span className="badge-muted">{members.length} members</span>
                <span className="badge-muted">{tracks.length} tracks</span>
                {isActive && <span className="badge-green">Joined</span>}
              </div>
            </div>
            {isAdmin && (
              <div className="flex gap-1.5 shrink-0">
                <button onClick={() => setShowShare(true)} className="btn-icon bg-ink-950/50 backdrop-blur-md"><Share2 className="w-4 h-4" /></button>
                <button onClick={() => setShowSettings(true)} className="btn-icon bg-ink-950/50 backdrop-blur-md"><Settings className="w-4 h-4" /></button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 md:px-8 pt-4">
        {isActive && <JamBanner roomId={roomId} tracks={tracks} membership={membership} />}

        {isNotMember && (
          <div className="glass-card p-8 text-center animate-fade-in max-w-md mx-auto">
            <UserPlus className="w-12 h-12 text-electric-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Join This Room</h2>
            <p className="text-sm text-muted mb-6">
              {room.join_policy === 'request'
                ? 'This room requires admin approval to join. Submit a request and the room owner will review it.'
                : needsPassphrase
                  ? 'This private room requires a passphrase to join.'
                  : 'Become a member to listen, chat, and participate in this room.'}
            </p>
            {showPassphraseInput && needsPassphrase ? (
              <div className="space-y-3">
                <input
                  type="text"
                  value={passphrase}
                  onChange={(e) => setPassphrase(e.target.value)}
                  placeholder="Enter passphrase"
                  className="input-field text-center"
                />
                <button onClick={handleJoin} disabled={joining || !passphrase.trim()} className="btn-primary w-full flex items-center justify-center gap-2">
                  {joining ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                  {joining ? 'Joining...' : 'Join with passphrase'}
                </button>
              </div>
            ) : (
              <button onClick={() => needsPassphrase ? setShowPassphraseInput(true) : handleJoin()} disabled={joining} className="btn-primary w-full flex items-center justify-center gap-2">
                {joining ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                {joining ? 'Joining...' : room.join_policy === 'request' ? 'Request to Join' : 'Join Room'}
              </button>
            )}
          </div>
        )}

        {isPending && (
          <div className="glass-card p-8 text-center animate-fade-in max-w-md mx-auto">
            <Clock className="w-12 h-12 text-amber-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Pending Approval</h2>
            <p className="text-sm text-muted mb-4">Your request to join this room is awaiting admin approval. You'll get access once approved.</p>
            <span className="badge-gold">Awaiting Review</span>
          </div>
        )}

        {isActive && (
          <>
            {/* Tab bar */}
            <div className="flex gap-1 p-1 bg-ink-800/50 rounded-xl mb-4 w-fit overflow-x-auto scrollbar-hide">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 md:px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap',
                    tab === t.id ? 'bg-ink-700 text-white shadow-lg' : 'text-ink-400 hover:text-ink-200'
                  )}
                >
                  <t.icon className="w-4 h-4" /> {t.label}
                </button>
              ))}
            </div>

            {tab === 'queue' && <QueueTab tracks={tracks} currentTrackId={player.currentTrack?.id} isPlaying={player.isPlaying} onPlay={(idx) => player.playTrack(tracks[idx], tracks)} isAdmin={isAdmin} isActive={isActive} onUpload={() => setShowUpload(true)} roomId={roomId} onRefresh={loadAll} />}
            {tab === 'chat' && <ChatTab roomId={roomId} tracks={tracks} />}
            {tab === 'members' && <MembersTab members={members} isAdmin={isAdmin} isOwner={isOwner} onRefresh={loadAll} />}
            {tab === 'polls' && <PollsTab roomId={roomId} isAdmin={isAdmin} />}
            {tab === 'games' && <GamesTab roomId={roomId} isAdmin={isAdmin} />}
            {tab === 'leaderboard' && <LeaderboardTab roomId={roomId} />}
          </>
        )}
      </div>

      {showUpload && <UploadModal roomId={roomId} onClose={() => setShowUpload(false)} onUploaded={loadAll} />}
      {showSettings && <RoomSettingsModal room={room} onClose={() => setShowSettings(false)} onSaved={loadAll} />}
      {showShare && <InviteShareModal room={room} onClose={() => setShowShare(false)} />}
    </div>
  );
}

function QueueTab({ tracks, currentTrackId, isPlaying, onPlay, isAdmin, isActive, onUpload, roomId, onRefresh }: {
  tracks: Track[];
  currentTrackId?: string;
  isPlaying: boolean;
  onPlay: (idx: number) => void;
  isAdmin: boolean;
  isActive: boolean;
  onUpload: () => void;
  roomId: string;
  onRefresh: () => void;
}) {
  const toast = useToast();

  async function handleDelete(trackId: string, filePath: string) {
    await supabase.storage.from('vinyl-audio').remove([filePath]);
    await supabase.from('tracks').delete().eq('id', trackId);
    toast.success('Track deleted');
    onRefresh();
  }

  async function handleCoverArt(trackId: string, file: File) {
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    const ext = file.name.split('.').pop();
    const fileName = `${roomId}/covers/${trackId}_${Date.now()}.${ext}`;
    const { error: uploadErr } = await supabase.storage.from('vinyl-covers').upload(fileName, file, { contentType: file.type });
    if (uploadErr) {
      toast.error('Failed to upload image');
      return;
    }
    const { data } = supabase.storage.from('vinyl-covers').getPublicUrl(fileName);
    const { error: updateErr } = await supabase.from('tracks').update({ cover_url: data.publicUrl }).eq('id', trackId);
    if (updateErr) {
      toast.error('Failed to update cover art');
      return;
    }
    toast.success('Cover art updated');
    onRefresh();
  }

  if (tracks.length === 0) {
    return (
      <div className="space-y-4">
        {isAdmin && (
          <button onClick={onUpload} className="btn-primary w-full flex items-center justify-center gap-2 !py-3">
            <Upload className="w-5 h-5" /> Add Music
          </button>
        )}
        <EmptyState icon={Music2} title="No tracks yet" description={isAdmin ? "Upload a track to get the queue started." : isActive ? "Only room admins can add music. Ask an admin to upload tracks." : "Join this room to listen along."} />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {isAdmin && (
        <button onClick={onUpload} className="btn-primary w-full flex items-center justify-center gap-2 !py-2.5 mb-2">
          <Plus className="w-4 h-4" /> Add Music
        </button>
      )}
      {tracks.map((track, idx) => {
        const isCurrent = track.id === currentTrackId;
        return (
          <div
            key={track.id}
            className={cn(
              'flex items-center gap-3 p-2.5 rounded-xl transition-all group',
              isCurrent ? 'glass-card ring-1 ring-electric-500/30' : 'hover:bg-white/[0.03]'
            )}
          >
            <button
              onClick={() => onPlay(idx)}
              className={cn('w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-all overflow-hidden', isCurrent ? 'bg-electric-500 text-white' : 'bg-ink-800 text-ink-300 hover:bg-ink-700 hover:text-white')}
            >
              {track.cover_url ? (
                <img src={track.cover_url} alt="" className="w-full h-full object-cover" />
              ) : isCurrent && isPlaying ? (
                <EqualizerBars className="text-white" />
              ) : (
                <Play className="w-5 h-5 ml-0.5" fill="currentColor" />
              )}
            </button>
            <div className="flex-1 min-w-0">
              <div className={cn('text-sm font-semibold truncate', isCurrent && 'text-electric-400')}>{track.title}</div>
              <div className="text-xs text-muted truncate">{track.profiles?.display_name || 'Unknown'}</div>
            </div>
            <span className="text-xs text-muted-2 tabular-nums hidden sm:block">{formatTime(track.duration_seconds)}</span>
            <OfflineToggle track={track} />
            {isAdmin && (
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <label className="p-1.5 rounded-lg text-muted hover:text-electric-400 cursor-pointer transition-colors" title={track.cover_url ? 'Change cover art' : 'Add cover art'}>
                  <ImagePlus className="w-4 h-4" />
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleCoverArt(track.id, f); e.target.value = ''; }}
                  />
                </label>
                <button onClick={() => handleDelete(track.id, track.file_path)} className="p-1.5 rounded-lg text-muted hover:text-magenta-400 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function LeaderboardTab({ roomId }: { roomId: string }) {
  const [topSongs, setTopSongs] = useState<(Track & { play_count: number })[]>([]);
  const [topListeners, setTopListeners] = useState<{ user_id: string; play_count: number; profiles?: { display_name: string; avatar_url: string | null } }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [songsRes, listenersRes] = await Promise.all([
        supabase.from('track_plays')
          .select('track_id, tracks!track_plays_track_id_fkey(id, title, cover_url, room_id, uploaded_by, file_path, duration_seconds, created_at, profiles!tracks_uploaded_by_fkey(display_name, avatar_url))')
          .eq('room_id', roomId)
          .order('played_at', { ascending: false })
          .limit(200),
        supabase.from('track_plays')
          .select('user_id, profiles!track_plays_user_id_fkey(display_name, avatar_url)')
          .eq('room_id', roomId)
          .limit(500),
      ]);

      const songCounts: Record<string, number> = {};
      const songMap: Record<string, any> = {};
      (songsRes.data || []).forEach((row: any) => {
        if (!row.track_id) return;
        songCounts[row.track_id] = (songCounts[row.track_id] || 0) + 1;
        if (!songMap[row.track_id] && row.tracks) {
          const t = row.tracks;
          songMap[row.track_id] = {
            id: t.id, title: t.title, cover_url: t.cover_url, room_id: t.room_id,
            uploaded_by: t.uploaded_by, file_path: t.file_path, duration_seconds: t.duration_seconds,
            created_at: t.created_at, profiles: t.profiles,
          };
        }
      });
      const songs = Object.entries(songCounts)
        .map(([id, count]) => ({ ...songMap[id], play_count: count }))
        .sort((a, b) => b.play_count - a.play_count)
        .slice(0, 5);
      setTopSongs(songs);

      const listenerCounts: Record<string, number> = {};
      const listenerProfiles: Record<string, any> = {};
      (listenersRes.data || []).forEach((row: any) => {
        if (!row.user_id) return;
        listenerCounts[row.user_id] = (listenerCounts[row.user_id] || 0) + 1;
        if (!listenerProfiles[row.user_id] && row.profiles) {
          listenerProfiles[row.user_id] = row.profiles;
        }
      });
      const listeners = Object.entries(listenerCounts)
        .map(([user_id, play_count]) => ({ user_id, play_count, profiles: listenerProfiles[user_id] }))
        .sort((a, b) => b.play_count - a.play_count)
        .slice(0, 5);
      setTopListeners(listeners);
      setLoading(false);
    })();
  }, [roomId]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-48 rounded-2xl" />
        <div className="skeleton h-48 rounded-2xl" />
      </div>
    );
  }

  const totalPlays = topSongs.reduce((sum, s) => sum + s.play_count, 0) + topListeners.reduce((sum, l) => sum + l.play_count, 0);

  if (totalPlays === 0) {
    return (
      <EmptyState
        icon={Trophy}
        title="No play data yet"
        description="Start listening to tracks in this room to build the charts. Top songs and most active listeners will appear here."
      />
    );
  }

  const rankStyles = [
    'bg-amber-500/20 text-amber-400 border-amber-500/30',
    'bg-slate-400/20 text-slate-300 border-slate-400/30',
    'bg-orange-700/20 text-orange-400 border-orange-700/30',
    'bg-white/[0.06] text-muted border-white/[0.08]',
    'bg-white/[0.06] text-muted border-white/[0.08]',
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Songs */}
      <div className="glass-card p-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-electric-500/20 flex items-center justify-center">
            <Music2 className="w-4 h-4 text-electric-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold">Top Songs</h3>
            <p className="text-[10px] text-muted-2">Most played tracks in this room</p>
          </div>
        </div>
        {topSongs.length === 0 ? (
          <p className="text-xs text-muted text-center py-6">No song plays recorded yet.</p>
        ) : (
          <div className="space-y-1.5">
            {topSongs.map((song, idx) => (
              <div key={song.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/[0.03] transition-colors">
                <span className={cn('w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold border shrink-0', rankStyles[idx] || rankStyles[3])}>
                  {idx + 1}
                </span>
                <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-ink-800">
                  {song.cover_url ? (
                    <img src={song.cover_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Music2 className="w-4 h-4 text-muted" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{song.title}</p>
                  <p className="text-xs text-muted truncate">{song.profiles?.display_name || 'Unknown'}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Play className="w-3 h-3 text-muted-2" fill="currentColor" />
                  <span className="text-xs font-semibold tabular-nums">{song.play_count}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Top Listeners */}
      <div className="glass-card p-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
            <Headphones className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold">Top Listeners</h3>
            <p className="text-[10px] text-muted-2">Most active members in this room</p>
          </div>
        </div>
        {topListeners.length === 0 ? (
          <p className="text-xs text-muted text-center py-6">No listener data yet.</p>
        ) : (
          <div className="space-y-1.5">
            {topListeners.map((listener, idx) => (
              <div key={listener.user_id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/[0.03] transition-colors">
                <span className={cn('w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold border shrink-0', rankStyles[idx] || rankStyles[3])}>
                  {idx + 1}
                </span>
                {listener.profiles?.avatar_url ? (
                  <img src={listener.profiles.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
                ) : (
                  <div className={cn('w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0', avatarColor(listener.user_id))}>
                    {initials(listener.profiles?.display_name || '?')}
                  </div>
                )}
                <span className="text-sm font-semibold truncate flex-1">{listener.profiles?.display_name || 'Unknown'}</span>
                <div className="flex items-center gap-1 shrink-0">
                  <Headphones className="w-3 h-3 text-muted-2" />
                  <span className="text-xs font-semibold tabular-nums">{listener.play_count}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ChatTab({ roomId, tracks }: { roomId: string; tracks: Track[] }) {
  const { user } = useAuth();
  const toast = useToast();
  const player = usePlayer();
  const { hasFeature } = usePremium();
  const canAttachMedia = hasFeature('chat_attachments');
  const [messages, setMessages] = useState<RoomMessage[]>([]);
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState<RoomMessage | null>(null);
  const [shareTrackId, setShareTrackId] = useState<string>('');
  const [showSharePicker, setShowSharePicker] = useState(false);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [showMediaMenu, setShowMediaMenu] = useState(false);
  const [pendingMedia, setPendingMedia] = useState<{ url: string; type: string } | null>(null);
  const [pendingGif, setPendingGif] = useState<string | null>(null);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [gifSearchQuery, setGifSearchQuery] = useState('');
  const [gifResults, setGifResults] = useState<string[]>([]);
  const [mediaViewer, setMediaViewer] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const currentTrackId = player.currentTrack?.id;

  const loadMessages = useCallback(async () => {
    const { data } = await supabase
      .from('room_messages')
      .select('*, profiles!room_messages_user_id_fkey(*), shared_track:tracks!room_messages_shared_track_id_fkey(*)')
      .eq('room_id', roomId)
      .order('created_at', { ascending: true })
      .limit(100);
    setMessages((data || []) as unknown as RoomMessage[]);
  }, [roomId]);

  useEffect(() => {
    loadMessages();
    const channel = supabase.channel(`chat-${roomId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'room_messages', filter: `room_id=eq.${roomId}` }, () => loadMessages())
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'room_messages', filter: `room_id=eq.${roomId}` }, () => loadMessages())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [roomId, loadMessages]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  async function uploadMedia(file: File, type: 'image' | 'video') {
    if (!file.type.startsWith(type === 'image' ? 'image/' : 'video/')) {
      toast.error(`Please select a ${type} file`);
      return;
    }
    const ext = file.name.split('.').pop();
    const fileName = `${roomId}/${user?.id || 'anon'}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('vinyl-chat').upload(fileName, file, { contentType: file.type });
    if (error) {
      toast.error(error.message);
      return;
    }
    const { data: urlData } = supabase.storage.from('vinyl-chat').getPublicUrl(fileName);
    setPendingMedia({ url: urlData.publicUrl, type });
  }

  async function searchGifs(query: string) {
    setGifSearchQuery(query);
    if (!query.trim()) return;
    try {
      const res = await fetch(`https://media.giphy.com/v1/gifs/search?api_key=dc6zaTOxFJmzC&q=${encodeURIComponent(query)}&limit=12`);
      const json = await res.json();
      setGifResults((json.data || []).map((g: any) => g.images.fixed_height_small.url));
    } catch {
      setGifResults([]);
    }
  }

  async function sendMessage() {
    if ((!text.trim() && !shareTrackId && !pendingMedia && !pendingGif) || !user) return;
    const payload: Record<string, unknown> = {
      room_id: roomId,
      user_id: user.id,
      text: text.trim(),
      shared_track_id: shareTrackId || null,
      reply_to: replyTo?.id || null,
    };
    if (pendingMedia) {
      payload.media_url = pendingMedia.url;
      payload.media_type = pendingMedia.type;
    }
    if (pendingGif) {
      payload.gif_url = pendingGif;
      payload.media_type = 'gif';
    }
    const { error } = await supabase.from('room_messages').insert(payload);
    if (error) {
      toast.error('Failed to send message: ' + error.message);
      return;
    }
    setText('');
    setReplyTo(null);
    setShareTrackId('');
    setShowSharePicker(false);
    setPendingMedia(null);
    setPendingGif(null);
  }

  async function deleteMessage(id: string) {
    const { error } = await supabase.from('room_messages').delete().eq('id', id);
    if (error) toast.error('Failed to delete message');
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setText(val);
    const lastAt = val.lastIndexOf('@');
    if (lastAt !== -1) {
      const afterAt = val.slice(lastAt + 1);
      if (!afterAt.includes(' ') && afterAt.length < 30) {
        setMentionQuery(afterAt.toLowerCase());
        return;
      }
    }
    setMentionQuery(null);
  }

  function selectMentionTrack(track: Track) {
    const lastAt = text.lastIndexOf('@');
    const newText = text.slice(0, lastAt) + track.title + ' ';
    setText(newText);
    setShareTrackId(track.id);
    setMentionQuery(null);
  }

  const mentionTracks = mentionQuery !== null
    ? tracks.filter(t => t.title.toLowerCase().includes(mentionQuery) || t.profiles?.display_name?.toLowerCase().includes(mentionQuery))
    : [];

  return (
    <div className="flex flex-col h-[500px]">
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-2 p-2">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-muted">No messages yet. Say hello!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isOwn = msg.user_id === user?.id;
            return (
              <div key={msg.id} className={cn('flex gap-2 group', isOwn && 'flex-row-reverse')}>
                {msg.profiles?.avatar_url ? (
                  <img src={msg.profiles.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover shrink-0" />
                ) : (
                  <div className={cn('w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0', avatarColor(msg.user_id))}>
                    {initials(msg.profiles?.display_name || '?')}
                  </div>
                )}
                <div className={cn('max-w-[75%] min-w-0', isOwn && 'text-right')}>
                  {!isOwn && <p className="text-[10px] text-muted-2 mb-0.5">{msg.profiles?.display_name || 'Unknown'}</p>}
                  {msg.reply_to && (
                    <p className="text-[10px] text-muted-2 mb-0.5 pl-2 border-l border-white/[0.1]">Replying to a message</p>
                  )}
                  <div className={cn('inline-block px-3 py-2 rounded-2xl text-sm break-words', isOwn ? 'bg-electric-500 text-white' : 'bg-ink-800 text-ink-100')}>
                    {msg.text && <p>{msg.text}</p>}
                    {msg.gif_url && (
                      <button onClick={() => setMediaViewer(msg.gif_url)} className="block mt-1">
                        <img src={msg.gif_url} alt="GIF" className="rounded-lg max-h-32 max-w-full" />
                      </button>
                    )}
                    {msg.media_url && msg.media_type === 'image' && (
                      <button onClick={() => setMediaViewer(msg.media_url!)} className="block mt-1">
                        <img src={msg.media_url} alt="Image" className="rounded-lg max-h-48 max-w-full" />
                      </button>
                    )}
                    {msg.media_url && msg.media_type === 'video' && (
                      <video src={msg.media_url} controls className="rounded-lg max-h-48 max-w-full mt-1" />
                    )}
                    {msg.shared_track && (
                      <button
                        onClick={() => {
                          const idx = tracks.findIndex((t) => t.id === msg.shared_track_id);
                          if (idx >= 0) player.playTrack(tracks[idx], tracks);
                        }}
                        className="flex items-center gap-2 mt-1 p-1.5 rounded-lg bg-black/20 hover:bg-black/30 transition-colors w-full text-left"
                      >
                        <div className={cn('w-8 h-8 rounded flex items-center justify-center shrink-0', msg.shared_track_id === currentTrackId ? 'bg-electric-500' : 'bg-white/10')}>
                          {msg.shared_track_id === currentTrackId && player.isPlaying
                            ? <EqualizerBars className="text-white" />
                            : <Music2 className="w-4 h-4" />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold truncate">{msg.shared_track.title}</p>
                          <p className="text-[10px] opacity-70 truncate">{msg.shared_track.profiles?.display_name || 'Unknown'}</p>
                        </div>
                      </button>
                    )}
                  </div>
                  <div className={cn('flex items-center gap-1.5 mt-0.5', isOwn && 'justify-end')}>
                    <span className="text-[9px] text-muted-2">{timeAgo(msg.created_at)}</span>
                    <button onClick={() => setReplyTo(msg)} className="text-[9px] text-muted-2 hover:text-electric-400 transition-colors opacity-0 group-hover:opacity-100">Reply</button>
                    {isOwn && (
                      <button onClick={() => deleteMessage(msg.id)} className="text-[9px] text-muted-2 hover:text-magenta-400 transition-colors opacity-0 group-hover:opacity-100">Delete</button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Reply preview */}
      {replyTo && (
        <div className="px-3 py-1.5 bg-ink-800 rounded-lg flex items-center justify-between text-xs mb-2">
          <span className="text-muted truncate">Replying to: {replyTo.text || 'Shared track'}</span>
          <button onClick={() => setReplyTo(null)} className="text-muted hover:text-white"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {/* Pending media preview */}
      {pendingMedia && (
        <div className="px-3 py-1.5 bg-ink-800 rounded-lg flex items-center justify-between text-xs mb-2">
          <span className="text-muted truncate">{pendingMedia.type === 'image' ? 'Image' : 'Video'} attached</span>
          <button onClick={() => setPendingMedia(null)} className="text-muted hover:text-white"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}
      {pendingGif && (
        <div className="px-3 py-1.5 bg-ink-800 rounded-lg flex items-center justify-between text-xs mb-2">
          <img src={pendingGif} alt="" className="h-8 rounded" />
          <button onClick={() => setPendingGif(null)} className="text-muted hover:text-white"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {/* GIF picker */}
      {showGifPicker && (
        <div className="glass-card p-3 mb-2 max-h-48 overflow-y-auto">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-muted">Search GIFs</span>
            <button onClick={() => { setShowGifPicker(false); setGifResults([]); setGifSearchQuery(''); }} className="text-muted hover:text-white"><X className="w-3.5 h-3.5" /></button>
          </div>
          <div className="relative mb-2">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted" />
            <input
              value={gifSearchQuery}
              onChange={(e) => searchGifs(e.target.value)}
              placeholder="Search GIFs..."
              className="input-sm !pl-8 w-full"
              autoFocus
            />
          </div>
          {gifResults.length > 0 && (
            <div className="grid grid-cols-3 gap-1.5">
              {gifResults.map((url) => (
                <button
                  key={url}
                  onClick={() => { setPendingGif(url); setShowGifPicker(false); setGifResults([]); setGifSearchQuery(''); }}
                  className="rounded-lg overflow-hidden hover:scale-105 transition-transform"
                >
                  <img src={url} alt="" className="w-full h-20 object-cover" loading="lazy" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Share track picker */}
      {showSharePicker && (
        <div className="px-2 mb-2 max-h-32 overflow-y-auto glass-card p-2 space-y-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-muted">Share a track</span>
            <button onClick={() => setShowSharePicker(false)} className="text-muted hover:text-white"><X className="w-3.5 h-3.5" /></button>
          </div>
          {tracks.map((t) => (
            <button
              key={t.id}
              onClick={() => { setShareTrackId(t.id); setShowSharePicker(false); }}
              className={cn('w-full flex items-center gap-2 p-1.5 rounded-lg hover:bg-white/[0.04] text-left transition-colors', shareTrackId === t.id && 'bg-electric-500/10')}
            >
              <Music2 className="w-3.5 h-3.5 text-electric-400" />
              <span className="text-xs truncate flex-1">{t.title}</span>
            </button>
          ))}
        </div>
      )}

      {/* @mention dropdown */}
      {mentionQuery !== null && mentionTracks.length > 0 && (
        <div className="glass-card p-2 mb-2 max-h-40 overflow-y-auto">
          <p className="text-[10px] text-muted-2 mb-1">Mention a track</p>
          {tracks.find(t => t.id === currentTrackId) && mentionTracks.find(t => t.id === currentTrackId) && (
            <button
              onClick={() => selectMentionTrack(tracks.find(t => t.id === currentTrackId)!)}
              className="w-full flex items-center gap-2 p-1.5 rounded-lg bg-electric-500/10 hover:bg-electric-500/20 text-left transition-colors"
            >
              <Radio className="w-3.5 h-3.5 text-electric-400 animate-pulse" />
              <span className="text-xs truncate flex-1">{tracks.find(t => t.id === currentTrackId)!.title}</span>
              <span className="text-[9px] text-electric-400 font-semibold">Now Playing</span>
            </button>
          )}
          {mentionTracks.filter(t => t.id !== currentTrackId).map((t) => (
            <button
              key={t.id}
              onClick={() => selectMentionTrack(t)}
              className="w-full flex items-center gap-2 p-1.5 rounded-lg hover:bg-white/[0.04] text-left transition-colors"
            >
              <Music2 className="w-3.5 h-3.5 text-muted" />
              <span className="text-xs truncate flex-1">{t.title}</span>
              <span className="text-[9px] text-muted-2">{t.profiles?.display_name || ''}</span>
            </button>
          ))}
        </div>
      )}

      {/* Media menu */}
      {showMediaMenu && canAttachMedia && (
        <div className="glass-card p-2 mb-2 flex gap-2">
          <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-white/[0.04] cursor-pointer text-xs transition-colors">
            <ImageIcon className="w-4 h-4 text-electric-400" />
            <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadMedia(f, 'image'); setShowMediaMenu(false); }} />
            Image
          </label>
          <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-white/[0.04] cursor-pointer text-xs transition-colors">
            <Film className="w-4 h-4 text-electric-400" />
            <input type="file" accept="video/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadMedia(f, 'video'); setShowMediaMenu(false); }} />
            Video
          </label>
          <button onClick={() => { setShowGifPicker(true); setShowMediaMenu(false); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-white/[0.04] text-xs transition-colors">
            <Search className="w-4 h-4 text-electric-400" /> GIF
          </button>
          <button onClick={() => setShowMediaMenu(false)} className="ml-auto text-muted hover:text-white"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {/* Input */}
      <div className="flex gap-2 pt-2 border-t border-white/[0.04]">
        {canAttachMedia ? (
          <button
            onClick={() => { setShowMediaMenu(!showMediaMenu); setShowSharePicker(false); }}
            className={cn('btn-icon-sm shrink-0', showMediaMenu && 'bg-electric-500 text-white')}
            title="Attach media"
          >
            <Plus className="w-4 h-4" />
          </button>
        ) : (
          <button onClick={() => toast.info('Attachments are a premium feature. Upgrade to send images, videos, and GIFs.')} className="btn-icon-sm shrink-0 text-muted-2" title="Attachments are a premium feature">
            <Crown className="w-4 h-4" />
          </button>
        )}
        <button
          onClick={() => { setShowSharePicker(!showSharePicker); setShowMediaMenu(false); }}
          className={cn('btn-icon-sm shrink-0', showSharePicker && 'bg-electric-500 text-white')}
          title="Share track"
        >
          <Music2 className="w-4 h-4" />
        </button>
        <input
          value={text}
          onChange={handleInputChange}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          placeholder={shareTrackId || pendingMedia || pendingGif ? 'Add a message (optional)...' : 'Type a message... (use @ to mention a track)'}
          className="input-sm flex-1"
        />
        <button onClick={sendMessage} disabled={!text.trim() && !shareTrackId && !pendingMedia && !pendingGif} className="btn-primary !px-3 shrink-0">
          <Send className="w-4 h-4" />
        </button>
      </div>

      {/* Media viewer modal */}
      {mediaViewer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4" onClick={() => setMediaViewer(null)}>
          <button className="absolute top-4 right-4 btn-icon bg-ink-950/70"><X className="w-5 h-5" /></button>
          <img src={mediaViewer} alt="" className="max-w-full max-h-full rounded-xl object-contain" />
        </div>
      )}
    </div>
  );
}

function MembersTab({ members, isAdmin, isOwner, onRefresh }: { members: RoomMember[]; isAdmin: boolean; isOwner: boolean; onRefresh: () => void }) {
  const toast = useToast();
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const pendingMembers = members.filter((m) => m.status === 'pending');
  const activeMembers = members.filter((m) => m.status !== 'pending');

  async function updateRole(memberId: string, role: string) {
    const { error } = await supabase.from('room_members').update({ role }).eq('id', memberId);
    if (error) { toast.error('Failed to update role'); return; }
    toast.success('Role updated');
    onRefresh();
  }

  async function removeMember(memberId: string) {
    const { error } = await supabase.from('room_members').delete().eq('id', memberId);
    if (error) { toast.error('Failed to remove member'); return; }
    toast.success('Member removed');
    onRefresh();
  }

  async function approveMember(memberId: string) {
    setActionLoading(memberId);
    const { data, error } = await supabase.rpc('approve_join_request', { p_member_id: memberId });
    setActionLoading(null);
    if (error) { toast.error(error.message); return; }
    const result = (data as { success: boolean; message: string }) || { success: false, message: 'Unknown error' };
    if (result.success) toast.success('Member approved');
    else toast.error(result.message);
    onRefresh();
  }

  async function rejectMember(memberId: string) {
    setActionLoading(memberId);
    const { data, error } = await supabase.rpc('reject_join_request', { p_member_id: memberId });
    setActionLoading(null);
    if (error) { toast.error(error.message); return; }
    const result = (data as { success: boolean; message: string }) || { success: false, message: 'Unknown error' };
    if (result.success) toast.success('Request rejected');
    else toast.error(result.message);
    onRefresh();
  }

  return (
    <div className="space-y-4">
      {isAdmin && pendingMembers.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-2 flex items-center gap-2 text-amber-400">
            <Clock className="w-4 h-4" /> Join Requests ({pendingMembers.length})
          </h3>
          <div className="space-y-2">
            {pendingMembers.map((m) => (
              <div key={m.id} className="glass-card p-3 flex items-center gap-3 border border-amber-500/20 bg-amber-500/[0.03]">
                {m.profiles?.avatar_url ? (
                  <img src={m.profiles.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover" />
                ) : (
                  <div className={cn('w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white', avatarColor(m.user_id))}>
                    {initials(m.profiles?.display_name || '?')}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-semibold truncate block">{m.profiles?.display_name || 'Unknown'}</span>
                  <span className="text-xs text-muted-2">Requested {timeAgo(m.created_at)}</span>
                </div>
                {actionLoading === m.id ? (
                  <Loader2 className="w-4 h-4 animate-spin text-muted" />
                ) : (
                  <div className="flex gap-1">
                    <button onClick={() => approveMember(m.id)} className="btn-icon-sm text-emerald-400 hover:bg-emerald-500/10" title="Approve">
                      <UserCheck className="w-4 h-4" />
                    </button>
                    <button onClick={() => rejectMember(m.id)} className="btn-icon-sm text-magenta-400 hover:bg-magenta-500/10" title="Reject">
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        {isAdmin && pendingMembers.length > 0 && (
          <h3 className="text-sm font-semibold mb-2">Members ({activeMembers.length})</h3>
        )}
        <div className="space-y-2">
          {activeMembers.map((m) => (
            <div key={m.id} className="glass-card p-3 flex items-center gap-3">
              {m.profiles?.avatar_url ? (
                <img src={m.profiles.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover" />
              ) : (
                <div className={cn('w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white', avatarColor(m.user_id))}>
                  {initials(m.profiles?.display_name || '?')}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold truncate">{m.profiles?.display_name || 'Unknown'}</span>
                  {m.role === 'owner' && <Crown className="w-3.5 h-3.5 text-amber-400" />}
                  {m.role === 'admin' && <Shield className="w-3.5 h-3.5 text-electric-400" />}
                </div>
                <span className="text-xs text-muted-2 capitalize">{m.role} · joined {timeAgo(m.created_at)}</span>
              </div>
              <span className={cn('badge capitalize', m.status === 'active' ? 'badge-green' : 'badge-red')}>
                {m.status}
              </span>
              {isAdmin && m.role !== 'owner' && (
                <div className="flex gap-1">
                  <select
                    value={m.role}
                    onChange={(e) => updateRole(m.id, e.target.value)}
                    className="bg-ink-800 text-xs rounded-lg px-2 py-1 border border-white/[0.06] focus:outline-none focus:border-electric-500/50"
                  >
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                  </select>
                  <button onClick={() => removeMember(m.id)} className="p-1.5 rounded-lg text-muted hover:text-magenta-400 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

interface DraftTrack {
  file: File;
  title: string;
  duration: number;
  coverUrl: string | null;
  status: 'pending' | 'uploading' | 'done' | 'error';
}

async function extractTrackMetadata(file: File): Promise<{ title: string; duration: number }> {
  const title = file.name.replace(/\.[^/.]+$/, '');
  let duration = 0;
  if (file.type.startsWith('audio/') || file.type.startsWith('video/')) {
    try {
      const audio = new Audio();
      audio.src = URL.createObjectURL(file);
      await new Promise<void>((resolve) => {
        audio.addEventListener('loadedmetadata', () => {
          duration = Math.floor(audio.duration);
          resolve();
        });
        setTimeout(resolve, 3000);
      });
      URL.revokeObjectURL(audio.src);
    } catch {}
  }
  return { title, duration };
}

function UploadModal({ roomId, onClose, onUploaded }: { roomId: string; onClose: () => void; onUploaded: () => void }) {
  const { user } = useAuth();
  const toast = useToast();
  const [drafts, setDrafts] = useState<DraftTrack[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const newDrafts: DraftTrack[] = [];
    for (const file of Array.from(files)) {
      const { title, duration } = await extractTrackMetadata(file);
      newDrafts.push({ file, title, duration, coverUrl: null, status: 'pending' });
    }
    setDrafts(prev => [...prev, ...newDrafts]);
  }

  function updateTitle(idx: number, title: string) {
    setDrafts(prev => prev.map((d, i) => i === idx ? { ...d, title } : d));
  }

  function removeDraft(idx: number) {
    setDrafts(prev => prev.filter((_, i) => i !== idx));
  }

  async function handleCoverSelect(idx: number, file: File) {
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    const ext = file.name.split('.').pop();
    const fileName = `${roomId}/${user?.id || 'anon'}/covers/${Date.now()}_${idx}.${ext}`;
    const { error } = await supabase.storage.from('vinyl-covers').upload(fileName, file, { contentType: file.type });
    if (error) {
      toast.error('Failed to upload cover image');
      return;
    }
    const { data } = supabase.storage.from('vinyl-covers').getPublicUrl(fileName);
    setDrafts(prev => prev.map((d, i) => i === idx ? { ...d, coverUrl: data.publicUrl } : d));
  }

  async function uploadAll() {
    if (!user || drafts.length === 0) return;
    setUploading(true);
    setProgress({ done: 0, total: drafts.length });

    let done = 0;
    for (let i = 0; i < drafts.length; i++) {
      const draft = drafts[i];
      setDrafts(prev => prev.map((d, idx) => idx === i ? { ...d, status: 'uploading' } : d));

      const ext = draft.file.name.split('.').pop();
      const fileName = `${roomId}/${user.id}/${Date.now()}_${i}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from('vinyl-audio').upload(fileName, draft.file);

      if (uploadErr) {
        setDrafts(prev => prev.map((d, idx) => idx === i ? { ...d, status: 'error' } : d));
        done++;
        setProgress({ done, total: drafts.length });
        continue;
      }

      const { error: insertErr } = await supabase.from('tracks').insert({
        room_id: roomId,
        uploaded_by: user.id,
        title: draft.title.trim(),
        file_path: fileName,
        duration_seconds: draft.duration,
        cover_url: draft.coverUrl,
      });

      if (insertErr) {
        setDrafts(prev => prev.map((d, idx) => idx === i ? { ...d, status: 'error' } : d));
      } else {
        setDrafts(prev => prev.map((d, idx) => idx === i ? { ...d, status: 'done' } : d));
      }
      done++;
      setProgress({ done, total: drafts.length });
    }

    setUploading(false);
    const successCount = drafts.filter(d => d.status === 'done').length;
    if (successCount > 0) toast.success(`${successCount} track${successCount !== 1 ? 's' : ''} uploaded!`);
    onUploaded();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="glass-card w-full max-w-lg p-6 animate-scale-in max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold flex items-center gap-2"><Upload className="w-5 h-5 text-electric-400" /> Upload Tracks</h2>
          <button onClick={onClose} className="btn-icon-sm"><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-4">
          {drafts.length === 0 ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-white/[0.1] rounded-xl p-8 text-center cursor-pointer hover:border-electric-500/40 hover:bg-white/[0.02] transition-all"
            >
              <Upload className="w-10 h-10 text-muted mx-auto mb-3" />
              <p className="text-sm font-semibold text-ink-100">Click to select audio or video files</p>
              <p className="text-xs text-muted mt-1">Select multiple files at once. Titles and duration are extracted automatically.</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*,video/*"
                multiple
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
              />
            </div>
          ) : (
            <>
              <div className="space-y-2">
                {drafts.map((draft, idx) => (
                  <div key={idx} className="glass-card p-3 bg-ink-800/50">
                    <div className="flex items-center gap-3">
                      <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-ink-800 shrink-0 group/cover">
                        {draft.coverUrl ? (
                          <img src={draft.coverUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Music2 className="w-5 h-5 text-muted" />
                          </div>
                        )}
                        <label className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover/cover:opacity-100 cursor-pointer transition-opacity">
                          <ImagePlus className="w-4 h-4 text-white" />
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleCoverSelect(idx, f); e.target.value = ''; }}
                          />
                        </label>
                      </div>
                      <input
                        value={draft.title}
                        onChange={(e) => updateTitle(idx, e.target.value)}
                        className="input-field !py-2 flex-1"
                        placeholder="Track title"
                        disabled={draft.status === 'done'}
                      />
                      <span className="text-xs text-muted-2 tabular-nums shrink-0">{formatTime(draft.duration)}</span>
                      {draft.status === 'done' ? (
                        <Check className="w-5 h-5 text-emerald-400 shrink-0" />
                      ) : draft.status === 'uploading' ? (
                        <Loader2 className="w-5 h-5 text-electric-400 animate-spin shrink-0" />
                      ) : draft.status === 'error' ? (
                        <X className="w-5 h-5 text-magenta-400 shrink-0" />
                      ) : (
                        <button onClick={() => removeDraft(idx)} className="p-1 rounded text-muted hover:text-magenta-400 transition-colors shrink-0">
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {!uploading && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="btn-ghost flex items-center gap-1.5 text-xs"
                >
                  <Plus className="w-3.5 h-3.5" /> Add more files
                </button>
              )}

              {uploading && (
                <div className="space-y-1.5">
                  <div className="h-1.5 bg-ink-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-electric-500 rounded-full transition-all duration-300"
                      style={{ width: `${progress.total > 0 ? (progress.done / progress.total) * 100 : 0}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted text-center">Uploading {progress.done} of {progress.total}...</p>
                </div>
              )}

              <div className="flex gap-2">
                <button onClick={onClose} className="btn-ghost flex-1">Cancel</button>
                <button
                  onClick={uploadAll}
                  disabled={uploading || drafts.length === 0 || drafts.every(d => !d.title.trim())}
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  {uploading ? <><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</> : `Upload ${drafts.length} Track${drafts.length !== 1 ? 's' : ''}`}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
