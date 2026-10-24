import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import type { Room, Invitation } from '@/types';
import { X, Trash2, Copy, Check, UserCog, KeyRound, Loader2, Eye, EyeOff, Link2 } from 'lucide-react';
import { timeAgo, initials, avatarColor } from '@/lib/utils';

interface RoomSettingsModalProps {
  room: Room;
  onClose: () => void;
  onSaved: () => void;
}

export function RoomSettingsModal({ room, onClose, onSaved }: RoomSettingsModalProps) {
  const { user } = useAuth();
  const toast = useToast();
  const [name, setName] = useState(room.name);
  const [description, setDescription] = useState(room.description || '');
  const [visibility, setVisibility] = useState(room.visibility);
  const [joinPolicy, setJoinPolicy] = useState(room.join_policy);
  const [themeColor, setThemeColor] = useState(room.theme_color);
  const [passphrase, setPassphrase] = useState(room.passphrase || '');
  const [discoverable, setDiscoverable] = useState(room.discoverable);
  const [members, setMembers] = useState<Array<{ id: string; user_id: string; role: string; status: string; profiles: { display_name: string; avatar_url: string | null; id: string } }>>([]);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);

  const isOwner = room.owner_id === user?.id;

  useEffect(() => {
    const loadMembers = async () => {
      const { data } = await supabase
        .from('room_members')
        .select('id, user_id, role, status, profiles:profiles!room_members_user_id_fkey(id, display_name, avatar_url)')
        .eq('room_id', room.id)
        .order('created_at', { ascending: true });
      setMembers((data as unknown as typeof members) || []);
    };
    loadMembers();
  }, [room.id]);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('rooms')
      .update({
        name,
        description,
        visibility,
        join_policy: joinPolicy,
        theme_color: themeColor,
        passphrase: passphrase || null,
        discoverable: discoverable && visibility === 'public',
      })
      .eq('id', room.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Room updated');
    onSaved();
    onClose();
  };

  const removeMember = async (memberId: string) => {
    const { error } = await supabase.from('room_members').delete().eq('id', memberId);
    if (error) { toast.error(error.message); return; }
    setMembers((prev) => prev.filter((m) => m.id !== memberId));
    toast.success('Member removed');
  };

  const updateMemberRole = async (memberId: string, role: string) => {
    const { error } = await supabase.from('room_members').update({ role }).eq('id', memberId);
    if (error) { toast.error(error.message); return; }
    setMembers((prev) => prev.map((m) => m.id === memberId ? { ...m, role } : m));
    toast.success('Role updated');
  };

  const copyInvite = () => {
    navigator.clipboard.writeText(room.invite_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-ink-950/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative glass-card w-full max-w-lg p-6 animate-scale-in max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Room Settings</h2>
          <button onClick={onClose} className="btn-icon"><X className="w-5 h-5" /></button>
        </div>

        <div className="mb-5">
          <label className="text-sm text-muted mb-1.5 block">Invite Code</label>
          <div className="flex gap-2">
            <input readOnly value={room.invite_code} className="input-field font-mono" />
            <button onClick={copyInvite} className="btn-secondary px-3">
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm text-muted mb-1.5 block">Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="input-field" disabled={!isOwner} />
          </div>
          <div>
            <label className="text-sm text-muted mb-1.5 block">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="input-field min-h-[60px] resize-none" disabled={!isOwner} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-muted mb-1.5 block">Visibility</label>
              <select value={visibility} onChange={(e) => setVisibility(e.target.value as 'public' | 'private')} className="input-field" disabled={!isOwner}>
                <option value="public">Public</option>
                <option value="private">Private</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-muted mb-1.5 block">Join Policy</label>
              <select value={joinPolicy} onChange={(e) => setJoinPolicy(e.target.value as 'open' | 'request')} className="input-field" disabled={!isOwner}>
                <option value="open">Open</option>
                <option value="request">Request to join</option>
              </select>
            </div>
          </div>

          {visibility === 'public' && isOwner && (
            <label className="flex items-center gap-2.5 cursor-pointer">
              <button
                type="button"
                onClick={() => setDiscoverable(!discoverable)}
                className={`relative w-10 h-6 rounded-full transition-colors ${discoverable ? 'bg-electric-500' : 'bg-ink-700'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${discoverable ? 'translate-x-4' : ''}`} />
              </button>
              <div>
                <span className="text-sm font-medium block">Discoverable</span>
                <span className="text-xs text-muted flex items-center gap-1">
                  {discoverable ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                  {discoverable ? 'Visible in public discovery feed' : 'Hidden from discovery feed'}
                </span>
              </div>
            </label>
          )}

          {isOwner && (
            <div>
              <label className="text-sm text-muted mb-1.5 block">Theme Color</label>
              <div className="flex gap-2 flex-wrap">
                {['#4D7CFE', '#FF3D9A', '#10B981', '#F59E0B', '#06B6D4', '#8B5CF6', '#EF4444'].map((c) => (
                  <button key={c} type="button" onClick={() => setThemeColor(c)} className={`w-8 h-8 rounded-lg transition-transform ${themeColor === c ? 'ring-2 ring-white ring-offset-2 ring-offset-ink-850 scale-110' : 'hover:scale-110'}`} style={{ backgroundColor: c }} />
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="mt-6">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><UserCog className="w-4 h-4" /> Members ({members.length})</h3>
          <div className="space-y-1.5 max-h-48 overflow-y-auto scrollbar-hide">
            {members.map((m) => (
              <div key={m.id} className="flex items-center gap-2 p-2 rounded-lg bg-ink-800/50">
                {m.profiles?.avatar_url ? (
                  <img src={m.profiles.avatar_url} alt="" className="w-7 h-7 rounded-lg object-cover" />
                ) : (
                  <div className={`w-7 h-7 rounded-lg ${avatarColor(m.profiles?.id || m.user_id)} flex items-center justify-center text-xs font-bold text-white`}>
                    {initials(m.profiles?.display_name || '?')}
                  </div>
                )}
                <span className="text-sm flex-1 truncate">{m.profiles?.display_name || 'Unknown'}</span>
                <span className={`badge ${m.role === 'owner' ? 'badge-gold' : m.role === 'admin' ? 'badge-blue' : 'badge-muted'}`}>{m.role}</span>
                {m.status === 'pending' && <span className="badge-gold">pending</span>}
                {isOwner && m.role !== 'owner' && (
                  <>
                    <select
                      value={m.role}
                      onChange={(e) => updateMemberRole(m.id, e.target.value)}
                      className="input-sm py-1 px-2 text-xs w-24"
                    >
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                    </select>
                    <button onClick={() => removeMember(m.id)} className="btn-icon-sm text-magenta-400">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        {isOwner && (
          <div className="flex gap-3 pt-5 mt-5 border-t border-white/[0.06]">
            <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button onClick={save} disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function InviteShareModal({ room, onClose }: { room: Room; onClose: () => void }) {
  const toast = useToast();
  const { user } = useAuth();
  const [copied, setCopied] = useState<string | null>(null);
  const [invites, setInvites] = useState<Invitation[]>([]);
  const [creating, setCreating] = useState(false);

  const isOwner = room.owner_id === user?.id;

  useEffect(() => {
    if (isOwner) loadInvites();
  }, [isOwner, room.id]);

  const loadInvites = async () => {
    const { data } = await supabase
      .from('invitations')
      .select('*')
      .eq('room_id', room.id)
      .order('created_at', { ascending: false })
      .limit(10);
    setInvites((data as Invitation[]) || []);
  };

  const createInvite = async () => {
    setCreating(true);
    const { data, error } = await supabase
      .from('invitations')
      .insert({ room_id: room.id, created_by: user?.id })
      .select()
      .single();
    setCreating(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Invite link created');
    setInvites((prev) => [data as Invitation, ...prev]);
  };

  const inviteUrl = `${window.location.origin}/#/?invite=${room.invite_code}`;
  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
    toast.success(`${label} copied`);
  };

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-ink-950/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative glass-card w-full max-w-md p-6 animate-scale-in max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Share Room</h2>
          <button onClick={onClose} className="btn-icon"><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-sm text-muted mb-1.5 block">Room Code</label>
            <div className="flex gap-2">
              <input readOnly value={room.invite_code} className="input-field font-mono" />
              <button onClick={() => copy(room.invite_code, 'Room code')} className="btn-secondary px-3">
                {copied === 'Room code' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="text-sm text-muted mb-1.5 block">Room Link</label>
            <div className="flex gap-2">
              <input readOnly value={inviteUrl} className="input-field font-mono text-xs" />
              <button onClick={() => copy(inviteUrl, 'Room link')} className="btn-secondary px-3">
                {copied === 'Room link' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {isOwner && (
            <div className="pt-3 border-t border-white/[0.06]">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-semibold flex items-center gap-2"><Link2 className="w-4 h-4 text-electric-400" /> Single-use Invite Links</label>
                <button onClick={createInvite} disabled={creating} className="btn-secondary text-xs flex items-center gap-1.5">
                  {creating ? <Loader2 className="w-3 h-3 animate-spin" /> : <KeyRound className="w-3 h-3" />}
                  Generate
                </button>
              </div>
              <p className="text-xs text-muted-2 mb-3">Each link can be used once. Share with someone to give them instant access.</p>
              {invites.length === 0 ? (
                <p className="text-xs text-muted text-center py-3">No invite links yet.</p>
              ) : (
                <div className="space-y-1.5 max-h-40 overflow-y-auto scrollbar-hide">
                  {invites.map((inv) => {
                    const link = `${window.location.origin}/#/?invite=${inv.token}`;
                    const expired = inv.expires_at && new Date(inv.expires_at) < new Date();
                    return (
                      <div key={inv.id} className={`flex items-center gap-2 p-2 rounded-lg bg-ink-800/50 ${inv.used || expired ? 'opacity-50' : ''}`}>
                        <KeyRound className={`w-3.5 h-3.5 shrink-0 ${inv.used ? 'text-muted-2' : expired ? 'text-red-400' : 'text-emerald-400'}`} />
                        <span className="text-xs font-mono truncate flex-1">{inv.token.slice(0, 16)}...</span>
                        {inv.used ? (
                          <span className="text-xs text-muted-2">used</span>
                        ) : expired ? (
                          <span className="text-xs text-red-400">expired</span>
                        ) : (
                          <button onClick={() => copy(link, 'Invite link')} className="btn-icon-sm text-electric-400">
                            {copied === 'Invite link' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
