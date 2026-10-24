import { useState, useEffect, useCallback } from 'react';
import { Camera, Crown, Save, LogOut, Music2, Clock, Settings, Bell, Volume2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { usePremium } from '@/context/PremiumContext';
import { useToast } from '@/context/ToastContext';
import { supabase } from '@/lib/supabase';
import { cn, initials, avatarColor, timeAgo } from '@/lib/utils';
import { audioManager } from '@/lib/audioManager';
import SubscribeModal from '@/components/SubscribeModal';
import { EmptyState } from '@/components/ui/Skeletons';
import type { Track } from '@/types';

type ProfileTab = 'overview' | 'settings' | 'premium';

export default function ProfilePage() {
  const { profile, user, refreshProfile, signOut } = useAuth();
  const { isPremium, features } = usePremium();
  const toast = useToast();
  const [tab, setTab] = useState<ProfileTab>('overview');
  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || '');
  const [saving, setSaving] = useState(false);
  const [showSubscribe, setShowSubscribe] = useState(false);
  const [recentTracks, setRecentTracks] = useState<Track[]>([]);
  const [stats, setStats] = useState({ rooms: 0, tracks: 0, plays: 0 });

  const loadStats = useCallback(async () => {
    if (!user) return;
    const [roomsRes, tracksRes, playsRes] = await Promise.all([
      supabase.from('room_members').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'active'),
      supabase.from('tracks').select('*', { count: 'exact', head: true }).eq('uploaded_by', user.id),
      supabase.from('track_plays').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
    ]);
    setStats({ rooms: roomsRes.count || 0, tracks: tracksRes.count || 0, plays: playsRes.count || 0 });

    const { data: recentPlays } = await supabase
      .from('track_plays')
      .select('track_id, tracks!track_plays_track_id_fkey(*, profiles!tracks_uploaded_by_fkey(*))')
      .eq('user_id', user.id)
      .order('played_at', { ascending: false })
      .limit(10);
    const tracks = ((recentPlays as any) || []).map((p: any) => p.tracks).filter(Boolean) as Track[];
    setRecentTracks(tracks);
  }, [user]);

  useEffect(() => { loadStats(); }, [loadStats]);

  async function handleSave() {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from('profiles').update({
      display_name: displayName,
      avatar_url: avatarUrl || null,
    }).eq('id', user.id);
    if (error) { toast.error('Failed to save'); setSaving(false); return; }
    await refreshProfile();
    toast.success('Profile saved');
    setSaving(false);
  }

  async function handleAvatarUpload(file: File) {
    if (!user) return;
    const ext = file.name.split('.').pop();
    const path = `${user.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('vinyl-avatars').upload(path, file);
    if (error) { toast.error('Upload failed'); return; }
    const { data } = supabase.storage.from('vinyl-avatars').getPublicUrl(path);
    setAvatarUrl(data.publicUrl);
    toast.success('Avatar updated');
  }

  const tabs: { id: ProfileTab; label: string; icon: typeof Settings }[] = [
    { id: 'overview', label: 'Overview', icon: Music2 },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'premium', label: 'Premium', icon: Crown },
  ];

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-6">Profile</h1>

      {/* Profile header */}
      <div className="glass-card p-6 mb-4">
        <div className="flex items-center gap-4 mb-6">
          <div className="relative">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="w-20 h-20 rounded-2xl object-cover" />
            ) : (
              <div className={cn('w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-bold text-white', avatarColor(profile?.id || ''))}>
                {initials(displayName || '?')}
              </div>
            )}
            <label className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-electric-500 flex items-center justify-center cursor-pointer hover:bg-electric-400 transition-colors shadow-lg">
              <Camera className="w-4 h-4 text-white" />
              <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleAvatarUpload(f); }} />
            </label>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold">{profile?.display_name || 'Unnamed'}</h2>
              {isPremium && <Crown className="w-4 h-4 text-amber-400" />}
              {profile?.is_admin && <span className="badge-blue">Admin</span>}
            </div>
            <p className="text-xs text-muted mt-1">{user?.email}</p>
            <p className="text-xs text-muted-2 mt-0.5">Joined {timeAgo(profile?.created_at || new Date())}</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="glass-card p-3 text-center bg-ink-800/50">
            <div className="text-xl font-bold text-electric-400">{stats.rooms}</div>
            <div className="text-[10px] text-muted-2 uppercase tracking-wider font-bold">Rooms</div>
          </div>
          <div className="glass-card p-3 text-center bg-ink-800/50">
            <div className="text-xl font-bold text-magenta-400">{stats.tracks}</div>
            <div className="text-[10px] text-muted-2 uppercase tracking-wider font-bold">Tracks</div>
          </div>
          <div className="glass-card p-3 text-center bg-ink-800/50">
            <div className="text-xl font-bold text-emerald-400">{stats.plays}</div>
            <div className="text-[10px] text-muted-2 uppercase tracking-wider font-bold">Plays</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
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

      {tab === 'overview' && (
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-electric-400" /> Recently Played
            </h3>
            {recentTracks.length === 0 ? (
              <EmptyState icon={Music2} title="No listening history yet" description="Tracks you play will show up here." />
            ) : (
              <div className="space-y-1.5">
                {recentTracks.map((t) => (
                  <div key={t.id} className="glass-card p-3 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-ink-800 flex items-center justify-center shrink-0">
                      <Music2 className="w-4 h-4 text-electric-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{t.title}</p>
                      <p className="text-xs text-muted truncate">{t.profiles?.display_name || 'Unknown'}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'settings' && (
        <div className="space-y-4">
          <div className="glass-card p-6">
            <h3 className="text-sm font-bold mb-4">Account</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted mb-1.5">Display Name</label>
                <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="input-field" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted mb-1.5">Avatar URL</label>
                <input value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} className="input-field" placeholder="https://..." />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted mb-1.5">Email</label>
                <input value={user?.email || ''} disabled className="input-field opacity-50" />
              </div>
              <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2">
                {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                Save Changes
              </button>
            </div>
          </div>

          <div className="glass-card p-6">
            <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
              <Bell className="w-4 h-4 text-electric-400" /> Notifications
            </h3>
            <div className="space-y-3">
              {['Jam sessions', 'Comments on your tracks', 'Replies to your comments', 'New polls and games', 'Room announcements'].map((n, i) => (
                <div key={n} className="flex items-center justify-between">
                  <span className="text-sm text-ink-200">{n}</span>
                  <ToggleSwitch defaultOn={true} />
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card p-6">
            <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-electric-400" /> Audio
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-muted mb-1.5">Default Volume</label>
                <input type="range" min={0} max={100} defaultValue={Math.round(audioManager.getState().volume * 100)} onChange={(e) => audioManager.setVolume(parseFloat(e.target.value) / 100)} className="w-full" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-ink-200">Crossfade between tracks</span>
                <ToggleSwitch defaultOn={audioManager.getState().crossfadeDuration > 0} onToggle={(on) => audioManager.setCrossfadeDuration(on ? 3 : 0)} />
              </div>
            </div>
          </div>

          <button onClick={signOut} className="btn-danger w-full flex items-center justify-center gap-2">
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      )}

      {tab === 'premium' && (
        <div className="space-y-4">
          <div className="glass-card p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/15 flex items-center justify-center">
                <Crown className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <h3 className="text-base font-bold">Premium Status</h3>
                <p className="text-xs text-muted">
                  {isPremium ? 'You have premium access' : 'Free plan'}
                </p>
              </div>
            </div>
            {isPremium ? (
              <span className="badge-green">Active</span>
            ) : (
              <button onClick={() => setShowSubscribe(true)} className="btn-primary w-full">
                Upgrade to Premium
              </button>
            )}
          </div>

          <div className="glass-card p-6">
            <h3 className="text-sm font-bold mb-3">Premium Features</h3>
            <div className="space-y-2">
              {features.map((f) => (
                <div key={f.feature} className="flex items-center justify-between py-2">
                  <div>
                    <span className="text-sm font-semibold">{f.label}</span>
                    <p className="text-xs text-muted">{f.description}</p>
                  </div>
                  {isPremium ? (
                    <span className="badge-green">Active</span>
                  ) : f.is_premium ? (
                    <span className="badge-gold">Premium</span>
                  ) : (
                    <span className="badge-green">Free</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {showSubscribe && <SubscribeModal onClose={() => setShowSubscribe(false)} />}
    </div>
  );
}

function ToggleSwitch({ defaultOn, onToggle }: { defaultOn: boolean; onToggle?: (on: boolean) => void }) {
  const [on, setOn] = useState(defaultOn);
  return (
    <button
      onClick={() => { const next = !on; setOn(next); onToggle?.(next); }}
      className={cn(
        'w-10 h-6 rounded-full transition-all relative',
        on ? 'bg-electric-500' : 'bg-ink-700'
      )}
    >
      <span className={cn(
        'absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all',
        on ? 'left-[18px]' : 'left-0.5'
      )} />
    </button>
  );
}
