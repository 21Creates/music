import { useRoute, navigate } from '@/hooks/useRoute';
import { useAuth } from '@/context/AuthContext';
import { usePremium } from '@/context/PremiumContext';
import NotificationsBell from './NotificationsBell';
import { Disc3, Home, Compass, User, Crown, Download } from 'lucide-react';
import { initials, avatarColor } from '@/lib/utils';

export default function MobileNav() {
  const route = useRoute();
  const { user } = useAuth();
  const { isPremium } = usePremium();

  const items = [
    { path: '/', label: 'Home', icon: Home },
    { path: '/offline', label: 'Offline', icon: Download },
    { path: '/profile', label: 'Profile', icon: User },
  ];

  return (
    <header className="md:hidden fixed top-0 left-0 right-0 z-[100] glass-panel border-b border-white/[0.04] safe-top">
      <div className="flex items-center justify-between px-4 h-14">
        <button onClick={() => navigate('/')} className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-electric-500 to-electric-700 flex items-center justify-center">
            <Disc3 className="w-4.5 h-4.5 text-white animate-spin-slow" />
          </div>
          <span className="text-base font-bold">Vinyl</span>
        </button>
        <div className="flex items-center gap-1">
          <NotificationsBell />
          {!isPremium && (
            <button onClick={() => navigate('/profile')} className="btn-icon-sm text-amber-400">
              <Crown className="w-5 h-5" />
            </button>
          )}
          <button onClick={() => navigate('/profile')} className="ml-1">
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt="" className="w-7 h-7 rounded-lg object-cover" />
            ) : (
              <div className={`w-7 h-7 rounded-lg ${avatarColor(user?.id || '')} flex items-center justify-center text-xs font-bold text-white`}>
                {initials(user?.display_name || '?')}
              </div>
            )}
          </button>
        </div>
      </div>
      <nav className="flex items-center justify-around px-4 pb-1">
        {items.map((item) => {
          const active = route.path === item.path;
          const Icon = item.icon;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center gap-0.5 py-1.5 px-4 rounded-lg transition-colors ${active ? 'text-electric-400' : 'text-muted'}`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </header>
  );
}
