import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useOfflineCache } from '@/hooks/useOfflineCache';
import { AuthProvider } from '@/context/AuthContext';
import { PremiumProvider } from '@/context/PremiumContext';
import { ToastProvider } from '@/context/ToastContext';
import { NotificationsProvider } from '@/context/NotificationsContext';
import { useRoute, navigate } from '@/hooks/useRoute';
import AuthScreen from '@/components/AuthScreen';
import Sidebar from '@/components/Sidebar';
import MobileNav from '@/components/MobileNav';
import MiniPlayer from '@/components/MiniPlayer';
import { NowPlayingView } from '@/components/NowPlayingView';
import HomePage from '@/pages/HomePage';
import RoomPage from '@/pages/RoomPage';
import ProfilePage from '@/pages/ProfilePage';
import AdminPage from '@/pages/AdminPage';
import OfflineScreen from '@/pages/OfflineScreen';
import { Loader2, Disc3, Compass } from 'lucide-react';
import InstallPrompt from '@/components/InstallPrompt';
import { useBackgroundPreload } from '@/hooks/useBackgroundPreload';

function AppContent() {
  const { user, loading } = useAuth();
  const route = useRoute();
  const [nowPlayingOpen, setNowPlayingOpen] = useState(false);
  useOfflineCache();
  useBackgroundPreload(user?.id);

  if (route.path === '/admin') return <AdminPage />;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ink-950">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-electric-500 to-electric-700 flex items-center justify-center shadow-xl shadow-electric-500/30 ambient-glow">
            <Disc3 className="w-7 h-7 text-white animate-spin-slow" />
          </div>
          <Loader2 className="w-5 h-5 animate-spin text-muted" />
        </div>
      </div>
    );
  }

  if (!user) return <AuthScreen />;

  return (
    <>
      <div className="min-h-screen flex bg-ink-950">
        <Sidebar />
        <div className="flex-1 min-w-0">
          <MobileNav />
          <main className="pt-14 md:pt-0 pb-[136px] md:pb-24">
            {route.path === '/' && <HomePage />}
            {route.path === '/room' && <RoomPage roomId={route.params.roomId} />}
            {route.path === '/profile' && <ProfilePage />}
            {route.path === '/offline' && <OfflineScreen />}
            {route.path === '/not-found' && (
              <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-center">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-electric-500/20 to-electric-700/20 flex items-center justify-center mb-4">
                  <Compass className="w-8 h-8 text-electric-400" />
                </div>
                <h1 className="text-2xl font-bold mb-2">Page not found</h1>
                <p className="text-muted text-sm mb-6">The page you're looking for doesn't exist or has moved.</p>
                <button onClick={() => navigate('/')} className="btn-primary flex items-center gap-2">
                  Back to Home
                </button>
              </div>
            )}
          </main>
        </div>
      </div>
      <MiniPlayer onExpand={() => setNowPlayingOpen(true)} />
      <NowPlayingView open={nowPlayingOpen} onClose={() => setNowPlayingOpen(false)} />
      <InstallPrompt />
    </>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <NotificationsProvider>
          <PremiumProvider>
            <AppContent />
          </PremiumProvider>
        </NotificationsProvider>
      </AuthProvider>
    </ToastProvider>
  );
}
