import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/context/ToastContext';
import {
  Users, Music, DoorOpen, Crown, Activity, Settings, Loader2, BarChart3,
  Megaphone, CheckCircle, XCircle, TrendingUp, Lock, Eye, EyeOff, KeyRound,
  Disc3, Search, Trash2, UserCog, Plus, Edit3, X, Download, Bug, Shield,
  Gift, Ban, ChevronDown, ChevronRight, Calendar, DollarSign, Filter,
  AlertTriangle, CheckCheck, Zap, FileDown, ListChecks, CreditCard,
} from 'lucide-react';
import type { AppSettings, PaymentDetails, Ad } from '@/types';
import { CURRENCIES, formatPrice } from '@/lib/premiumFeatures';
import { cn, timeAgo, initials, avatarColor } from '@/lib/utils';
import { EmptyState } from '@/components/ui/Skeletons';
import { navigate } from '@/hooks/useRoute';

type AdminTab = 'overview' | 'users' | 'rooms' | 'premium' | 'ads' | 'announcements' | 'analytics' | 'logs' | 'export' | 'bugcheck' | 'webhook' | 'settings';

interface AdminUser {
  id: string;
  display_name: string;
  avatar_url: string | null;
  is_admin: boolean;
  created_at: string;
  is_premium: boolean;
  rooms_owned: number;
  tracks_uploaded: number;
  sub_status: string | null;
}

interface AdminRoom {
  id: string;
  name: string;
  description: string;
  owner_id: string;
  cover_url: string | null;
  visibility: string;
  join_policy: string;
  invite_code: string;
  theme_color: string;
  passphrase: string | null;
  created_at: string;
  owner_name: string | null;
  member_count: number;
  track_count: number;
}

interface SubWithUser {
  id: string;
  user_id: string;
  status: string;
  payment_ref: string;
  payment_amount: number;
  receipt_path: string | null;
  receipt_status: string;
  granted_at: string | null;
  expires_at: string | null;
  created_at: string;
  display_name?: string;
}

interface AnalyticsData {
  users_by_day: { date: string; count: number }[];
  rooms_by_day: { date: string; count: number }[];
  tracks_by_day: { date: string; count: number }[];
  impressions_by_day: { date: string; count: number }[];
  game_plays_by_day: { date: string; count: number }[];
  listening_by_day: { date: string; count: number }[];
  summary: {
    total_plays: number;
    total_listening_events: number;
    total_comments: number;
    total_polls: number;
    total_game_sessions: number;
    total_jam_sessions: number;
    total_ad_impressions: number;
    most_active_room: string | null;
    most_active_user: string | null;
  };
}

interface ActivityLogEntry {
  id: string;
  user_id: string | null;
  user_name: string;
  action_type: string;
  description: string;
  entity_type: string;
  entity_id: string | null;
  room_id: string | null;
  created_at: string;
}

interface BugResult {
  severity: string;
  title: string;
  description: string;
  count: number;
  fixable: boolean;
}

interface PremiumFeatureFlag {
  feature: string;
  is_premium: boolean;
  label: string;
  description: string;
  sort_order?: number;
}

interface EditableFeature extends PremiumFeatureFlag {
  originalLabel: string;
  originalDescription: string;
  originalIsPremium: boolean;
}

const TRIGGER_TYPES = ['after_n_songs', 'at_timestamp', 'after_n_songs_at_timestamp', 'on_any_page', 'scheduled'];

const FEATURE_CATALOG: PremiumFeatureFlag[] = [
  { feature: 'mix_mode', label: 'Mix Mode', description: 'Crossfade between tracks with Web Audio API', is_premium: true },
  { feature: 'offline_access', label: 'Offline Downloads', description: 'Download tracks for offline listening', is_premium: true },
  { feature: 'game_access', label: 'Game Access', description: 'Play games in rooms', is_premium: true },
  { feature: 'chat_attachments', label: 'Chat Attachments', description: 'Send media attachments in comments', is_premium: true },
  { feature: 'ad_free', label: 'Ad-Free Listening', description: 'Remove all advertisements from the experience', is_premium: true },
  { feature: 'hi_res_audio', label: 'Hi-Res Audio', description: 'Stream high-fidelity lossless audio', is_premium: true },
  { feature: 'custom_themes', label: 'Custom Themes', description: 'Personalize the app with custom color themes', is_premium: true },
  { feature: 'unlimited_rooms', label: 'Unlimited Rooms', description: 'Create unlimited rooms with no cap', is_premium: true },
  { feature: 'lyrics_view', label: 'Lyrics View', description: 'View synchronized lyrics while listening', is_premium: true },
  { feature: 'equalizer', label: 'Equalizer', description: 'Adjust audio frequencies with a built-in EQ', is_premium: true },
  { feature: 'priority_queue', label: 'Priority Queue', description: 'Jump the queue when adding tracks to rooms', is_premium: true },
  { feature: 'custom_room_url', label: 'Custom Room URL', description: 'Set a custom vanity URL for rooms', is_premium: true },
];

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setVerifying(true);
    setError('');
    const { data, error: rpcError } = await supabase.rpc('verify_admin_password', { p_password: password });
    if (rpcError) {
      setError('Unable to reach the server. Please try again.');
    } else if (data === true) {
      setAuthed(true);
    } else {
      setError('Incorrect password. Please try again.');
    }
    setVerifying(false);
  }

  function handleLogout() {
    setPassword('');
    setAuthed(false);
  }

  if (!authed) {
    return (
      <div className="min-h-screen flex flex-col bg-ink-950">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-electric-600/8 rounded-full blur-[120px]" />
          <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-magenta-500/6 rounded-full blur-[120px]" />
        </div>
        <div className="relative flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-md">
            <div className="flex flex-col items-center mb-8">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-electric-500 to-electric-700 flex items-center justify-center mb-4 shadow-2xl shadow-electric-500/30 ambient-glow">
                <Lock className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-2xl font-extrabold tracking-tight">Admin Access</h1>
              <p className="text-muted text-sm mt-1">Enter the admin password to continue</p>
            </div>
            <form onSubmit={handleLogin} className="glass-card p-8 animate-slide-up space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted mb-1.5 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" /> Admin Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input-field !pr-10"
                    placeholder="Enter admin password"
                    required
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink-200 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              {error && <p className="text-sm text-magenta-400 font-medium">{error}</p>}
              <button type="submit" disabled={verifying || !password.trim()} className="btn-primary w-full flex items-center justify-center gap-2 h-11">
                {verifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                Unlock Dashboard
              </button>
              <button type="button" onClick={() => navigate('/')} className="w-full text-center text-xs text-muted-2 hover:text-muted transition-colors pt-1">
                Back to app
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return <AdminDashboard password={password} onLogout={handleLogout} />;
}

function AdminDashboard({ password, onLogout }: { password: string; onLogout: () => void }) {
  const [tab, setTab] = useState<AdminTab>('overview');

  const tabs: { id: AdminTab; label: string; icon: typeof Users }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'rooms', label: 'Rooms', icon: DoorOpen },
    { id: 'premium', label: 'Premium', icon: Crown },
    { id: 'ads', label: 'Ads', icon: Megaphone },
    { id: 'announcements', label: 'Announce', icon: Megaphone },
    { id: 'analytics', label: 'Analytics', icon: TrendingUp },
    { id: 'logs', label: 'Logs', icon: ListChecks },
    { id: 'export', label: 'Export', icon: FileDown },
    { id: 'bugcheck', label: 'Bug Check', icon: Bug },
    { id: 'webhook', label: 'Webhook', icon: Zap },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-ink-950">
      <div className="sticky top-0 z-20 bg-ink-950/90 backdrop-blur-md border-b border-white/[0.04] px-4 md:px-8 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-electric-500 to-electric-700 flex items-center justify-center shadow-lg shadow-electric-500/20">
            <Disc3 className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-lg md:text-xl font-extrabold tracking-tight">Admin Dashboard</h1>
        </div>
        <button onClick={onLogout} className="btn-ghost !text-xs flex items-center gap-1.5">
          <Lock className="w-3.5 h-3.5" /> Lock
        </button>
      </div>

      <div className="p-4 md:p-8 max-w-5xl mx-auto">
        <div className="flex gap-1 p-1 bg-ink-800/50 rounded-xl mb-6 overflow-x-auto scrollbar-hide">
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

        {tab === 'overview' && <OverviewTab password={password} onTabChange={setTab} />}
        {tab === 'users' && <UsersTab password={password} />}
        {tab === 'rooms' && <RoomsTab password={password} />}
        {tab === 'premium' && <PremiumTab password={password} />}
        {tab === 'ads' && <AdsTab password={password} />}
        {tab === 'announcements' && <AnnouncementsTab password={password} />}
        {tab === 'analytics' && <AnalyticsTab password={password} />}
        {tab === 'logs' && <LogsTab password={password} />}
        {tab === 'export' && <ExportTab password={password} />}
        {tab === 'bugcheck' && <BugCheckTab password={password} />}
        {tab === 'webhook' && <WebhookTab password={password} />}
        {tab === 'settings' && <SettingsTab password={password} />}
      </div>
    </div>
  );
}

/* ──────────────────── Confirm Dialog ──────────────────── */

function ConfirmDialog({ open, title, message, onConfirm, onCancel, confirmLabel, danger }: {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  danger?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onCancel}>
      <div className="glass-card p-6 max-w-sm w-full animate-scale-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-3">
          {danger ? <AlertTriangle className="w-5 h-5 text-magenta-400" /> : <CheckCheck className="w-5 h-5 text-electric-400" />}
          <h3 className="text-base font-bold">{title}</h3>
        </div>
        <p className="text-sm text-muted mb-4">{message}</p>
        <div className="flex gap-2">
          <button onClick={onCancel} className="btn-ghost flex-1 !text-sm">Cancel</button>
          <button
            onClick={onConfirm}
            className={cn('flex-1 h-10 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-1.5', danger ? 'bg-magenta-600 hover:bg-magenta-500 text-white' : 'btn-primary')}
          >
            {confirmLabel || 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────── Overview Tab ──────────────────── */

function OverviewTab({ password, onTabChange }: { password: string; onTabChange: (t: AdminTab) => void }) {
  const [stats, setStats] = useState({ users: 0, rooms: 0, tracks: 0, premium: 0 });
  const [extendedStats, setExtendedStats] = useState<AnalyticsData['summary'] | null>(null);
  const [logs, setLogs] = useState<ActivityLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.rpc('admin_get_overview', { p_password: password });
      if (data && !data.error) {
        setStats(data.stats || { users: 0, rooms: 0, tracks: 0, premium: 0 });
        setLogs(data.activity || []);
      }
      const { data: analytics } = await supabase.rpc('admin_get_analytics', { p_password: password, p_days: 30 });
      if (analytics && !analytics.error) {
        setExtendedStats(analytics.summary);
      }
      setLoading(false);
    })();
  }, [password]);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-electric-400" /></div>;

  const cards = [
    { label: 'Users', value: stats.users, icon: Users, color: 'text-electric-400', bg: 'bg-electric-500/10' },
    { label: 'Rooms', value: stats.rooms, icon: DoorOpen, color: 'text-magenta-400', bg: 'bg-magenta-500/10' },
    { label: 'Tracks', value: stats.tracks, icon: Music, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { label: 'Premium', value: stats.premium, icon: Crown, color: 'text-amber-400', bg: 'bg-amber-500/10' },
    ...(extendedStats ? [
      { label: 'Comments', value: extendedStats.total_comments, icon: Activity, color: 'text-sky-400', bg: 'bg-sky-500/10' },
      { label: 'Polls', value: extendedStats.total_polls, icon: BarChart3, color: 'text-teal-400', bg: 'bg-teal-500/10' },
      { label: 'Ad Views', value: extendedStats.total_ad_impressions, icon: Eye, color: 'text-orange-400', bg: 'bg-orange-500/10' },
      { label: 'Game Sessions', value: extendedStats.total_game_sessions, icon: Zap, color: 'text-violet-400', bg: 'bg-violet-500/10' },
    ] : []),
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="glass-card p-5 animate-fade-in">
            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center mb-3', c.bg)}>
              <c.icon className={cn('w-5 h-5', c.color)} />
            </div>
            <div className="text-2xl font-extrabold">{c.value}</div>
            <div className="text-xs text-muted mt-1 font-semibold uppercase tracking-wider">{c.label}</div>
          </div>
        ))}
      </div>

      {extendedStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="glass-card p-5">
            <h3 className="text-xs font-bold text-muted-2 uppercase tracking-wider mb-3">Top Activity</h3>
            <div className="space-y-2.5">
              <div className="flex items-center gap-2 text-sm">
                <TrendingUp className="w-4 h-4 text-electric-400 shrink-0" />
                <span className="text-muted">Total Plays:</span>
                <span className="font-bold text-ink-100">{extendedStats.total_plays.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Music className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-muted">Listening Events:</span>
                <span className="font-bold text-ink-100">{extendedStats.total_listening_events.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Disc3 className="w-4 h-4 text-magenta-400 shrink-0" />
                <span className="text-muted">Jam Sessions:</span>
                <span className="font-bold text-ink-100">{extendedStats.total_jam_sessions}</span>
              </div>
              {extendedStats.most_active_room && (
                <div className="flex items-center gap-2 text-sm">
                  <DoorOpen className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="text-muted">Top Room:</span>
                  <span className="font-bold text-ink-100 truncate">{extendedStats.most_active_room}</span>
                </div>
              )}
              {extendedStats.most_active_user && (
                <div className="flex items-center gap-2 text-sm">
                  <Users className="w-4 h-4 text-electric-400 shrink-0" />
                  <span className="text-muted">Top User:</span>
                  <span className="font-bold text-ink-100 truncate">{extendedStats.most_active_user}</span>
                </div>
              )}
            </div>
          </div>

          <div className="glass-card p-5">
            <h3 className="text-xs font-bold text-muted-2 uppercase tracking-wider mb-3">Quick Actions</h3>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => onTabChange('announcements')} className="btn-ghost !text-xs flex items-center gap-1.5">
                <Megaphone className="w-3.5 h-3.5" /> New Announcement
              </button>
              <button onClick={() => onTabChange('ads')} className="btn-ghost !text-xs flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5" /> Create Ad
              </button>
              <button onClick={() => onTabChange('premium')} className="btn-ghost !text-xs flex items-center gap-1.5">
                <Gift className="w-3.5 h-3.5" /> Grant Premium
              </button>
              <button onClick={() => onTabChange('bugcheck')} className="btn-ghost !text-xs flex items-center gap-1.5">
                <Bug className="w-3.5 h-3.5" /> Run Bug Check
              </button>
              <button onClick={() => onTabChange('analytics')} className="btn-ghost !text-xs flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5" /> View Analytics
              </button>
              <button onClick={() => onTabChange('export')} className="btn-ghost !text-xs flex items-center gap-1.5">
                <Download className="w-3.5 h-3.5" /> Export Data
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="glass-card p-6">
        <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-electric-400" /> Recent Activity
        </h3>
        {logs.length === 0 ? (
          <p className="text-sm text-muted">No recent activity.</p>
        ) : (
          <div className="space-y-2">
            {logs.map((log) => (
              <div key={log.id} className="flex items-center gap-3 text-sm py-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-electric-500 shrink-0" />
                <span className="text-ink-200 truncate flex-1">{log.description}</span>
                <span className="text-[10px] text-muted-2 shrink-0">{timeAgo(log.created_at)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ──────────────────── Users Tab ──────────────────── */

function UsersTab({ password }: { password: string }) {
  const toast = useToast();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [userDetails, setUserDetails] = useState<Record<string, unknown>>({});
  const [detailsLoading, setDetailsLoading] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [confirmBan, setConfirmBan] = useState<string | null>(null);
  const [grantModal, setGrantModal] = useState<string | null>(null);
  const [grantDays, setGrantDays] = useState(365);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.rpc('admin_get_users_enhanced', { p_password: password, p_search: search || null });
    if (data && !data.error) {
      setUsers(data.users || []);
    }
    setLoading(false);
  }, [password, search]);

  useEffect(() => { load(); }, [load]);

  async function toggleExpand(userId: string) {
    if (expanded === userId) {
      setExpanded(null);
      return;
    }
    setExpanded(userId);
    if (!userDetails[userId]) {
      setDetailsLoading(userId);
      const { data } = await supabase.rpc('admin_get_user_details', { p_password: password, p_user_id: userId });
      if (data && !data.error) {
        setUserDetails((prev) => ({ ...prev, [userId]: data }));
      }
      setDetailsLoading(null);
    }
  }

  async function saveEdit(userId: string) {
    const { data } = await supabase.rpc('admin_update_user', { p_password: password, p_user_id: userId, p_display_name: editName });
    if (data === true) {
      toast.success('User updated');
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, display_name: editName } : u));
      setEditing(null);
    } else {
      toast.error('Failed to update user');
    }
  }

  async function toggleAdmin(userId: string, currentAdmin: boolean) {
    const { data } = await supabase.rpc('admin_update_user', { p_password: password, p_user_id: userId, p_is_admin: !currentAdmin });
    if (data === true) {
      toast.success(!currentAdmin ? 'Admin privileges granted' : 'Admin privileges revoked');
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, is_admin: !currentAdmin } : u));
    } else {
      toast.error('Failed to update');
    }
  }

  async function doDelete() {
    if (!confirmDelete) return;
    const { data } = await supabase.rpc('admin_delete_user', { p_password: password, p_user_id: confirmDelete });
    if (data === true) {
      toast.success('User deleted');
      setUsers((prev) => prev.filter((u) => u.id !== confirmDelete));
    } else {
      toast.error('Failed to delete user');
    }
    setConfirmDelete(null);
  }

  async function doBan() {
    if (!confirmBan) return;
    const { data } = await supabase.rpc('admin_update_user', { p_password: password, p_user_id: confirmBan, p_banned: true });
    if (data === true) {
      toast.success('User banned from non-owned rooms');
    } else {
      toast.error('Failed to ban user');
    }
    setConfirmBan(null);
  }

  async function doGrant() {
    if (!grantModal) return;
    const { data } = await supabase.rpc('admin_grant_premium', { p_password: password, p_user_id: grantModal, p_duration_days: grantDays });
    if (data === true) {
      toast.success('Premium granted');
      setUsers((prev) => prev.map((u) => u.id === grantModal ? { ...u, is_premium: true } : u));
    } else {
      toast.error('Failed to grant premium');
    }
    setGrantModal(null);
  }

  function doSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearch(searchInput);
  }

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-electric-400" /></div>;

  return (
    <div className="space-y-4">
      <form onSubmit={doSearch} className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
        <input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="input-field !pl-10"
          placeholder="Search users by name..."
        />
      </form>

      {users.length === 0 ? (
        <EmptyState icon={Users} title="No users found" description="Try a different search term" />
      ) : (
        <div className="space-y-2">
          {users.map((u) => (
            <div key={u.id}>
              <div className={cn('glass-card p-3 flex items-center gap-3 transition-all', expanded === u.id && 'border-electric-500/20')}>
                {u.avatar_url ? (
                  <img src={u.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
                ) : (
                  <div className={cn('w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0', avatarColor(u.id))}>
                    {initials(u.display_name || '?')}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  {editing === u.id ? (
                    <div className="flex items-center gap-1">
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="input-field !py-1 !text-sm flex-1"
                        autoFocus
                      />
                      <button onClick={() => saveEdit(u.id)} className="p-1 rounded-lg text-emerald-400 hover:bg-emerald-500/10"><CheckCircle className="w-4 h-4" /></button>
                      <button onClick={() => setEditing(null)} className="p-1 rounded-lg text-muted hover:bg-white/5"><X className="w-4 h-4" /></button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm font-semibold truncate">{u.display_name || 'Unnamed'}</span>
                        {u.is_admin && <span className="badge-blue">Admin</span>}
                        {u.is_premium && <span className="badge-gold">Premium</span>}
                        {u.sub_status === 'pending' && <span className="badge-muted">Pending</span>}
                      </div>
                      <span className="text-xs text-muted-2">
                        {u.rooms_owned} rooms · {u.tracks_uploaded} tracks · Joined {timeAgo(u.created_at)}
                      </span>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => { setEditing(u.id); setEditName(u.display_name || ''); }}
                    className="p-1.5 rounded-lg text-ink-300 hover:bg-white/5 hover:text-electric-400 transition-colors"
                    title="Edit name"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => toggleAdmin(u.id, u.is_admin)}
                    className={cn('p-1.5 rounded-lg transition-colors', u.is_admin ? 'text-amber-400 hover:bg-amber-500/10' : 'text-muted hover:bg-white/5 hover:text-amber-400')}
                    title={u.is_admin ? 'Revoke admin' : 'Make admin'}
                  >
                    <Shield className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setGrantModal(u.id)}
                    className="p-1.5 rounded-lg text-muted hover:bg-amber-500/10 hover:text-amber-400 transition-colors"
                    title="Grant premium"
                  >
                    <Gift className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setConfirmBan(u.id)}
                    className="p-1.5 rounded-lg text-muted hover:bg-orange-500/10 hover:text-orange-400 transition-colors"
                    title="Ban from rooms"
                  >
                    <Ban className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setConfirmDelete(u.id)}
                    className="p-1.5 rounded-lg text-muted hover:bg-magenta-500/10 hover:text-magenta-400 transition-colors"
                    title="Delete user"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => toggleExpand(u.id)}
                    className="p-1.5 rounded-lg text-muted hover:bg-white/5 transition-colors"
                  >
                    {expanded === u.id ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {expanded === u.id && (
                <div className="glass-card mt-1 p-4 animate-fade-in">
                  {detailsLoading === u.id ? (
                    <div className="flex justify-center py-3"><Loader2 className="w-4 h-4 animate-spin text-electric-400" /></div>
                  ) : (
                    <UserDetails details={userDetails[u.id]} />
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!confirmDelete}
        title="Delete User"
        message="This will permanently delete the user and all their data (rooms, tracks, comments, subscriptions). This cannot be undone."
        onConfirm={doDelete}
        onCancel={() => setConfirmDelete(null)}
        confirmLabel="Delete"
        danger
      />
      <ConfirmDialog
        open={!!confirmBan}
        title="Ban User"
        message="This will remove the user from all non-owned rooms. They will keep their own rooms."
        onConfirm={doBan}
        onCancel={() => setConfirmBan(null)}
        confirmLabel="Ban"
        danger
      />

      {grantModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setGrantModal(null)}>
          <div className="glass-card p-6 max-w-sm w-full animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-bold mb-4 flex items-center gap-2"><Gift className="w-5 h-5 text-amber-400" /> Grant Premium</h3>
            <label className="block text-xs font-semibold text-muted mb-1.5">Duration (days)</label>
            <input type="number" value={grantDays} onChange={(e) => setGrantDays(parseInt(e.target.value) || 365)} className="input-field mb-4" min={1} />
            <div className="flex gap-2">
              <button onClick={() => setGrantModal(null)} className="btn-ghost flex-1 !text-sm">Cancel</button>
              <button onClick={doGrant} className="btn-primary flex-1 flex items-center justify-center gap-1.5">
                <Crown className="w-4 h-4" /> Grant
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function UserDetails({ details }: { details: Record<string, unknown> }) {
  if (!details) return null;
  const roomsOwned = (details.rooms_owned as { id: string; name: string; created_at: string }[]) || [];
  const tracksUploaded = details.tracks_uploaded as number || 0;
  const subs = (details.subscriptions as { id: string; status: string; receipt_status: string; created_at: string; expires_at: string | null }[]) || [];
  const roomsJoined = details.rooms_joined as number || 0;
  const profile = details.profile as { display_name: string; avatar_url: string | null; is_admin: boolean; created_at: string } | null;

  return (
    <div className="space-y-3 text-sm">
      {profile && (
        <div className="flex gap-4 text-xs">
          <span className="text-muted">Member since:</span>
          <span className="text-ink-200">{new Date(profile.created_at).toLocaleDateString()}</span>
        </div>
      )}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-ink-800/50 rounded-lg p-2 text-center">
          <div className="text-lg font-bold text-electric-400">{roomsJoined}</div>
          <div className="text-[10px] text-muted-2 uppercase">Rooms Joined</div>
        </div>
        <div className="bg-ink-800/50 rounded-lg p-2 text-center">
          <div className="text-lg font-bold text-emerald-400">{tracksUploaded}</div>
          <div className="text-[10px] text-muted-2 uppercase">Tracks</div>
        </div>
        <div className="bg-ink-800/50 rounded-lg p-2 text-center">
          <div className="text-lg font-bold text-amber-400">{subs.length}</div>
          <div className="text-[10px] text-muted-2 uppercase">Subscriptions</div>
        </div>
      </div>
      {roomsOwned.length > 0 && (
        <div>
          <h4 className="text-xs font-bold text-muted-2 uppercase mb-1.5">Rooms Owned</h4>
          <div className="space-y-1">
            {roomsOwned.map((r) => (
              <div key={r.id} className="flex items-center gap-2 text-xs">
                <DoorOpen className="w-3 h-3 text-muted" /> {r.name} · {timeAgo(r.created_at)}
              </div>
            ))}
          </div>
        </div>
      )}
      {subs.length > 0 && (
        <div>
          <h4 className="text-xs font-bold text-muted-2 uppercase mb-1.5">Subscription History</h4>
          <div className="space-y-1">
            {subs.map((s) => (
              <div key={s.id} className="flex items-center gap-2 text-xs">
                <Crown className="w-3 h-3 text-amber-400" /> {s.status} · {s.receipt_status} · {timeAgo(s.created_at)}
                {s.expires_at && <span className="text-muted-2">expires {timeAgo(s.expires_at)}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ──────────────────── Rooms Tab ──────────────────── */

function RoomsTab({ password }: { password: string }) {
  const toast = useToast();
  const [rooms, setRooms] = useState<AdminRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [roomDetails, setRoomDetails] = useState<Record<string, unknown>>({});
  const [detailsLoading, setDetailsLoading] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.rpc('admin_get_rooms_enhanced', { p_password: password, p_search: search || null });
    if (data && !data.error) {
      setRooms(data.rooms || []);
    }
    setLoading(false);
  }, [password, search]);

  useEffect(() => { load(); }, [load]);

  async function toggleExpand(roomId: string) {
    if (expanded === roomId) { setExpanded(null); return; }
    setExpanded(roomId);
    if (!roomDetails[roomId]) {
      setDetailsLoading(roomId);
      const { data } = await supabase.rpc('admin_get_room_details', { p_password: password, p_room_id: roomId });
      if (data && !data.error) {
        setRoomDetails((prev) => ({ ...prev, [roomId]: data }));
      }
      setDetailsLoading(null);
    }
  }

  async function doDelete() {
    if (!confirmDelete) return;
    const { data } = await supabase.rpc('admin_delete_room', { p_password: password, p_room_id: confirmDelete });
    if (data === true) {
      toast.success('Room deleted');
      setRooms((prev) => prev.filter((r) => r.id !== confirmDelete));
    } else {
      toast.error('Failed to delete room');
    }
    setConfirmDelete(null);
  }

  function doSearch(e: React.FormEvent) { e.preventDefault(); setSearch(searchInput); }

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-electric-400" /></div>;

  return (
    <div className="space-y-4">
      <form onSubmit={doSearch} className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
        <input value={searchInput} onChange={(e) => setSearchInput(e.target.value)} className="input-field !pl-10" placeholder="Search rooms by name or invite code..." />
      </form>

      {rooms.length === 0 ? (
        <EmptyState icon={DoorOpen} title="No rooms found" />
      ) : (
        <div className="space-y-2">
          {rooms.map((r) => (
            <div key={r.id}>
              <div className={cn('glass-card p-3 flex items-center gap-3 transition-all', expanded === r.id && 'border-electric-500/20')}>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${r.theme_color}20` }}>
                  <Music className="w-5 h-5" style={{ color: r.theme_color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-semibold truncate block">{r.name}</span>
                  <span className="text-xs text-muted-2">
                    {r.visibility} · {r.member_count} members · {r.track_count} tracks
                    {r.owner_name ? ` · ${r.owner_name}` : ''} · {timeAgo(r.created_at)}
                  </span>
                </div>
                <span className="text-xs text-muted-2 font-mono hidden sm:block">{r.invite_code}</span>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => setConfirmDelete(r.id)} className="p-1.5 rounded-lg text-muted hover:bg-magenta-500/10 hover:text-magenta-400 transition-colors" title="Delete room">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => toggleExpand(r.id)} className="p-1.5 rounded-lg text-muted hover:bg-white/5 transition-colors">
                    {expanded === r.id ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {expanded === r.id && (
                <div className="glass-card mt-1 p-4 animate-fade-in">
                  {detailsLoading === r.id ? (
                    <div className="flex justify-center py-3"><Loader2 className="w-4 h-4 animate-spin text-electric-400" /></div>
                  ) : (
                    <RoomDetails details={roomDetails[r.id]} />
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!confirmDelete}
        title="Delete Room"
        message="This will permanently delete the room and all its tracks, comments, polls, games, and messages. This cannot be undone."
        onConfirm={doDelete}
        onCancel={() => setConfirmDelete(null)}
        confirmLabel="Delete"
        danger
      />
    </div>
  );
}

function RoomDetails({ details }: { details: Record<string, unknown> }) {
  if (!details) return null;
  const members = (details.members as { id: string; user_id: string; role: string; status: string; display_name: string }[]) || [];
  const memberCount = details.member_count as number || 0;
  const trackCount = details.track_count as number || 0;
  const commentCount = details.comment_count as number || 0;
  const pollCount = details.poll_count as number || 0;

  return (
    <div className="space-y-3 text-sm">
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-ink-800/50 rounded-lg p-2 text-center">
          <div className="text-lg font-bold text-electric-400">{memberCount}</div>
          <div className="text-[10px] text-muted-2 uppercase">Members</div>
        </div>
        <div className="bg-ink-800/50 rounded-lg p-2 text-center">
          <div className="text-lg font-bold text-emerald-400">{trackCount}</div>
          <div className="text-[10px] text-muted-2 uppercase">Tracks</div>
        </div>
        <div className="bg-ink-800/50 rounded-lg p-2 text-center">
          <div className="text-lg font-bold text-sky-400">{commentCount}</div>
          <div className="text-[10px] text-muted-2 uppercase">Comments</div>
        </div>
        <div className="bg-ink-800/50 rounded-lg p-2 text-center">
          <div className="text-lg font-bold text-amber-400">{pollCount}</div>
          <div className="text-[10px] text-muted-2 uppercase">Polls</div>
        </div>
      </div>
      {members.length > 0 && (
        <div>
          <h4 className="text-xs font-bold text-muted-2 uppercase mb-1.5">Members</h4>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {members.map((m) => (
              <div key={m.id} className="flex items-center gap-2 text-xs py-1">
                {m.display_name || 'Unknown'}
                <span className={cn('badge !text-[9px] !px-1.5 !py-0', m.role === 'owner' ? 'badge-gold' : m.role === 'admin' ? 'badge-blue' : 'badge-muted')}>{m.role}</span>
                {m.status !== 'active' && <span className="text-magenta-400">{m.status}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ──────────────────── Premium Tab ──────────────────── */

function PremiumTab({ password }: { password: string }) {
  const toast = useToast();
  const [data, setData] = useState<{ pending: SubWithUser[]; active: SubWithUser[]; history: SubWithUser[]; stats: { active_count: number; pending_count: number; total_revenue: number } } | null>(null);
  const [loading, setLoading] = useState(true);
  const [subTab, setSubTab] = useState<'pending' | 'active' | 'history'>('pending');
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [confirmRevoke, setConfirmRevoke] = useState<string | null>(null);
  const [extending, setExtending] = useState<string | null>(null);
  const [features, setFeatures] = useState<EditableFeature[]>([]);
  const [savingFeatures, setSavingFeatures] = useState(false);
  const [showAddFeature, setShowAddFeature] = useState(false);
  const [confirmDeleteFeature, setConfirmDeleteFeature] = useState<string | null>(null);
  const [addingFeature, setAddingFeature] = useState<string | null>(null);
  const [premiumPrice, setPremiumPrice] = useState(0);
  const [premiumCurrency, setPremiumCurrency] = useState('NGN');
  const [savingPricing, setSavingPricing] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase.rpc('admin_get_subscriptions_enhanced', { p_password: password });
    if (data && !data.error) {
      setData(data);
    }
    const { data: featRaw } = await supabase.rpc('admin_get_premium_features', { p_password: password });
    if (featRaw && !featRaw.error) {
      let featRows: PremiumFeatureFlag[];
      try {
        featRows = typeof featRaw === 'string' ? JSON.parse(featRaw) : featRaw;
      } catch { setLoading(false); return; }
      setFeatures((featRows as PremiumFeatureFlag[]).map((f) => ({
        ...f,
        originalLabel: f.label,
        originalDescription: f.description ?? '',
        originalIsPremium: f.is_premium,
      })).sort((a, b) => (a.sort_order ?? 99) - (b.sort_order ?? 99)));
    }
    const { data: settingsRaw } = await supabase.rpc('admin_get_settings', { p_password: password });
    if (settingsRaw && !settingsRaw.error && settingsRaw.settings) {
      setPremiumPrice(Number(settingsRaw.settings.premium_price) || 0);
      setPremiumCurrency(settingsRaw.settings.premium_currency || 'NGN');
    }
    setLoading(false);
  }, [password]);

  async function savePricing() {
    setSavingPricing(true);
    const { data } = await supabase.rpc('admin_save_premium_pricing', {
      p_password: password,
      p_price: premiumPrice,
      p_currency: premiumCurrency,
    });
    if (data === true) toast.success('Premium pricing saved'); else toast.error('Failed to save pricing');
    setSavingPricing(false);
  }

  useEffect(() => { load(); }, [load]);

  function hasUnsavedChanges(f: EditableFeature): boolean {
    return f.label !== f.originalLabel || f.description !== f.originalDescription || f.is_premium !== f.originalIsPremium;
  }

  async function saveFeatures() {
    setSavingFeatures(true);
    let ok = true;
    for (const f of features) {
      if (!hasUnsavedChanges(f)) continue;
      const { data } = await supabase.rpc('admin_update_premium_feature', {
        p_password: password,
        p_feature: f.feature,
        p_is_premium: f.is_premium,
        p_label: f.label,
        p_description: f.description,
      });
      if (data !== true) ok = false;
    }
    if (ok) {
      toast.success('Premium feature configuration saved');
      setFeatures((prev) => prev.map((f) => ({
        ...f,
        originalLabel: f.label,
        originalDescription: f.description,
        originalIsPremium: f.is_premium,
      })));
    } else {
      toast.error('Some features failed to update');
    }
    setSavingFeatures(false);
  }

  async function addFeatureFromCatalog(cat: PremiumFeatureFlag) {
    setAddingFeature(cat.feature);
    const { data } = await supabase.rpc('admin_add_premium_feature', {
      p_password: password,
      p_feature: cat.feature,
      p_label: cat.label,
      p_description: cat.description,
      p_is_premium: cat.is_premium,
    });
    if (data === true) {
      toast.success(`${cat.label} added`);
      setShowAddFeature(false);
      load();
    } else {
      toast.error('Failed to add feature');
    }
    setAddingFeature(null);
  }

  async function deleteFeature() {
    if (!confirmDeleteFeature) return;
    const { data } = await supabase.rpc('admin_delete_premium_feature', { p_password: password, p_feature: confirmDeleteFeature });
    if (data === true) {
      toast.success('Feature deleted');
      setFeatures((prev) => prev.filter((f) => f.feature !== confirmDeleteFeature));
    } else {
      toast.error('Failed to delete feature');
    }
    setConfirmDeleteFeature(null);
  }

  async function approve(id: string) {
    const { data } = await supabase.rpc('admin_approve_subscription', { p_password: password, p_sub_id: id });
    if (data === true) { toast.success('Subscription approved'); load(); } else { toast.error('Failed to approve'); }
  }

  async function reject(id: string) {
    const { data } = await supabase.rpc('admin_reject_subscription', { p_password: password, p_sub_id: id });
    if (data === true) { toast.success('Subscription rejected'); load(); } else { toast.error('Failed to reject'); }
  }

  async function extend(id: string) {
    setExtending(id);
    const { data } = await supabase.rpc('admin_extend_subscription', { p_password: password, p_sub_id: id });
    if (data === true) { toast.success('Subscription extended by 1 year'); load(); } else { toast.error('Failed to extend'); }
    setExtending(null);
  }

  async function doRevoke() {
    if (!confirmRevoke) return;
    const { data } = await supabase.rpc('admin_revoke_premium', { p_password: password, p_user_id: confirmRevoke });
    if (data === true) { toast.success('Premium revoked'); load(); } else { toast.error('Failed to revoke'); }
    setConfirmRevoke(null);
  }

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-electric-400" /></div>;

  const subTabs = data ? [
    { id: 'pending' as const, label: `Pending (${data.stats.pending_count})`, list: data.pending },
    { id: 'active' as const, label: `Active (${data.stats.active_count})`, list: data.active },
    { id: 'history' as const, label: 'History', list: data.history },
  ] : [];

  const anyUnsaved = features.some(hasUnsavedChanges);

  return (
    <div className="space-y-4">
      {data ? (
        <>
          <div className="grid grid-cols-3 gap-4">
            <div className="glass-card p-4">
              <div className="flex items-center gap-2 mb-1"><Crown className="w-4 h-4 text-amber-400" /><span className="text-xs text-muted uppercase font-semibold">Active</span></div>
              <div className="text-2xl font-extrabold text-amber-400">{data.stats.active_count}</div>
            </div>
            <div className="glass-card p-4">
              <div className="flex items-center gap-2 mb-1"><Loader2 className="w-4 h-4 text-electric-400" /><span className="text-xs text-muted uppercase font-semibold">Pending</span></div>
              <div className="text-2xl font-extrabold text-electric-400">{data.stats.pending_count}</div>
            </div>
            <div className="glass-card p-4">
              <div className="flex items-center gap-2 mb-1"><DollarSign className="w-4 h-4 text-emerald-400" /><span className="text-xs text-muted uppercase font-semibold">Revenue</span></div>
              <div className="text-2xl font-extrabold text-emerald-400">{Number(data.stats.total_revenue).toLocaleString()}</div>
            </div>
          </div>

          <div className="flex gap-1 p-1 bg-ink-800/50 rounded-xl">
            {subTabs.map((st) => (
              <button key={st.id} onClick={() => setSubTab(st.id)} className={cn('flex-1 py-2 rounded-lg text-sm font-semibold transition-all', subTab === st.id ? 'bg-ink-700 text-white' : 'text-ink-400 hover:text-ink-200')}>
                {st.label}
              </button>
            ))}
          </div>

          {subTabs.find((st) => st.id === subTab)!.list.length === 0 ? (
            <EmptyState icon={Crown} title={`No ${subTab} subscriptions`} />
          ) : (
            <div className="space-y-2">
              {subTabs.find((st) => st.id === subTab)!.list.map((s) => (
                <div key={s.id} className="glass-card p-3 flex items-center gap-3">
                  <div className={cn('w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0', avatarColor(s.user_id))}>
                    {initials(s.display_name || '?')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-semibold truncate block">{s.display_name || 'Unknown'}</span>
                    <span className="text-xs text-muted-2">
                      {s.payment_ref} · {s.payment_amount > 0 ? `${s.payment_amount}` : '—'}
                      {s.expires_at && ` · expires ${timeAgo(s.expires_at)}`}
                      {` · ${timeAgo(s.created_at)}`}
                    </span>
                  </div>
                  <span className={cn('badge capitalize shrink-0', s.receipt_status === 'approved' ? 'badge-green' : s.receipt_status === 'rejected' ? 'badge-red' : 'badge-gold')}>
                    {s.receipt_status}
                  </span>
                  {s.receipt_path && (
                    <button onClick={() => setReceiptPreview(s.receipt_path)} className="p-1.5 rounded-lg text-muted hover:bg-white/5 hover:text-electric-400 transition-colors" title="View receipt">
                      <Eye className="w-4 h-4" />
                    </button>
                  )}
                  {subTab === 'pending' && (
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => approve(s.id)} className="p-1.5 rounded-lg text-emerald-400 hover:bg-emerald-500/10 transition-colors" title="Approve"><CheckCircle className="w-4 h-4" /></button>
                      <button onClick={() => reject(s.id)} className="p-1.5 rounded-lg text-magenta-400 hover:bg-magenta-500/10 transition-colors" title="Reject"><XCircle className="w-4 h-4" /></button>
                    </div>
                  )}
                  {subTab === 'active' && (
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => extend(s.id)} disabled={extending === s.id} className="p-1.5 rounded-lg text-emerald-400 hover:bg-emerald-500/10 transition-colors disabled:opacity-50" title="Extend 1 year">
                        {extending === s.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                      </button>
                      <button onClick={() => setConfirmRevoke(s.user_id)} className="p-1.5 rounded-lg text-magenta-400 hover:bg-magenta-500/10 transition-colors" title="Revoke"><XCircle className="w-4 h-4" /></button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <EmptyState icon={Crown} title="Subscription data unavailable" />
      )}

      {receiptPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setReceiptPreview(null)}>
          <div className="max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-bold text-ink-200">Receipt Preview</h3>
              <button onClick={() => setReceiptPreview(null)} className="p-1 rounded-lg text-muted hover:text-ink-200"><X className="w-4 h-4" /></button>
            </div>
            <img src={receiptPreview} alt="Receipt" className="w-full rounded-lg border border-white/10" />
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!confirmRevoke}
        title="Revoke Premium"
        message="This will immediately cancel the user's premium subscription. They will lose access to premium features."
        onConfirm={doRevoke}
        onCancel={() => setConfirmRevoke(null)}
        confirmLabel="Revoke"
        danger
      />

      {/* ────── Premium Pricing ────── */}
      <div className="glass-card p-5 space-y-4">
        <h3 className="text-sm font-bold flex items-center gap-2"><DollarSign className="w-4 h-4 text-emerald-400" /> Premium Pricing</h3>
        <p className="text-xs text-muted">Set the price and currency listeners see on the checkout screen.</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-muted mb-1.5">Price</label>
            <input type="number" min="0" step="0.01" value={premiumPrice} onChange={(e) => setPremiumPrice(parseFloat(e.target.value) || 0)} className="input-field" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted mb-1.5">Currency</label>
            <select value={premiumCurrency} onChange={(e) => setPremiumCurrency(e.target.value)} className="input-field">
              {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-2">Preview: <span className="font-bold text-ink-100">{formatPrice(premiumPrice, premiumCurrency)}</span></span>
          <button onClick={savePricing} disabled={savingPricing} className="btn-primary flex items-center gap-2 disabled:opacity-50">
            {savingPricing ? <Loader2 className="w-4 h-4 animate-spin" /> : <DollarSign className="w-4 h-4" />}
            Save Pricing
          </button>
        </div>
      </div>

      {/* ────── Premium Feature Configuration ────── */}
      <div className="glass-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold flex items-center gap-2"><Lock className="w-4 h-4 text-amber-400" /> Premium Feature Configuration</h3>
            <p className="text-xs text-muted mt-0.5">Edit, add, or remove features. Toggle premium to restrict access to paying users only.</p>
          </div>
          <button onClick={() => setShowAddFeature(!showAddFeature)} className="btn-ghost !text-xs flex items-center gap-1.5 shrink-0">
            {showAddFeature ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
            {showAddFeature ? 'Cancel' : 'Add Feature'}
          </button>
        </div>

        {anyUnsaved && (
          <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-500/10 rounded-lg px-3 py-2">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            You have unsaved changes. Click Save to apply.
          </div>
        )}

        {/* Add Feature Catalog Picker */}
        {showAddFeature && (
          <div className="bg-ink-800/40 rounded-xl p-4 space-y-2 animate-slide-up">
            <p className="text-xs text-muted mb-2">Select a feature to add to your premium configuration.</p>
            {FEATURE_CATALOG.map((cat) => {
              const exists = features.some((f) => f.feature === cat.feature);
              return (
                <div
                  key={cat.feature}
                  className={cn(
                    'rounded-lg border p-3 flex items-center gap-3 transition-colors',
                    exists ? 'border-white/[0.04] bg-ink-900/30 opacity-50' : 'border-white/[0.06] bg-ink-800/40 hover:border-electric-500/20'
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-ink-100">{cat.label}</span>
                      <code className="text-[10px] font-mono text-muted-2 bg-ink-800/60 px-1.5 py-0.5 rounded">{cat.feature}</code>
                    </div>
                    <p className="text-xs text-muted mt-0.5">{cat.description}</p>
                  </div>
                  <div className="shrink-0">
                    {exists ? (
                      <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                        <CheckCircle className="w-4 h-4" /> Added
                      </span>
                    ) : addingFeature === cat.feature ? (
                      <Loader2 className="w-4 h-4 animate-spin text-electric-400" />
                    ) : (
                      <button
                        onClick={() => addFeatureFromCatalog(cat)}
                        className="btn-primary !text-xs flex items-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Feature List */}
        {features.length === 0 && !showAddFeature ? (
          <p className="text-xs text-muted-2 text-center py-4">No premium features configured yet. Click "Add Feature" to create one.</p>
        ) : (
          <div className="space-y-2">
            {features.map((f) => {
              const dirty = hasUnsavedChanges(f);
              return (
                <div
                  key={f.feature}
                  className={cn(
                    'rounded-xl border p-3 transition-colors',
                    dirty ? 'border-amber-500/30 bg-amber-500/[0.03]' : 'border-white/[0.04] bg-ink-800/20'
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center gap-2">
                        <code className="text-[10px] font-mono text-muted-2 bg-ink-800/60 px-1.5 py-0.5 rounded">{f.feature}</code>
                        {dirty && <span className="text-[10px] text-amber-400 font-semibold">Unsaved</span>}
                      </div>
                      <input
                        value={f.label}
                        onChange={(e) => setFeatures((prev) => prev.map((pf) => pf.feature === f.feature ? { ...pf, label: e.target.value } : pf))}
                        className="input-field !py-1.5 !text-sm font-semibold"
                        placeholder="Feature label"
                      />
                      <input
                        value={f.description}
                        onChange={(e) => setFeatures((prev) => prev.map((pf) => pf.feature === f.feature ? { ...pf, description: e.target.value } : pf))}
                        className="input-field !py-1.5 !text-xs text-muted"
                        placeholder="Description"
                      />
                    </div>
                    <div className="flex flex-col items-center gap-2 shrink-0">
                      <button
                        onClick={() => setFeatures((prev) => prev.map((pf) => pf.feature === f.feature ? { ...pf, is_premium: !pf.is_premium } : pf))}
                        className={cn('relative w-12 h-6 rounded-full transition-colors shrink-0', f.is_premium ? 'bg-amber-500' : 'bg-ink-700')}
                        title={f.is_premium ? 'Premium only' : 'Available to all'}
                      >
                        <span className={cn('absolute top-1 w-4 h-4 rounded-full bg-white transition-all', f.is_premium ? 'left-7' : 'left-1')} />
                      </button>
                      <span className={cn('text-[10px] font-semibold', f.is_premium ? 'text-amber-400' : 'text-muted-2')}>
                        {f.is_premium ? 'Premium' : 'Free'}
                      </span>
                      <button
                        onClick={() => setConfirmDeleteFeature(f.feature)}
                        className="p-1 rounded-lg text-muted hover:bg-magenta-500/10 hover:text-magenta-400 transition-colors"
                        title="Delete feature"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Save Button */}
        {features.length > 0 && (
          <div className="flex items-center justify-between pt-1 border-t border-white/[0.04]">
            <span className="text-xs text-muted-2">{features.filter(hasUnsavedChanges).length} unsaved change{features.filter(hasUnsavedChanges).length !== 1 ? 's' : ''}</span>
            <button
              onClick={saveFeatures}
              disabled={savingFeatures || !anyUnsaved}
              className="btn-primary flex items-center gap-2 disabled:opacity-50"
            >
              {savingFeatures ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
              Save Changes
            </button>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!confirmDeleteFeature}
        title="Delete Feature"
        message="This will remove the feature flag. If any code references this feature key, it will fall back to non-premium behavior."
        onConfirm={deleteFeature}
        onCancel={() => setConfirmDeleteFeature(null)}
        confirmLabel="Delete"
        danger
      />
    </div>
  );
}

/* ──────────────────── Ads Tab ──────────────────── */

function AdsTab({ password }: { password: string }) {
  const toast = useToast();
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingAd, setEditingAd] = useState<Ad | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase.rpc('admin_get_ads', { p_password: password });
    setAds((data || []) as Ad[]);
    setLoading(false);
  }, [password]);

  useEffect(() => { load(); }, [load]);

  async function toggleStatus(ad: Ad) {
    const { data, error } = await supabase.rpc('admin_toggle_ad', { p_password: password, p_ad_id: ad.id });
    if (error) { toast.error('Failed to toggle ad'); return; }
    if (data && data !== 'unauthorized' && data !== 'not_found') {
      setAds((prev) => prev.map((a) => a.id === ad.id ? { ...a, status: data as Ad['status'] } : a));
    } else {
      toast.error('Failed to toggle ad');
    }
  }

  async function doDelete() {
    if (!confirmDelete) return;
    const { data } = await supabase.rpc('admin_delete_ad', { p_password: password, p_ad_id: confirmDelete });
    if (data === true) {
      toast.success('Ad deleted');
      setAds((prev) => prev.filter((a) => a.id !== confirmDelete));
    } else {
      toast.error('Failed to delete ad');
    }
    setConfirmDelete(null);
  }

  function openCreate() { setEditingAd(null); setShowForm(true); }
  function openEdit(ad: Ad) { setEditingAd(ad); setShowForm(true); }

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-electric-400" /></div>;

  return (
    <div className="space-y-4">
      <button onClick={openCreate} className="btn-primary flex items-center gap-2 w-full justify-center">
        <Plus className="w-4 h-4" /> Create New Ad
      </button>

      {ads.length === 0 ? (
        <EmptyState icon={Megaphone} title="No ads created yet" description="Click the button above to create your first ad" />
      ) : (
        <div className="space-y-2">
          {ads.map((ad) => (
            <div key={ad.id} className="glass-card p-4">
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-semibold truncate block">{ad.title}</span>
                  <span className="text-xs text-muted-2">{ad.trigger_type} · {ad.impressions} impressions · {ad.status}</span>
                </div>
                <span className={cn('badge shrink-0', ad.status === 'active' ? 'badge-green' : 'badge-muted')}>{ad.status}</span>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => openEdit(ad)} className="p-1.5 rounded-lg text-muted hover:bg-white/5 hover:text-electric-400 transition-colors" title="Edit"><Edit3 className="w-3.5 h-3.5" /></button>
                  <button onClick={() => toggleStatus(ad)} className="btn-ghost !text-xs">{ad.status === 'active' ? 'Pause' : 'Activate'}</button>
                  <button onClick={() => setConfirmDelete(ad.id)} className="p-1.5 rounded-lg text-muted hover:bg-magenta-500/10 hover:text-magenta-400 transition-colors" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
              {ad.description && <p className="text-xs text-muted mt-2">{ad.description}</p>}
              {(ad.cta_url || ad.cta_label) && (
                <div className="flex gap-3 mt-2 text-xs text-muted-2">
                  {ad.cta_label && <span>CTA: {ad.cta_label}</span>}
                  {ad.cta_url && <span className="truncate">URL: {ad.cta_url}</span>}
                  <span>Close: {ad.close_after_seconds}s</span>
                  <span>Skip: {ad.skip_duration_seconds}s</span>
                  {ad.show_to_premium && <span className="text-amber-400">Shows to premium</span>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <AdForm
          password={password}
          ad={editingAd}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); load(); }}
        />
      )}

      <ConfirmDialog
        open={!!confirmDelete}
        title="Delete Ad"
        message="This will permanently delete the ad and all its impression data."
        onConfirm={doDelete}
        onCancel={() => setConfirmDelete(null)}
        confirmLabel="Delete"
        danger
      />
    </div>
  );
}

function AdForm({ password, ad, onClose, onSaved }: { password: string; ad: Ad | null; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [title, setTitle] = useState(ad?.title || '');
  const [description, setDescription] = useState(ad?.description || '');
  const [videoUrl, setVideoUrl] = useState(ad?.video_url || '');
  const [triggerType, setTriggerType] = useState(ad?.trigger_type || 'on_any_page');
  const [triggerConfig, setTriggerConfig] = useState(JSON.stringify(ad?.trigger_config || {}));
  const [startsAt, setStartsAt] = useState(ad?.starts_at ? ad.starts_at.slice(0, 16) : '');
  const [endsAt, setEndsAt] = useState(ad?.ends_at ? ad.ends_at.slice(0, 16) : '');
  const [showToPremium, setShowToPremium] = useState(ad?.show_to_premium || false);
  const [ctaUrl, setCtaUrl] = useState(ad?.cta_url || '');
  const [ctaLabel, setCtaLabel] = useState(ad?.cta_label || 'Learn More');
  const [closeAfter, setCloseAfter] = useState(ad?.close_after_seconds ?? 5);
  const [skipDuration, setSkipDuration] = useState(ad?.skip_duration_seconds ?? 15);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    let parsedConfig = {};
    try { parsedConfig = JSON.parse(triggerConfig); } catch { /* empty */ }

    if (ad) {
      const { data } = await supabase.rpc('admin_update_ad', {
        p_password: password, p_ad_id: ad.id,
        p_title: title, p_description: description, p_video_url: videoUrl || null,
        p_trigger_type: triggerType, p_trigger_config: parsedConfig,
        p_starts_at: startsAt ? new Date(startsAt).toISOString() : null,
        p_ends_at: endsAt ? new Date(endsAt).toISOString() : null,
        p_show_to_premium: showToPremium, p_cta_url: ctaUrl || null, p_cta_label: ctaLabel,
        p_close_after_seconds: closeAfter, p_skip_duration_seconds: skipDuration,
      });
      if (data === true) { toast.success('Ad updated'); onSaved(); } else { toast.error('Failed to update ad'); }
    } else {
      const { data } = await supabase.rpc('admin_create_ad', {
        p_password: password, p_title: title, p_description: description,
        p_video_url: videoUrl || null, p_trigger_type: triggerType,
        p_trigger_config: parsedConfig,
        p_starts_at: startsAt ? new Date(startsAt).toISOString() : null,
        p_ends_at: endsAt ? new Date(endsAt).toISOString() : null,
        p_show_to_premium: showToPremium, p_cta_url: ctaUrl || null, p_cta_label: ctaLabel,
        p_close_after_seconds: closeAfter, p_skip_duration_seconds: skipDuration,
      });
      if (data && data.id) { toast.success('Ad created'); onSaved(); } else { toast.error('Failed to create ad'); }
    }
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto" onClick={onClose}>
      <div className="glass-card p-6 max-w-lg w-full my-8 animate-scale-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold flex items-center gap-2"><Megaphone className="w-5 h-5 text-electric-400" /> {ad ? 'Edit Ad' : 'Create Ad'}</h3>
          <button onClick={onClose} className="p-1 rounded-lg text-muted hover:text-ink-200"><X className="w-4 h-4" /></button>
        </div>

        <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
          <div>
            <label className="block text-xs font-semibold text-muted mb-1.5">Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="input-field" placeholder="Ad title" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted mb-1.5">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="input-field min-h-[60px] resize-none" placeholder="Ad description" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted mb-1.5">Video URL</label>
            <input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} className="input-field" placeholder="https://..." />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted mb-1.5">Trigger Type</label>
            <select value={triggerType} onChange={(e) => setTriggerType(e.target.value)} className="input-field">
              {TRIGGER_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted mb-1.5">Trigger Config (JSON)</label>
            <input value={triggerConfig} onChange={(e) => setTriggerConfig(e.target.value)} className="input-field font-mono !text-xs" placeholder='{"n_songs": 3}' />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-muted mb-1.5">Starts At</label>
              <input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} className="input-field !text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted mb-1.5">Ends At</label>
              <input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} className="input-field !text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-muted mb-1.5">CTA Label</label>
              <input value={ctaLabel} onChange={(e) => setCtaLabel(e.target.value)} className="input-field" placeholder="Learn More" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted mb-1.5">CTA URL</label>
              <input value={ctaUrl} onChange={(e) => setCtaUrl(e.target.value)} className="input-field" placeholder="https://..." />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-muted mb-1.5">Close After (seconds)</label>
              <input type="number" value={closeAfter} onChange={(e) => setCloseAfter(parseInt(e.target.value) || 0)} className="input-field" min={0} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted mb-1.5">Skip After (seconds)</label>
              <input type="number" value={skipDuration} onChange={(e) => setSkipDuration(parseInt(e.target.value) || 0)} className="input-field" min={0} />
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={showToPremium} onChange={(e) => setShowToPremium(e.target.checked)} className="w-4 h-4 rounded accent-electric-500" />
            <span className="text-sm text-ink-200">Show to premium users</span>
          </label>
        </div>

        <button onClick={save} disabled={saving || !title.trim()} className="btn-primary w-full mt-4 flex items-center justify-center gap-2 disabled:opacity-50">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
          {ad ? 'Update Ad' : 'Create Ad'}
        </button>
      </div>
    </div>
  );
}

/* ──────────────────── Webhook Tab ──────────────────── */

const APPS_SCRIPT_TEMPLATE = `// ============================================================
// VINYL — PREMIUM SUBSCRIPTION NOTIFICATIONS
// Paste into script.google.com -> Deploy -> New deployment -> Web app
// Execute as: Me, Who has access: Anyone
// ============================================================

const NOTIFY_EMAIL  = "you@yourdomain.com";
const BRAND_NAME    = "Vinyl";
const BRAND_TAGLINE = "unreleased. first.";
const SUPPORT_EMAIL = "you@yourdomain.com";
const SITE_URL      = "https://vinyl.app";
const DASHBOARD_URL = "https://vinyl.app/admin";

const BLACK      = "#0D0C0B";
const CREAM      = "#F3ECDD";
const PAPER      = "#EFE8D9";
const CARD       = "#FFFFFF";
const ACID       = "#DFFF3F";
const ACID_INK   = "#5C6B0F";
const ACID_SOFT  = "#F7FFD6";
const MUTED      = "#8A8378";
const HAIRLINE   = "#E3DCCB";
const ALERT      = "#FF4D3D";
const ALERT_SOFT = "#FFECE9";

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) throw new Error("Empty request body");
    const data = JSON.parse(e.postData.contents);
    const type = String(data.type || "premium_subscription").toLowerCase();
    if (type === "ping") return json({ status: "ok" });

    const ref = getRef(data);
    const cache = CacheService.getScriptCache();
    const cacheKey = "vinyl_premium_" + ref;
    if (cache.get(cacheKey)) return json({ status: "duplicate", ref: ref });
    cache.put(cacheKey, "1", 21600);

    MailApp.sendEmail({
      to: NOTIFY_EMAIL,
      subject: "Vinyl Premium - " + (data.customerName || data.name || "A listener") +
               " - " + planLabel(data) + " - " + money(data.amount, data.currency),
      htmlBody: buildPremiumEmail(data, ref)
    });
    return json({ status: "success", ref: ref });
  } catch (err) {
    return json({ status: "error", message: err.message });
  }
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function buildPremiumEmail(d, ref) {
  var name    = d.customerName || d.name || "A listener";
  var email   = d.email || d.customerEmail || "";
  var phone   = d.phone || d.whatsapp || "";
  var proof   = d.paymentImage || d.paymentProof || d.proofUrl || d.receiptLink || "";
  var plan    = planLabel(d);
  var amount  = money(d.amount || d.price || d.total, d.currency);
  var cycle   = d.billingCycle || d.interval || d.planCycle || "—";
  var until   = d.accessUntil || d.expiresAt || "";
  var channel = d.paymentChannel || d.method || d.channel || "—";
  var note    = d.note || d.message || "";

  var proofBlock = proof
    ? '<div style="background:' + CARD + ';border:1px solid ' + HAIRLINE + ';border-radius:14px;padding:12px;">' +
        '<a href="' + esc(proof) + '" style="text-decoration:none;">' +
          '<img src="' + esc(proof) + '" width="520" alt="Payment proof" border="0" ' +
            'style="display:block;width:100%;max-width:520px;height:auto;border-radius:10px;border:1px solid ' + HAIRLINE + ';">' +
        '</a></div>'
    : '<div style="background:' + ALERT_SOFT + ';border:1.5px dashed ' + ALERT + ';border-radius:14px;padding:20px 22px;">' +
        '<div style="font-size:12px;text-transform:uppercase;color:' + ALERT + ';font-weight:700;margin-bottom:8px;">No proof attached</div>' +
        '<div style="font-size:13.5px;color:' + BLACK + ';line-height:1.6;">' +
          'This subscription arrived without a payment image. Follow up before granting access.</div></div>';

  var detailRows =
    row("Plan", esc(plan)) +
    row("Amount", '<strong>' + esc(amount) + '</strong>') +
    row("Billing cycle", esc(cycle)) +
    (until ? row("Access until", esc(niceDate(until))) : "") +
    row("Payment channel", esc(channel)) +
    row("Reference", '<code>' + esc(ref) + '</code>') +
    (note ? '<tr><td colspan="2" style="padding:6px 20px 18px;">' +
        '<div style="font-size:11px;color:' + MUTED + ';text-transform:uppercase;margin-bottom:6px;">Note from subscriber</div>' +
        '<div style="font-size:13.5px;color:' + BLACK + ';line-height:1.6;">' + esc(note) + '</div></td></tr>' : "");

  return wrap(
    header(),
    hero({
      badge: badge("PREMIUM PAYMENT", BLACK, ACID),
      eyebrow: esc(ref) + (d.createdAt ? "  -  " + esc(niceDate(d.createdAt)) : ""),
      title: "Someone just went Premium.",
      subtitle: '<strong>' + esc(name) + '</strong> - ' + esc(plan) + ' - ' + esc(amount)
    }),
    section(proofBlock),
    spacer(24),
    sectionTitle("Subscription"),
    card('<table width="100%">' + detailRows + '</table>'),
    spacer(20),
    sectionTitle("Subscriber"),
    section(dashedFrame(
      '<div style="font-size:13.5px;color:' + BLACK + ';line-height:1.65;">' +
        '<div style="font-weight:600;margin-bottom:2px;">' + esc(name) + '</div>' +
        (email ? '<div><a href="mailto:' + esc(email) + '" style="color:' + ACID_INK + ';">' + esc(email) + '</a></div>' : '') +
        (phone ? '<div style="color:' + MUTED + ';">' + esc(phone) + '</div>' : '') +
      '</div>'
    )),
    spacer(30),
    footer()
  );
}

function wrap() {
  var sections = Array.prototype.slice.call(arguments).join("");
  return '<!DOCTYPE html><html><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1"></head>' +
    '<body style="margin:0;padding:0;background:' + PAPER + ';">' +
      '<table width="100%" style="background:' + PAPER + ';"><tr><td align="center" style="padding:26px 12px;">' +
        '<table width="600" style="max-width:600px;width:100%;background:' + CREAM + ';border-radius:20px;overflow:hidden;">' +
          sections + '</table></td></tr></table></body></html>';
}

function header() {
  return '<tr><td align="center" style="background:' + BLACK + ';padding:38px 24px 30px;">' +
    '<div style="font-size:30px;font-weight:700;color:' + CREAM + ';line-height:1.1;">' + esc(BRAND_NAME) + '</div>' +
    '<div style="font-size:10px;letter-spacing:0.34em;text-transform:uppercase;color:' + ACID + ';margin-top:10px;">' + esc(BRAND_TAGLINE) + '</div>' +
  '</td></tr>';
}

function hero(o) {
  return '<tr><td align="center" style="padding:30px 32px 22px;">' + (o.badge || "") +
    (o.eyebrow ? '<div style="font-size:11px;text-transform:uppercase;color:' + MUTED + ';margin-top:16px;">' + o.eyebrow + '</div>' : '') +
    '<div style="font-size:25px;font-weight:700;color:' + BLACK + ';line-height:1.28;margin-top:10px;">' + o.title + '</div>' +
    '<div style="font-size:13.5px;color:' + MUTED + ';margin-top:10px;line-height:1.6;">' + o.subtitle + '</div></td></tr>';
}

function badge(label, color, bg) {
  return '<div style="display:inline-block;padding:9px 18px;background:' + bg +
    ';border-radius:999px;font-size:11.5px;font-weight:700;color:' + color + ';text-transform:uppercase;">' + label + '</div>';
}

function dashedFrame(inner) {
  return '<div style="border:1.5px dashed ' + ACID_INK + ';border-radius:14px;padding:20px 22px;background:' + ACID_SOFT + ';">' + inner + '</div>';
}

function card(inner) {
  return '<div style="background:' + CARD + ';border-radius:14px;overflow:hidden;border:1px solid ' + HAIRLINE + ';">' + inner + '</div>';
}

function section(inner) { return '<tr><td style="padding:0 24px;">' + inner + '</td></tr>'; }

function sectionTitle(label) {
  return '<tr><td style="padding:0 26px 12px;">' +
    '<div style="font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:' + MUTED + ';font-weight:700;">' + label + '</div></td></tr>';
}

function row(label, value) {
  return '<tr><td style="padding:9px 20px;font-size:13px;color:' + MUTED + ';">' + label + '</td>' +
    '<td align="right" style="padding:9px 20px;font-size:13.5px;color:' + BLACK + ';font-weight:600;">' + value + '</td></tr>';
}

function spacer(px) {
  return '<tr><td style="height:' + px + 'px;line-height:' + px + 'px;font-size:0;">&nbsp;</td></tr>';
}

function footer() {
  return '<tr><td align="center" style="padding:10px 24px 40px;">' +
    '<div style="width:36px;height:2px;background:' + ACID + ';margin:0 auto 20px;"></div>' +
    '<div style="font-size:11px;color:' + MUTED + ';line-height:1.7;">' +
      'Internal notification - sent to ' + esc(SUPPORT_EMAIL) + '<br>' +
      'You are receiving this because a premium payment was submitted on Vinyl.</div></td></tr>';
}

function getRef(d) {
  var r = d.reference || d.paymentRef || d.txRef || d.orderRef || d.id || "";
  r = String(r).trim();
  return r || "VNL-" + Date.now().toString(36).toUpperCase();
}
function planLabel(d) { return String(d.plan || d.planName || d.tier || "Premium"); }
function esc(s) {
  return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function money(v, cur) {
  var n = Number(v || 0), c = String(cur || "USD").toUpperCase();
  var sym = { NGN: "\\u20A6", USD: "$", GBP: "\\u00A3", EUR: "\\u20AC", CAD: "CA$" }[c] || (c + " ");
  return sym + n.toLocaleString("en-US", { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 });
}
function niceDate(s) {
  if (!s) return "";
  var d = new Date(s);
  if (isNaN(d.getTime())) return String(s);
  return Utilities.formatDate(d, Session.getScriptTimeZone(), "dd MMM yyyy - HH:mm");
}
`;

function WebhookTab({ password }: { password: string }) {
  const toast = useToast();
  const [webhookUrl, setWebhookUrl] = useState('');
  const [savedUrl, setSavedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ status: number; body: string } | null>(null);
  const [showScript, setShowScript] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.rpc('admin_get_settings', { p_password: password });
      if (data && !data.error) {
        const url = (data.settings as AppSettings)?.payment_webhook_url || '';
        setWebhookUrl(url);
        setSavedUrl(url || null);
      }
      setLoading(false);
    })();
  }, [password]);

  async function saveUrl() {
    setSaving(true);
    const { data: curSettings } = await supabase.rpc('admin_get_settings', { p_password: password });
    const s = curSettings?.settings as AppSettings | undefined;
    const { data } = await supabase.rpc('admin_save_settings', {
      p_password: password,
      p_max_rooms_free: s?.max_rooms_free ?? 3,
      p_max_rooms_premium: s?.max_rooms_premium ?? 100,
      p_premium_popup_copy: s?.premium_popup_copy ?? { title: 'Upgrade to Premium', body: 'Unlock all features', cta_label: 'Subscribe' },
      p_premium_price: s?.premium_price ?? 0,
      p_premium_currency: s?.premium_currency ?? 'NGN',
      p_payment_webhook_url: webhookUrl.trim() || null,
    });
    if (data === true) {
      toast.success('Webhook URL saved');
      setSavedUrl(webhookUrl.trim() || null);
    } else {
      toast.error('Failed to save webhook URL');
    }
    setSaving(false);
  }

  async function testPing() {
    if (!webhookUrl.trim()) { toast.error('Enter a webhook URL first'); return; }
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch(webhookUrl.trim(), {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ type: 'ping' }),
      });
      const body = await res.text();
      setTestResult({ status: res.status, body });
      if (res.ok) toast.success('Ping successful');
      else toast.error(`Ping failed (HTTP ${res.status})`);
    } catch (err) {
      setTestResult({ status: 0, body: (err as Error).message });
      toast.error('Ping failed - network error');
    }
    setTesting(false);
  }

  function copyScript() {
    navigator.clipboard.writeText(APPS_SCRIPT_TEMPLATE).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-electric-400" /></div>;

  return (
    <div className="space-y-4">
      {!savedUrl && (
        <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-500/10 rounded-lg px-3 py-2">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          No webhook configured - you will not be emailed when a payment receipt is uploaded.
        </div>
      )}

      <div className="glass-card p-5 space-y-4">
        <h3 className="text-sm font-bold flex items-center gap-2"><Zap className="w-4 h-4 text-electric-400" /> Payment Webhook</h3>
        <p className="text-xs text-muted">When a listener uploads a payment receipt, the app posts a notification to this URL. Deploy the Google Apps Script below, then paste the /exec URL here.</p>

        <div>
          <label className="block text-xs font-semibold text-muted mb-1.5">Webhook URL (Google Apps Script /exec)</label>
          <input
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            className="input-field font-mono !text-xs"
            placeholder="https://script.google.com/macros/s/AKfyc.../exec"
          />
        </div>

        <div className="flex gap-2">
          <button onClick={saveUrl} disabled={saving} className="btn-primary flex items-center gap-2 disabled:opacity-50">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            Save URL
          </button>
          <button onClick={testPing} disabled={testing || !webhookUrl.trim()} className="btn-ghost flex items-center gap-2 disabled:opacity-50">
            {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            Send Test Ping
          </button>
        </div>

        {testResult && (
          <div className="bg-ink-800/50 rounded-lg p-3 space-y-1">
            <div className="text-xs font-semibold text-muted">Test Result</div>
            <div className="text-sm">
              <span className={cn('font-bold', testResult.status >= 200 && testResult.status < 300 ? 'text-emerald-400' : 'text-magenta-400')}>
                HTTP {testResult.status || 'Network Error'}
              </span>
            </div>
            <pre className="text-xs text-muted-2 font-mono whitespace-pre-wrap break-all max-h-32 overflow-y-auto">{testResult.body}</pre>
          </div>
        )}
      </div>

      <div className="glass-card p-5 space-y-3">
        <button onClick={() => setShowScript(!showScript)} className="w-full flex items-center justify-between text-sm font-bold">
          <span className="flex items-center gap-2"><CreditCard className="w-4 h-4 text-emerald-400" /> Deploy This Script</span>
          <span className="text-xs text-muted-2">{showScript ? 'Hide' : 'Show'}</span>
        </button>

        {showScript && (
          <div className="space-y-3">
            <div className="bg-ink-800/40 rounded-xl p-4 space-y-2 text-xs text-muted">
              <div className="font-semibold text-ink-200 mb-2">Setup (3 steps):</div>
              <ol className="list-decimal list-inside space-y-1.5">
                <li>Go to <code className="text-electric-400">script.google.com</code>{' -> '}New project{' -> '}paste the script below{' -> '}set <code className="text-electric-400">NOTIFY_EMAIL</code> to your email{' -> '}Deploy{' -> '}Web app{' -> '}Execute as Me, Access: Anyone</li>
                <li>Copy the <code className="text-electric-400">/exec</code> URL from the deployment dialog</li>
                <li>Paste it into the input above and click "Send Test Ping"</li>
              </ol>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-2">Apps Script template (read-only)</span>
              <button onClick={copyScript} className="btn-ghost !text-xs flex items-center gap-1.5">
                {copied ? <><CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> Copied</> : <><Download className="w-3.5 h-3.5" /> Copy</>}
              </button>
            </div>
            <pre className="bg-ink-950 border border-white/[0.04] rounded-xl p-4 text-xs font-mono text-muted-2 overflow-x-auto max-h-96 overflow-y-auto leading-relaxed">{APPS_SCRIPT_TEMPLATE}</pre>
          </div>
        )}
      </div>
    </div>
  );
}
/* ──────────────────── Announcements Tab ──────────────────── */

function AnnouncementsTab({ password }: { password: string }) {
  const toast = useToast();
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [recent, setRecent] = useState<{ message: string; created_at: string }[]>([]);

  const loadRecent = useCallback(async () => {
    const { data } = await supabase.rpc('admin_get_recent_announcements', { p_password: password });
    setRecent((data || []) as { message: string; created_at: string }[]);
  }, [password]);

  useEffect(() => { loadRecent(); }, [loadRecent]);

  async function sendAnnouncement() {
    if (!message.trim()) return;
    setSending(true);
    const { data } = await supabase.rpc('admin_send_announcement', { p_password: password, p_message: message.trim() });
    if (data === true) {
      toast.success('Announcement sent to all users');
      setMessage('');
      loadRecent();
    } else {
      toast.error('Failed to send announcement');
    }
    setSending(false);
  }

  return (
    <div className="space-y-4">
      <div className="glass-card p-6">
        <h3 className="text-sm font-bold mb-4 flex items-center gap-2"><Megaphone className="w-4 h-4 text-electric-400" /> Send Platform Announcement</h3>
        <textarea value={message} onChange={(e) => setMessage(e.target.value)} className="input-field min-h-[80px] resize-none" placeholder="Type your announcement message..." />
        <button onClick={sendAnnouncement} disabled={sending || !message.trim()} className="btn-primary w-full mt-3 flex items-center justify-center gap-2">
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Megaphone className="w-4 h-4" />}
          {sending ? 'Sending...' : 'Send to All Users'}
        </button>
      </div>

      {recent.length > 0 && (
        <div className="glass-card p-4">
          <h3 className="text-xs font-bold text-muted-2 uppercase tracking-wider mb-3">Recent Announcements</h3>
          <div className="space-y-2">
            {recent.map((a, i) => (
              <div key={i} className="flex items-start gap-2 text-sm py-1.5">
                <Megaphone className="w-3.5 h-3.5 text-muted shrink-0 mt-0.5" />
                <span className="text-ink-200 flex-1">{a.message}</span>
                <span className="text-[10px] text-muted-2 shrink-0">{timeAgo(a.created_at)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ──────────────────── Analytics Tab ──────────────────── */

function AnalyticsTab({ password }: { password: string }) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase.rpc('admin_get_analytics', { p_password: password, p_days: days });
      if (data && !data.error) setData(data);
      setLoading(false);
    })();
  }, [password, days]);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-electric-400" /></div>;
  if (!data) return <EmptyState icon={TrendingUp} title="No analytics data" />;

  const charts = [
    { title: 'New Users', data: data.users_by_day, icon: Users, color: 'bg-electric-500' },
    { title: 'New Rooms', data: data.rooms_by_day, icon: DoorOpen, color: 'bg-magenta-500' },
    { title: 'Track Uploads', data: data.tracks_by_day, icon: Music, color: 'bg-emerald-500' },
    { title: 'Ad Impressions', data: data.impressions_by_day, icon: Eye, color: 'bg-orange-500' },
    { title: 'Game Plays', data: data.game_plays_by_day, icon: Zap, color: 'bg-violet-500' },
    { title: 'Listening Events', data: data.listening_by_day, icon: Activity, color: 'bg-sky-500' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {[7, 14, 30, 90].map((d) => (
          <button key={d} onClick={() => setDays(d)} className={cn('px-3 py-1.5 rounded-lg text-xs font-semibold transition-all', days === d ? 'bg-electric-600 text-white' : 'bg-ink-800/50 text-ink-400 hover:text-ink-200')}>
            {d} days
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {charts.map((c) => (
          <div key={c.title} className="glass-card p-5">
            <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
              <c.icon className="w-4 h-4 text-electric-400" /> {c.title}
            </h3>
            <MiniBarChart data={c.data} color={c.color} />
          </div>
        ))}
      </div>

      <div className="glass-card p-5">
        <h3 className="text-sm font-bold mb-3 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-electric-400" /> Summary Stats</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Total Plays', value: data.summary.total_plays, icon: Music },
            { label: 'Listening Events', value: data.summary.total_listening_events, icon: Activity },
            { label: 'Comments', value: data.summary.total_comments, icon: Activity },
            { label: 'Polls', value: data.summary.total_polls, icon: BarChart3 },
            { label: 'Game Sessions', value: data.summary.total_game_sessions, icon: Zap },
            { label: 'Jam Sessions', value: data.summary.total_jam_sessions, icon: Disc3 },
            { label: 'Ad Impressions', value: data.summary.total_ad_impressions, icon: Eye },
          ].map((s) => (
            <div key={s.label} className="bg-ink-800/50 rounded-lg p-3">
              <s.icon className="w-4 h-4 text-muted mb-1" />
              <div className="text-lg font-bold text-ink-100">{s.value.toLocaleString()}</div>
              <div className="text-[10px] text-muted-2 uppercase">{s.label}</div>
            </div>
          ))}
        </div>
        {data.summary.most_active_room && (
          <div className="mt-3 text-sm text-muted">Most active room: <span className="font-bold text-ink-200">{data.summary.most_active_room}</span></div>
        )}
        {data.summary.most_active_user && (
          <div className="mt-1 text-sm text-muted">Most active user: <span className="font-bold text-ink-200">{data.summary.most_active_user}</span></div>
        )}
      </div>
    </div>
  );
}

function MiniBarChart({ data, color }: { data: { date: string; count: number }[]; color: string }) {
  if (!data || data.length === 0) return <p className="text-sm text-muted">No data for this period.</p>;
  const max = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="flex items-end gap-1 h-24 group">
      {data.slice(-30).map((d, i) => (
        <div key={i} className="flex-1 group/bar relative flex flex-col items-center justify-end h-full" title={`${d.date}: ${d.count}`}>
          <div
            className={cn('w-full rounded-t transition-all hover:opacity-80', color)}
            style={{ height: `${(d.count / max) * 100}%`, minHeight: d.count > 0 ? '4px' : '0' }}
          />
          <div className="absolute -top-6 opacity-0 group-hover/bar:opacity-100 transition-opacity bg-ink-700 text-xs px-2 py-0.5 rounded whitespace-nowrap pointer-events-none z-10">
            {d.count} · {new Date(d.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ──────────────────── Logs Tab ──────────────────── */

function LogsTab({ password }: { password: string }) {
  const [logs, setLogs] = useState<ActivityLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [actionType, setActionType] = useState('');

  const load = useCallback(async (offset = 0, append = false) => {
    if (offset === 0) setLoading(true); else setLoadingMore(true);
    const { data } = await supabase.rpc('admin_get_activity_logs', {
      p_password: password,
      p_action_type: actionType || null,
      p_search: search || null,
      p_limit: 50,
      p_offset: offset,
    });
    if (data && !data.error) {
      setTotal(data.total || 0);
      setLogs((prev) => append ? [...prev, ...(data.logs || [])] : (data.logs || []));
    }
    setLoading(false);
    setLoadingMore(false);
  }, [password, search, actionType]);

  useEffect(() => { load(0); }, [load]);

  function doSearch(e: React.FormEvent) { e.preventDefault(); setSearch(searchInput); }

  async function exportLogs() {
    const { data } = await supabase.rpc('admin_export_data', { p_password: password, p_table_name: 'activity_logs' });
    downloadJSON(data, 'activity_logs.json');
  }

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-electric-400" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2">
        <form onSubmit={doSearch} className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input value={searchInput} onChange={(e) => setSearchInput(e.target.value)} className="input-field !pl-10" placeholder="Search logs..." />
        </form>
        <select value={actionType} onChange={(e) => setActionType(e.target.value)} className="input-field sm:w-48">
          <option value="">All actions</option>
          <option value="room_create">Room Create</option>
          <option value="track_upload">Track Upload</option>
          <option value="comment">Comment</option>
          <option value="poll_create">Poll Create</option>
          <option value="game_start">Game Start</option>
          <option value="jam_start">Jam Start</option>
          <option value="subscription">Subscription</option>
          <option value="user_join">User Join</option>
        </select>
        <button onClick={exportLogs} className="btn-ghost !text-xs flex items-center gap-1.5 whitespace-nowrap"><Download className="w-3.5 h-3.5" /> Export</button>
      </div>

      {logs.length === 0 ? (
        <EmptyState icon={ListChecks} title="No activity logs found" />
      ) : (
        <>
          <div className="space-y-1.5">
            {logs.map((log) => (
              <div key={log.id} className="glass-card p-3 flex items-start gap-3">
                <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center shrink-0', log.action_type?.includes('delete') ? 'bg-magenta-500/10' : 'bg-electric-500/10')}>
                  <Activity className={cn('w-3.5 h-3.5', log.action_type?.includes('delete') ? 'text-magenta-400' : 'text-electric-400')} />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm text-ink-200">{log.description}</span>
                  <div className="flex gap-2 mt-0.5 text-xs text-muted-2">
                    <span>{log.user_name || 'System'}</span>
                    {log.action_type && <span className="badge-muted !text-[9px] !px-1.5 !py-0">{log.action_type}</span>}
                    <span>{timeAgo(log.created_at)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {logs.length < total && (
            <button onClick={() => load(logs.length, true)} disabled={loadingMore} className="btn-ghost w-full flex items-center justify-center gap-2">
              {loadingMore ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronDown className="w-4 h-4" />}
              Load More ({logs.length} / {total})
            </button>
          )}
        </>
      )}
    </div>
  );
}

/* ──────────────────── Export Tab ──────────────────── */

function ExportTab({ password }: { password: string }) {
  const toast = useToast();
  const [exporting, setExporting] = useState<string | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    (async () => {
      const tables = ['users', 'rooms', 'tracks', 'subscriptions', 'ads', 'activity_logs'];
      const results: Record<string, number> = {};
      for (const t of tables) {
        const { data } = await supabase.rpc('admin_export_data', { p_password: password, p_table_name: t });
        if (data && !data.error) results[t] = (data as unknown[]).length;
      }
      setCounts(results);
    })();
  }, [password]);

  async function exportTable(tableName: string) {
    setExporting(tableName);
    const { data } = await supabase.rpc('admin_export_data', { p_password: password, p_table_name: tableName });
    if (data && !data.error) {
      downloadJSON(data, `${tableName}.json`);
      toast.success(`${tableName} exported`);
    } else {
      toast.error('Export failed');
    }
    setExporting(null);
  }

  async function exportAll() {
    setExporting('all');
    const tables = ['users', 'rooms', 'tracks', 'subscriptions', 'ads', 'activity_logs'];
    const allData: Record<string, unknown> = {};
    for (const t of tables) {
      const { data } = await supabase.rpc('admin_export_data', { p_password: password, p_table_name: t });
      if (data && !data.error) allData[t] = data;
    }
    downloadJSON(allData, 'full_export.json');
    toast.success('All data exported');
    setExporting(null);
  }

  const exportCards = [
    { name: 'users', label: 'Users', icon: Users, color: 'text-electric-400' },
    { name: 'rooms', label: 'Rooms', icon: DoorOpen, color: 'text-magenta-400' },
    { name: 'tracks', label: 'Tracks', icon: Music, color: 'text-emerald-400' },
    { name: 'subscriptions', label: 'Subscriptions', icon: Crown, color: 'text-amber-400' },
    { name: 'ads', label: 'Ads', icon: Megaphone, color: 'text-orange-400' },
    { name: 'activity_logs', label: 'Activity Logs', icon: ListChecks, color: 'text-sky-400' },
  ];

  return (
    <div className="space-y-4">
      <div className="glass-card p-5">
        <h3 className="text-sm font-bold mb-3 flex items-center gap-2"><FileDown className="w-4 h-4 text-electric-400" /> Export All Data</h3>
        <p className="text-sm text-muted mb-3">Download all platform data as a single JSON file.</p>
        <button onClick={exportAll} disabled={exporting === 'all'} className="btn-primary flex items-center gap-2">
          {exporting === 'all' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          Export Everything
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {exportCards.map((c) => (
          <div key={c.name} className="glass-card p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-ink-800/50 flex items-center justify-center shrink-0">
              <c.icon className={cn('w-5 h-5', c.color)} />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-sm font-semibold block">{c.label}</span>
              <span className="text-xs text-muted-2">{counts[c.name] ?? '—'} rows</span>
            </div>
            <button onClick={() => exportTable(c.name)} disabled={exporting === c.name} className="btn-ghost !text-xs flex items-center gap-1.5">
              {exporting === c.name ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              Export
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function downloadJSON(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/* ──────────────────── Bug Check Tab ──────────────────── */

function BugCheckTab({ password }: { password: string }) {
  const toast = useToast();
  const [results, setResults] = useState<BugResult[]>([]);
  const [allClear, setAllClear] = useState(false);
  const [loading, setLoading] = useState(true);
  const [fixing, setFixing] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.rpc('admin_bug_check', { p_password: password });
    if (data && !data.error) {
      setResults(data.results || []);
      setAllClear(data.all_clear || false);
    }
    setLoading(false);
  }, [password]);

  useEffect(() => { load(); }, [load]);

  async function fixIssue(issue: string) {
    setFixing(issue);
    const { data } = await supabase.rpc('admin_fix_bug', { p_password: password, p_issue: issue });
    if (data === true) {
      toast.success(`${issue} fixed`);
      load();
    } else {
      toast.error('Failed to fix issue');
    }
    setFixing(null);
  }

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-electric-400" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold flex items-center gap-2"><Bug className="w-4 h-4 text-electric-400" /> Data Integrity Checker</h3>
        <button onClick={load} className="btn-ghost !text-xs flex items-center gap-1.5"><Filter className="w-3.5 h-3.5" /> Re-run Check</button>
      </div>

      {allClear ? (
        <div className="glass-card p-8 text-center animate-fade-in">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-3">
            <CheckCheck className="w-7 h-7 text-emerald-400" />
          </div>
          <h3 className="text-base font-bold text-emerald-400">All Clear</h3>
          <p className="text-sm text-muted mt-1">No data integrity issues found.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {results.map((r, i) => (
            <div key={i} className={cn('glass-card p-4', r.severity === 'error' ? 'border-magenta-500/20' : 'border-amber-500/20')}>
              <div className="flex items-start gap-3">
                {r.severity === 'error' ? <AlertTriangle className="w-5 h-5 text-magenta-400 shrink-0 mt-0.5" /> : <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />}
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold">{r.title}</span>
                    <span className={cn('badge !text-[9px] !px-1.5 !py-0', r.severity === 'error' ? 'badge-red' : 'badge-gold')}>{r.severity}</span>
                    <span className="text-xs text-muted-2">{r.count} affected</span>
                  </div>
                  <p className="text-xs text-muted mt-1">{r.description}</p>
                </div>
                {r.fixable && (
                  <button onClick={() => fixIssue(r.title)} disabled={fixing === r.title} className="btn-ghost !text-xs flex items-center gap-1.5 shrink-0">
                    {fixing === r.title ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                    Fix
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ──────────────────── Settings Tab ──────────────────── */

function SettingsTab({ password }: { password: string }) {
  const toast = useToast();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [payments, setPayments] = useState<PaymentDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingPayment, setSavingPayment] = useState(false);

  const [showChangePw, setShowChangePw] = useState(false);
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showNewPw, setShowNewPw] = useState(false);
  const [changingPw, setChangingPw] = useState(false);

  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [editingPayment, setEditingPayment] = useState<PaymentDetails | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.rpc('admin_get_settings', { p_password: password });
      if (data && !data.error) {
        setSettings(data.settings as AppSettings);
        setPayments((data.payments || []) as PaymentDetails[]);
      }
      const { data: allPayments } = await supabase.rpc('admin_get_all_payment_details', { p_password: password });
      if (allPayments && !allPayments.error) setPayments(allPayments as PaymentDetails[]);
      setLoading(false);
    })();
  }, [password]);

  async function saveSettings() {
    if (!settings) return;
    setSaving(true);
    const { data } = await supabase.rpc('admin_save_settings', {
      p_password: password,
      p_max_rooms_free: settings.max_rooms_free,
      p_max_rooms_premium: settings.max_rooms_premium,
      p_premium_popup_copy: settings.premium_popup_copy,
    });
    if (data === true) toast.success('Settings published live'); else toast.error('Failed to save settings');
    setSaving(false);
  }

  async function changePassword() {
    if (!newPw.trim() || !confirmPw.trim()) { toast.error('Fill in all password fields'); return; }
    if (newPw !== confirmPw) { toast.error('New passwords do not match'); return; }
    if (newPw.length < 4) { toast.error('New password must be at least 4 characters'); return; }
    setChangingPw(true);
    const { data } = await supabase.rpc('admin_change_password', { p_password: password, p_new_password: newPw });
    if (data === true) {
      toast.success('Admin password changed successfully');
      setNewPw(''); setConfirmPw(''); setShowChangePw(false);
    } else {
      toast.error('Failed to change password');
    }
    setChangingPw(false);
  }

  async function savePayment(p: { bank_name: string; account_name: string; account_number: string; id?: string; routing_number: string; instructions: string; is_active: boolean; custom_heading: string; custom_subtext: string; footer_note: string }) {
    setSavingPayment(true);
    const { data } = await supabase.rpc('admin_save_payment_details', {
      p_password: password,
      p_bank_name: p.bank_name, p_account_name: p.account_name, p_account_number: p.account_number,
      p_id: p.id || null, p_routing_number: p.routing_number, p_instructions: p.instructions,
      p_is_active: p.is_active, p_custom_heading: p.custom_heading, p_custom_subtext: p.custom_subtext, p_footer_note: p.footer_note,
    });
    if (data === true) {
      toast.success('Payment details saved');
      setShowPaymentForm(false);
      setEditingPayment(null);
      const { data: allPayments } = await supabase.rpc('admin_get_all_payment_details', { p_password: password });
      if (allPayments && !allPayments.error) setPayments(allPayments as PaymentDetails[]);
    } else {
      toast.error('Failed to save payment details');
    }
    setSavingPayment(false);
  }

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-electric-400" /></div>;

  return (
    <div className="space-y-4">
      {/* App Settings */}
      {settings && (
        <div className="glass-card p-5 space-y-4">
          <h3 className="text-sm font-bold flex items-center gap-2"><Settings className="w-4 h-4 text-electric-400" /> App Settings</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-muted mb-1.5">Max Rooms (Free)</label>
              <input type="number" value={settings.max_rooms_free} onChange={(e) => setSettings({ ...settings, max_rooms_free: parseInt(e.target.value) || 0 })} className="input-field" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted mb-1.5">Max Rooms (Premium)</label>
              <input type="number" value={settings.max_rooms_premium} onChange={(e) => setSettings({ ...settings, max_rooms_premium: parseInt(e.target.value) || 0 })} className="input-field" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted mb-1.5">Premium Popup Title</label>
            <input value={settings.premium_popup_copy.title} onChange={(e) => setSettings({ ...settings, premium_popup_copy: { ...settings.premium_popup_copy, title: e.target.value } })} className="input-field" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted mb-1.5">Premium Popup Body</label>
            <textarea value={settings.premium_popup_copy.body} onChange={(e) => setSettings({ ...settings, premium_popup_copy: { ...settings.premium_popup_copy, body: e.target.value } })} className="input-field min-h-[60px] resize-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted mb-1.5">CTA Label</label>
            <input value={settings.premium_popup_copy.cta_label} onChange={(e) => setSettings({ ...settings, premium_popup_copy: { ...settings.premium_popup_copy, cta_label: e.target.value } })} className="input-field" />
          </div>
          <button onClick={saveSettings} disabled={saving} className="btn-primary flex items-center gap-2 disabled:opacity-50">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Settings className="w-4 h-4" />}
            Save & Publish Live
          </button>
        </div>
      )}

      {/* Payment Details */}
      <div className="glass-card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold flex items-center gap-2"><CreditCard className="w-4 h-4 text-emerald-400" /> Payment Details</h3>
          <button onClick={() => { setEditingPayment(null); setShowPaymentForm(true); }} className="btn-ghost !text-xs flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Add
          </button>
        </div>
        {payments.length === 0 ? (
          <p className="text-muted text-sm">No payment details configured. Add one so users can submit premium receipts.</p>
        ) : (
          payments.map((p) => (
            <div key={p.id} className="bg-ink-800/50 rounded-lg p-3 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">{p.bank_name}</span>
                <div className="flex items-center gap-2">
                  <span className={cn('badge !text-[9px]', p.is_active ? 'badge-green' : 'badge-muted')}>{p.is_active ? 'Active' : 'Inactive'}</span>
                  <button onClick={() => { setEditingPayment(p); setShowPaymentForm(true); }} className="p-1 rounded-lg text-muted hover:text-electric-400"><Edit3 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
              <p className="text-xs text-muted">{p.account_name} · {p.account_number}</p>
              {p.routing_number && <p className="text-xs text-muted-2">Routing: {p.routing_number}</p>}
              {p.instructions && <p className="text-xs text-muted-2">{p.instructions}</p>}
              {p.custom_heading && <p className="text-xs text-ink-200 mt-1">Heading: {p.custom_heading}</p>}
              {p.custom_subtext && <p className="text-xs text-muted">Subtext: {p.custom_subtext}</p>}
              {p.footer_note && <p className="text-xs text-muted-2">Footer: {p.footer_note}</p>}
            </div>
          ))
        )}
      </div>

      {/* Change Password */}
      <div className="glass-card p-5">
        <button onClick={() => setShowChangePw(!showChangePw)} className="w-full flex items-center justify-between text-sm font-bold">
          <span className="flex items-center gap-2"><KeyRound className="w-4 h-4 text-electric-400" /> Change Admin Password</span>
          <span className="text-xs text-muted-2">{showChangePw ? 'Cancel' : 'Change'}</span>
        </button>
        {showChangePw && (
          <div className="mt-4 space-y-3">
            <div>
              <label className="block text-xs font-semibold text-muted mb-1.5">New Password</label>
              <div className="relative">
                <input type={showNewPw ? 'text' : 'password'} value={newPw} onChange={(e) => setNewPw(e.target.value)} className="input-field !pr-10" placeholder="Enter new password" />
                <button type="button" onClick={() => setShowNewPw(!showNewPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink-200 transition-colors">
                  {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted mb-1.5">Confirm New Password</label>
              <input type={showNewPw ? 'text' : 'password'} value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} className="input-field" placeholder="Re-enter new password" />
            </div>
            <button onClick={changePassword} disabled={changingPw || !newPw.trim() || !confirmPw.trim()} className="btn-primary flex items-center gap-2 disabled:opacity-50">
              {changingPw ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
              Update Password
            </button>
          </div>
        )}
      </div>

      {/* Payment Form Modal */}
      {showPaymentForm && (
        <PaymentForm
          payment={editingPayment}
          saving={savingPayment}
          onClose={() => { setShowPaymentForm(false); setEditingPayment(null); }}
          onSave={savePayment}
        />
      )}
    </div>
  );
}

function PaymentForm({ payment, saving, onClose, onSave }: {
  payment: PaymentDetails | null;
  saving: boolean;
  onClose: () => void;
  onSave: (p: { bank_name: string; account_name: string; account_number: string; id?: string; routing_number: string; instructions: string; is_active: boolean; custom_heading: string; custom_subtext: string; footer_note: string }) => void;
}) {
  const [bankName, setBankName] = useState(payment?.bank_name || '');
  const [accountName, setAccountName] = useState(payment?.account_name || '');
  const [accountNumber, setAccountNumber] = useState(payment?.account_number || '');
  const [routingNumber, setRoutingNumber] = useState(payment?.routing_number || '');
  const [instructions, setInstructions] = useState(payment?.instructions || '');
  const [isActive, setIsActive] = useState(payment?.is_active ?? true);
  const [customHeading, setCustomHeading] = useState(payment?.custom_heading || 'Upgrade to Premium');
  const [customSubtext, setCustomSubtext] = useState(payment?.custom_subtext || 'Subscribe to unlock all premium features');
  const [footerNote, setFooterNote] = useState(payment?.footer_note || '');

  function handleSave() {
    if (!bankName.trim() || !accountName.trim() || !accountNumber.trim()) return;
    onSave({
      bank_name: bankName, account_name: accountName, account_number: accountNumber,
      id: payment?.id, routing_number: routingNumber, instructions, is_active: isActive,
      custom_heading: customHeading, custom_subtext: customSubtext, footer_note: footerNote,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto" onClick={onClose}>
      <div className="glass-card p-6 max-w-lg w-full my-8 animate-scale-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold flex items-center gap-2"><CreditCard className="w-5 h-5 text-emerald-400" /> {payment ? 'Edit Payment Details' : 'Add Payment Details'}</h3>
          <button onClick={onClose} className="p-1 rounded-lg text-muted hover:text-ink-200"><X className="w-4 h-4" /></button>
        </div>
        <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
          <div>
            <label className="block text-xs font-semibold text-muted mb-1.5">Bank Name</label>
            <input value={bankName} onChange={(e) => setBankName(e.target.value)} className="input-field" placeholder="Bank name" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted mb-1.5">Account Name</label>
            <input value={accountName} onChange={(e) => setAccountName(e.target.value)} className="input-field" placeholder="Account holder name" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted mb-1.5">Account Number</label>
            <input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} className="input-field" placeholder="Account number" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted mb-1.5">Routing Number</label>
            <input value={routingNumber} onChange={(e) => setRoutingNumber(e.target.value)} className="input-field" placeholder="Routing number (optional)" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted mb-1.5">Instructions</label>
            <textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} className="input-field min-h-[60px] resize-none" placeholder="Payment instructions for users" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted mb-1.5">Custom Heading</label>
            <input value={customHeading} onChange={(e) => setCustomHeading(e.target.value)} className="input-field" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted mb-1.5">Custom Subtext</label>
            <input value={customSubtext} onChange={(e) => setCustomSubtext(e.target.value)} className="input-field" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted mb-1.5">Footer Note</label>
            <input value={footerNote} onChange={(e) => setFooterNote(e.target.value)} className="input-field" />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="w-4 h-4 rounded accent-emerald-500" />
            <span className="text-sm text-ink-200">Active (shown to users)</span>
          </label>
        </div>
        <button onClick={handleSave} disabled={saving || !bankName.trim() || !accountName.trim() || !accountNumber.trim()} className="btn-primary w-full mt-4 flex items-center justify-center gap-2 disabled:opacity-50">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
          {payment ? 'Update Payment Details' : 'Add Payment Details'}
        </button>
      </div>
    </div>
  );
}

