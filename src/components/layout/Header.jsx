import React from 'react';
import { Menu, Bell, LogOut, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getNotifications, markNotificationAsRead } from '../../services/api';

const Header = ({ onToggleSidebar, onLogout }) => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = React.useState([]);
  const [showDropdown, setShowDropdown] = React.useState(false);
  const [unreadCount, setUnreadCount] = React.useState(0);

  const fetchNotifications = async () => {
    try {
      // Fetch enough to filter locally, though ideally API should support filtering
      const response = await getNotifications(1, 20);
      const docs = response.data?.data || [];

      const unread = docs.filter(n => !n.isRead);
      setUnreadCount(unread.length);

      // Show only unread in dropdown, max 5
      setNotifications(unread.slice(0, 5));
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  };

  React.useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000); // Poll faster
    return () => clearInterval(interval);
  }, []);

  const handleMarkAsRead = async (id) => {
    try {
      await markNotificationAsRead(id);
      // Remove from local list immediately to "disappear" it
      setNotifications(prev => prev.filter(n => n.id !== id));
      setUnreadCount(prev => Math.max(0, prev - 1));

      // Optionally refetch to fill the gap
      fetchNotifications();
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
      <button onClick={onToggleSidebar} className="text-gray-600 hover:text-gray-900">
        <Menu size={24} />
      </button>

      <div className="flex items-center space-x-4">
        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className={`relative p-2 rounded-full hover:bg-gray-100 transition-colors ${showDropdown ? 'bg-gray-100' : ''}`}
          >
            <Bell size={20} className="text-gray-600" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center font-bold">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showDropdown && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                <span className="font-bold text-sm text-gray-800">Notifications</span>
                {unreadCount > 0 && <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">{unreadCount} New</span>}
              </div>
              <div className="max-h-96 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-gray-500 italic">
                    No new notifications
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      className="px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors group bg-blue-50/30"
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex-1">
                          <p className="text-sm font-bold text-gray-900">
                            {notif.title}
                          </p>
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                            {notif.body}
                          </p>
                          <p className="text-[10px] text-gray-400 mt-2">
                            {new Date(notif.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleMarkAsRead(notif.id); }}
                          className="p-1 text-gray-400 hover:text-green-500 transition-colors"
                          title="Mark as read"
                        >
                          <Check size={14} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="px-4 py-2 border-t border-gray-100 bg-gray-50 text-center">
                <button
                  onClick={() => {
                    setShowDropdown(false);
                    navigate('/activity-log');
                  }}
                  className="text-[11px] font-bold text-red-500 hover:text-red-600 uppercase tracking-widest"
                >
                  View All Activity
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-white font-bold">
            A
          </div>
          <span className="font-medium">Admin</span>
        </div>

        <button
          onClick={onLogout}
          className="text-gray-600 hover:text-red-500 flex items-center space-x-1"
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
};

export default Header;