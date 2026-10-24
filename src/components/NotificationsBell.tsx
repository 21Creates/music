import { useNotifications } from '@/context/NotificationsContext';
import { useRoute, navigate } from '@/hooks/useRoute';
import { timeAgo } from '@/lib/utils';
import { Bell, CheckCheck, MessageSquare, Heart, Vote, Gamepad2, UserPlus, Crown, Megaphone, Mail } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

const iconMap: Record<string, typeof Bell> = {
  comment_on_track: MessageSquare,
  reply_to_comment: MessageSquare,
  jam_started: Heart,
  poll_created: Vote,
  game_created: Gamepad2,
  member_joined: UserPlus,
  join_request: UserPlus,
  premium_approved: Crown,
  premium_rejected: Crown,
  mention: Mail,
  chat_message: MessageSquare,
  announcement: Megaphone,
};

export default function NotificationsBell() {
  const { notifications, unreadCount, markRead, markAllRead, loading } = useNotifications();
  const route = useRoute();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleClick = (notif: typeof notifications[0]) => {
    markRead(notif.id);
    if (notif.room_id) navigate(`/room?roomId=${notif.room_id}`);
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="btn-icon relative"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 bg-magenta-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-scale-in">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] glass-panel rounded-2xl shadow-2xl z-[150] animate-slide-down overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
            <h3 className="font-semibold text-sm">Notifications</h3>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-xs text-electric-400 hover:text-electric-300 flex items-center gap-1">
                <CheckCheck className="w-3.5 h-3.5" /> Mark all read
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto scrollbar-hide">
            {loading && notifications.length === 0 ? (
              <div className="p-8 text-center text-muted text-sm">Loading...</div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-muted text-sm">No notifications yet</div>
            ) : (
              notifications.map((n) => {
                const Icon = iconMap[n.type] || Bell;
                return (
                  <button
                    key={n.id}
                    onClick={() => handleClick(n)}
                    className={`w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-white/[0.03] transition-colors border-b border-white/[0.03] ${!n.is_read ? 'bg-electric-500/[0.05]' : ''}`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${!n.is_read ? 'bg-electric-500/15 text-electric-400' : 'bg-ink-800 text-muted'}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-ink-100 line-clamp-2">{n.message}</p>
                      <span className="text-xs text-muted-2">{timeAgo(n.created_at)}</span>
                    </div>
                    {!n.is_read && <div className="w-2 h-2 rounded-full bg-electric-500 shrink-0 mt-1.5" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
