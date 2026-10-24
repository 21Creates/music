import { useAuth } from '@/context/AuthContext';
import { usePremium } from '@/context/PremiumContext';
import { useRoute, navigate } from '@/hooks/useRoute';
import { usePlayer } from '@/hooks/usePlayer';
import NotificationsBell from './NotificationsBell';
import { Disc3, Home, Compass, User, Crown, LogOut, Download } from 'lucide-react';
import { initials, avatarColor } from '@/lib/utils';
import { useState } from 'react';

const navItems = [
  { path: '/', label: 'Discover', icon: Home },
  { path: '/offline', label: 'Offline Library', icon: Download },
  { path: '/profile', label: 'Profile', icon: User },
];

export default function Sidebar() {
  const { user, signOut } = useAuth();
  const { isPremium } = usePremium();
  const route = useRoute();
  const { stop } = usePlayer();
  const [showMenu, setShowMenu] = useState(false);

  const handleSignOut = async () => {
    stop();
    await signOut();
  };

  return (
    <aside className="hidden md:flex flex-col w-60 shrink-0 bg-ink-900 border-r border-white/[0.04] h-screen sticky top-0">
      <div className="px-5 py-5 flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-electric-500 to-electric-700 flex items-center justify-center shadow-lg shadow-electric-500/20">
          <Disc3 className="w-5 h-5 text-white animate-spin-slow" />
        </div>
        <span className="text-lg font-bold tracking-tight">Vinyl</span>
      </div>

      <nav className="flex-1 px-3 py-2 space-y-1">
        {navItems.map((item) => {
          const active = route.path === item.path;
          const Icon = item.icon;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${active ? 'bg-electric-500/10 text-electric-400' : 'text-ink-300 hover:text-ink-100 hover:bg-white/[0.04]'}`}
            >
              <Icon className="w-5 h-5 shrink-0" />
              {item.label}
              {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-electric-400" />}
            </button>
          );
        })}
      </nav>

      <div className="px-3 py-3 border-t border-white/[0.04] space-y-2">
        <NotificationsBell />
        {!isPremium && (
          <button
            onClick={() => navigate('/profile')}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-amber-400 hover:bg-amber-500/10 transition-all"
          >
            <Crown className="w-5 h-5" />
            Go Premium
          </button>
        )}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.04] transition-all"
          >
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt="" className="w-8 h-8 rounded-lg object-cover" />
            ) : (
              <div className={`w-8 h-8 rounded-lg ${avatarColor(user?.id || '')} flex items-center justify-center text-xs font-bold text-white`}>
                {initials(user?.display_name || '?')}
              </div>
            )}
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-medium truncate">{user?.display_name}</p>
              <p className="text-xs text-muted truncate">{isPremium ? 'Premium' : 'Free'}</p>
            </div>
          </button>
          {showMenu && (
            <div className="absolute bottom-full left-0 right-0 mb-1 glass-panel rounded-xl shadow-xl overflow-hidden animate-slide-up">
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-magenta-400 hover:bg-magenta-500/10 transition-colors"
              >
                <LogOut className="w-4 h-4" /> Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
