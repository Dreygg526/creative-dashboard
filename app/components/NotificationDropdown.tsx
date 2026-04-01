import { Notification } from "../types";

interface Props {
  notifications: Notification[];
  currentUser: string;
  unreadCount: number;
  onRead: (n: Notification) => void;
  onClearAll: () => void;
}

export default function NotificationDropdown({ notifications, currentUser, unreadCount, onRead, onClearAll }: Props) {
  return (
    <div className="absolute right-0 mt-2 w-80 bg-[#2a2b2c] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden flex flex-col">
      <div className="p-3 border-b border-white/10 bg-white/5 text-xs font-bold uppercase tracking-wider text-slate-400 flex justify-between">
        <span>Inbox</span><span>{currentUser}</span>
      </div>
      <div className="max-h-96 overflow-y-auto">
        {notifications.length === 0
          ? <p className="p-6 text-sm text-slate-500 text-center italic">No notifications</p>
          : notifications.map(n => (
            <div
              key={n.id}
              onClick={() => onRead(n)}
              className={`p-4 border-b border-white/5 text-sm cursor-pointer hover:bg-white/5 transition-colors ${!n.is_read ? "bg-indigo-500/10" : "opacity-60"}`}
            >
              <p className="text-slate-200 font-medium">{n.message}</p>
              <p className="text-[10px] text-slate-500 mt-1">{new Date(n.created_at).toLocaleTimeString()}</p>
            </div>
          ))
        }
      </div>
      {unreadCount > 0 && (
        <button onClick={onClearAll} className="w-full py-2.5 text-xs font-bold text-indigo-400 bg-white/5 border-t border-white/10 hover:bg-white/10 transition-colors">
          Clear All
        </button>
      )}
    </div>
  );
}