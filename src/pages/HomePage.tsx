import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { usePremium } from '@/context/PremiumContext';
import { useToast } from '@/context/ToastContext';
import { navigate, useRoute } from '@/hooks/useRoute';
import type { Room, RoomMember } from '@/types';
import { CardSkeleton } from '@/components/ui/Skeletons';
import { Plus, Search, Users, Music, Lock, Globe, Compass, TrendingUp, Clock, UserPlus, Loader2, KeyRound, Eye } from 'lucide-react';
import { timeAgo } from '@/lib/utils';

export default function HomePage() {
  const { user } = useAuth();
  const { isPremium, settings } = usePremium();
  const toast = useToast();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [myRooms, setMyRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [showInviteRedeem, setShowInviteRedeem] = useState(false);
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const route = useRoute();

  const discoveryEnabled = settings?.discovery_enabled ?? true;

  useEffect(() => {
    if (route.params.invite && !inviteToken) {
      setInviteToken(route.params.invite);
      setShowInviteRedeem(true);
    }
  }, [route.params.invite, inviteToken]);

  const loadRooms = useCallback(async () => {
    setLoading(true);
    const { data: pub } = await supabase
      .from('rooms')
      .select('*')
      .eq('visibility', 'public')
      .order('created_at', { ascending: false })
      .limit(24);
    setRooms((pub as Room[]) || []);

    if (user) {
      const { data: owned } = await supabase
        .from('rooms')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });
      const { data: memberRooms } = await supabase
        .from('room_members')
        .select('room:rooms(*)')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false });
      const combined = [
        ...((owned as Room[]) || []),
        ...((memberRooms || []).map((m: { room: Room }) => m.room).filter(Boolean)),
      ];
      const seen = new Set<string>();
      setMyRooms(combined.filter((r) => r && !seen.has(r.id) && seen.add(r.id)));
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { loadRooms(); }, [loadRooms]);

  const filtered = rooms.filter((r) =>
    discoveryEnabled &&
    (r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.description?.toLowerCase().includes(search.toLowerCase()))
  );

  const maxRooms = isPremium ? (settings?.max_rooms_premium || 20) : (settings?.max_rooms_free || 3);
  const canCreate = myRooms.filter((r) => r.owner_id === user?.id).length < maxRooms;

  const handleCreate = async (data: { name: string; description: string; visibility: string; join_policy: string; theme_color: string; passphrase: string; discoverable: boolean }) => {
    if (!user) return;
    const { data: room, error } = await supabase
      .rpc('create_room', {
        p_name: data.name,
        p_description: data.description,
        p_visibility: data.visibility,
        p_join_policy: data.join_policy,
        p_theme_color: data.theme_color,
        p_passphrase: data.passphrase || null,
        p_discoverable: data.discoverable && data.visibility === 'public',
      });
    if (error) {
      if (error.message.includes('Room limit reached')) {
        toast.error(`You've reached the room limit. Upgrade to premium for more.`);
      } else {
        toast.error(error.message);
      }
      return;
    }
    const roomId = (room as { id: string } | null)?.id;
    toast.success('Room created!');
    setShowCreate(false);
    if (roomId) navigate(`/room?roomId=${roomId}`);
  };

  const handleJoin = async (roomId: string, passphrase?: string) => {
    if (!user) return;
    setJoiningId(roomId);
    const { data, error } = await supabase.rpc('join_room', {
      p_room_id: roomId,
      p_passphrase: passphrase || null,
    });
    setJoiningId(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    const result = (data as { status: string; message: string }) || { status: 'error', message: 'Unknown error' };
    if (result.status === 'active') {
      toast.success(result.message);
      navigate(`/room?roomId=${roomId}`);
    } else if (result.status === 'pending') {
      toast.success(result.message);
      loadRooms();
    } else {
      toast.error(result.message);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold mb-1">Discover Rooms</h1>
        <p className="text-muted text-sm">Find collaborative music spaces to join</p>
      </div>

      {myRooms.length > 0 && (
        <section className="mb-10">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-electric-400" /> Your Rooms
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {myRooms.map((room) => (
              <RoomCard key={room.id} room={room} onClick={() => navigate(`/room?roomId=${room.id}`)} compact />
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-magenta-400" /> Public Rooms
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowInviteRedeem(true)}
              className="btn-secondary flex items-center gap-1.5 text-sm"
            >
              <KeyRound className="w-4 h-4" /> Have an invite code?
            </button>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
              <input
                type="text"
                placeholder="Search rooms..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input-sm pl-9 w-40 sm:w-56"
              />
            </div>
          </div>
        </div>

        {!discoveryEnabled && (
          <div className="glass-card p-12 text-center">
            <Eye className="w-12 h-12 text-muted mx-auto mb-3" />
            <p className="text-muted">Room discovery is currently disabled. Use an invite code to join a room.</p>
          </div>
        )}

        {discoveryEnabled && loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => <CardSkeleton key={i} />)}
          </div>
        ) : discoveryEnabled && filtered.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <Compass className="w-12 h-12 text-muted mx-auto mb-3" />
            <p className="text-muted">No rooms found. {search ? 'Try a different search.' : 'Be the first to create one!'}</p>
          </div>
        ) : discoveryEnabled ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {filtered.map((room) => (
              <RoomCardWithJoin
                key={room.id}
                room={room}
                isMember={myRooms.some((r) => r.id === room.id)}
                joining={joiningId === room.id}
                onJoin={(passphrase) => handleJoin(room.id, passphrase)}
                onClick={() => navigate(`/room?roomId=${room.id}`)}
              />
            ))}
          </div>
        ) : null}
      </section>

      <button
        onClick={() => canCreate ? setShowCreate(true) : toast.error(`You've reached the ${maxRooms} room limit. Upgrade to premium for more.`)}
        className="fixed bottom-24 md:bottom-6 right-4 md:right-6 z-50 w-14 h-14 rounded-2xl bg-gradient-to-br from-electric-500 to-electric-600 text-white flex items-center justify-center shadow-xl shadow-electric-500/30 hover:scale-105 active:scale-95 transition-transform"
        aria-label="Create room"
      >
        <Plus className="w-6 h-6" />
      </button>

      {showCreate && <CreateRoomModal onClose={() => setShowCreate(false)} onCreate={handleCreate} />}
      {showInviteRedeem && <InviteRedeemModal onClose={() => { setShowInviteRedeem(false); setInviteToken(null); }} onRedeemed={(roomId) => { setShowInviteRedeem(false); setInviteToken(null); navigate(`/room?roomId=${roomId}`); }} initialToken={inviteToken} />}
    </div>
  );
}

function RoomCardWithJoin({ room, isMember, joining, onJoin, onClick }: {
  room: Room;
  isMember: boolean;
  joining: boolean;
  onJoin: (passphrase?: string) => void;
  onClick: () => void;
}) {
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [passphrase, setPassphrase] = useState('');
  const needsPassphrase = room.visibility === 'private' && room.passphrase !== null;

  if (isMember) {
    return <RoomCard room={room} onClick={onClick} />;
  }

  return (
    <div className="surface text-left group animate-fade-in overflow-hidden flex flex-col">
      <button onClick={onClick} className="text-left group flex-1">
        <div className="relative aspect-square overflow-hidden">
          {room.cover_url ? (
            <img src={room.cover_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          ) : (
            <div className="w-full h-full flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${room.theme_color}40, ${room.theme_color}10)` }}>
              <Music className="w-10 h-10" style={{ color: room.theme_color }} />
            </div>
          )}
          <div className="absolute top-2 left-2 flex gap-1.5">
            {room.visibility === 'private' ? (
              <span className="badge bg-ink-950/70 text-ink-200 backdrop-blur-sm"><Lock className="w-3 h-3" /> Private</span>
            ) : (
              <span className="badge bg-ink-950/70 text-ink-200 backdrop-blur-sm"><Globe className="w-3 h-3" /> Public</span>
            )}
            {room.join_policy === 'request' && (
              <span className="badge bg-ink-950/70 text-amber-300 backdrop-blur-sm">Request</span>
            )}
          </div>
        </div>
      </button>
      <div className="p-3 flex-1 flex flex-col">
        <button onClick={onClick} className="text-left flex-1">
          <h3 className="font-semibold text-sm truncate mb-1">{room.name}</h3>
          <p className="text-xs text-muted line-clamp-2 mb-2">{room.description || 'No description'}</p>
        </button>
        {showPassphrase && needsPassphrase ? (
          <div className="space-y-2 mt-2">
            <input
              type="text"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              placeholder="Enter passphrase"
              className="input-sm w-full"
            />
            <button
              onClick={() => onJoin(passphrase)}
              disabled={joining || !passphrase.trim()}
              className="btn-primary w-full text-xs flex items-center justify-center gap-1.5"
            >
              {joining ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserPlus className="w-3 h-3" />}
              {joining ? 'Joining...' : 'Join with passphrase'}
            </button>
          </div>
        ) : (
          <button
            onClick={() => needsPassphrase ? setShowPassphrase(true) : onJoin()}
            disabled={joining}
            className="btn-secondary w-full text-xs flex items-center justify-center gap-1.5 mt-2"
          >
            {joining ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserPlus className="w-3 h-3" />}
            {joining ? 'Joining...' : room.join_policy === 'request' ? 'Request to join' : 'Join Room'}
          </button>
        )}
        <div className="flex items-center gap-3 text-xs text-muted-2 mt-2">
          <span className="flex items-center gap-1"><Users className="w-3 h-3" /> Members</span>
          <span>{timeAgo(room.created_at)}</span>
        </div>
      </div>
    </div>
  );
}

function RoomCard({ room, onClick, compact }: { room: Room; onClick: () => void; compact?: boolean }) {
  return (
    <button onClick={onClick} className="surface-hover text-left group animate-fade-in overflow-hidden">
      <div className="relative aspect-square overflow-hidden">
        {room.cover_url ? (
          <img src={room.cover_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${room.theme_color}40, ${room.theme_color}10)` }}>
            <Music className="w-10 h-10" style={{ color: room.theme_color }} />
          </div>
        )}
        <div className="absolute top-2 left-2 flex gap-1.5">
          {room.visibility === 'private' ? (
            <span className="badge bg-ink-950/70 text-ink-200 backdrop-blur-sm"><Lock className="w-3 h-3" /> Private</span>
          ) : (
            <span className="badge bg-ink-950/70 text-ink-200 backdrop-blur-sm"><Globe className="w-3 h-3" /> Public</span>
          )}
        </div>
      </div>
      <div className="p-3">
        <h3 className="font-semibold text-sm truncate mb-1">{room.name}</h3>
        {!compact && <p className="text-xs text-muted line-clamp-2 mb-2">{room.description || 'No description'}</p>}
        <div className="flex items-center gap-3 text-xs text-muted-2">
          <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {compact ? '' : 'Room'}</span>
          <span>{timeAgo(room.created_at)}</span>
        </div>
      </div>
    </button>
  );
}

interface CreateRoomData {
  name: string; description: string; visibility: string; join_policy: string; theme_color: string; passphrase: string; discoverable: boolean;
}

function CreateRoomModal({ onClose, onCreate }: { onClose: () => void; onCreate: (data: CreateRoomData) => void }) {
  const [data, setData] = useState<CreateRoomData>({
    name: '', description: '', visibility: 'public', join_policy: 'open', theme_color: '#4D7CFE', passphrase: '', discoverable: true,
  });
  const colors = ['#4D7CFE', '#FF3D9A', '#10B981', '#F59E0B', '#06B6D4', '#8B5CF6', '#EF4444', '#3B82F6'];

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!data.name.trim()) return;
    onCreate(data);
  };

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-ink-950/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative glass-card w-full max-w-lg p-6 animate-scale-in max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">Create a Room</h2>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="text-sm text-muted mb-1.5 block">Room Name</label>
            <input
              type="text"
              value={data.name}
              onChange={(e) => setData({ ...data, name: e.target.value })}
              className="input-field"
              placeholder="My Music Room"
              required
              maxLength={50}
            />
          </div>
          <div>
            <label className="text-sm text-muted mb-1.5 block">Description</label>
            <textarea
              value={data.description}
              onChange={(e) => setData({ ...data, description: e.target.value })}
              className="input-field min-h-[80px] resize-none"
              placeholder="What's this room about?"
              maxLength={200}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-muted mb-1.5 block">Visibility</label>
              <select value={data.visibility} onChange={(e) => setData({ ...data, visibility: e.target.value })} className="input-field">
                <option value="public">Public</option>
                <option value="private">Private</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-muted mb-1.5 block">Join Policy</label>
              <select value={data.join_policy} onChange={(e) => setData({ ...data, join_policy: e.target.value })} className="input-field">
                <option value="open">Open</option>
                <option value="request">Request to join</option>
              </select>
            </div>
          </div>
          {data.visibility === 'private' && (
            <div>
              <label className="text-sm text-muted mb-1.5 block">Passphrase (optional)</label>
              <input
                type="text"
                value={data.passphrase}
                onChange={(e) => setData({ ...data, passphrase: e.target.value })}
                className="input-field"
                placeholder="Secret phrase to join"
              />
            </div>
          )}
          {data.visibility === 'public' && (
            <label className="flex items-center gap-2.5 cursor-pointer">
              <button
                type="button"
                onClick={() => setData({ ...data, discoverable: !data.discoverable })}
                className={`relative w-10 h-6 rounded-full transition-colors ${data.discoverable ? 'bg-electric-500' : 'bg-ink-700'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${data.discoverable ? 'translate-x-4' : ''}`} />
              </button>
              <span className="text-sm text-muted">Discoverable in public feed</span>
            </label>
          )}
          <div>
            <label className="text-sm text-muted mb-1.5 block">Theme Color</label>
            <div className="flex gap-2 flex-wrap">
              {colors.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setData({ ...data, theme_color: c })}
                  className={`w-8 h-8 rounded-lg transition-transform ${data.theme_color === c ? 'ring-2 ring-white ring-offset-2 ring-offset-ink-850 scale-110' : 'hover:scale-110'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" className="btn-primary flex-1">Create Room</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function InviteRedeemModal({ onClose, onRedeemed, initialToken }: { onClose: () => void; onRedeemed: (roomId: string) => void; initialToken?: string | null }) {
  const { user } = useAuth();
  const toast = useToast();
  const [token, setToken] = useState(initialToken || '');
  const [loading, setLoading] = useState(false);

  const redeem = async () => {
    if (!user || !token.trim()) return;
    setLoading(true);
    const { data, error } = await supabase.rpc('redeem_invite', { p_token: token.trim() });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    const result = (data as { success: boolean; p_room_id: string | null }) || { success: false, p_room_id: null };
    if (result.success && result.p_room_id) {
      toast.success('Invite redeemed!');
      onRedeemed(result.p_room_id);
    } else {
      toast.error('Invalid or expired invite code');
    }
  };

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-ink-950/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative glass-card w-full max-w-md p-6 animate-scale-in">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold flex items-center gap-2"><KeyRound className="w-5 h-5 text-electric-400" /> Redeem Invite</h2>
          <button onClick={onClose} className="btn-icon-sm text-muted">✕</button>
        </div>
        <p className="text-sm text-muted mb-4">Enter the invite code from the room owner to join instantly.</p>
        <input
          type="text"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="Paste invite code"
          className="input-field font-mono mb-4"
        />
        <button
          onClick={redeem}
          disabled={loading || !token.trim()}
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
          {loading ? 'Redeeming...' : 'Redeem & Join'}
        </button>
      </div>
    </div>
  );
}
