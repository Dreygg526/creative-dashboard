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
    <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-2xl shadow-xl z-50 overflow-hidden flex flex-col">
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <p className="text-xs font-black text-gray-800 uppercase tracking-widest">Inbox</p>
          <p className="text-[10px] text-gray-400 font-medium">{currentUser}</p>
        </div>
        {unreadCount > 0 && (
          <span className="bg-red-100 text-red-600 text-[10px] font-black px-2 py-0.5 rounded-full">{unreadCount} new</span>
        )}
      </div>
      <div className="max-h-96 overflow-y-auto">
        {notifications.length === 0
          ? <p className="p-6 text-sm text-gray-400 text-center font-medium">No notifications yet</p>
          : notifications.map(n => (
            <div
              key={n.id}
              onClick={() => onRead(n)}
              className={`p-4 border-b border-gray-50 text-sm cursor-pointer hover:bg-gray-50 transition-colors ${!n.is_read ? "bg-green-50" : ""}`}
            >
              <p className={`font-medium leading-snug ${!n.is_read ? "text-gray-800 font-bold" : "text-gray-500"}`}>{n.message}</p>
              <p className="text-[10px] text-gray-400 mt-1">{new Date(n.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
            </div>
          ))
        }
      </div>
      {unreadCount > 0 && (
        <button onClick={onClearAll} className="w-full py-3 text-xs font-black text-green-700 bg-gray-50 border-t border-gray-100 hover:bg-green-50 transition-colors">
          Clear All
        </button>
      )}
    </div>
  );
}