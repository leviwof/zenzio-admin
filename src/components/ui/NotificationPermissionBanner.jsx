import { useState } from 'react';
import { BellOff, X, ExternalLink } from 'lucide-react';
import { useOrderNotifications } from '../../context/OrderNotificationContext';
import { requestDesktopNotificationPermissionOnce, getPermissionState } from '../../services/desktopNotificationService';

/**
 * Shows a persistent warning banner when browser notification permission is denied.
 * Guides the admin to re-enable it from browser settings.
 *
 * Usage: Drop inside <Layout> (or any top-level authenticated component).
 *
 * Req #1: "If denied, show persistent warning banner"
 * Req #1: "Do not repeatedly ask once denied"
 */
export default function NotificationPermissionBanner() {
  const { permissionState } = useOrderNotifications();
  const [dismissed, setDismissed] = useState(false);

  // Show only when denied and not manually dismissed this session
  const shouldShow = !dismissed && (
    permissionState === 'denied' ||
    // Also catch the case where context hasn't mounted yet but browser is denied
    (permissionState === undefined && getPermissionState() === 'denied')
  );

  if (!shouldShow) return null;

  const openBrowserSettings = () => {
    // Chrome / Edge: clicking the lock icon in the address bar is the only way.
    // We can't programmatically open settings, so guide the user.
    window.open('chrome://settings/content/notifications', '_blank');
  };

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex items-center justify-between gap-3 z-50">
      <div className="flex items-center gap-2.5 min-w-0">
        <BellOff size={16} className="text-amber-600 shrink-0" />
        <p className="text-sm text-amber-800 font-medium truncate">
          Notifications are disabled. Enable notifications to receive real-time orders.
        </p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {/* Try requesting again — only works if user hasn't permanently denied */}
        <button
          onClick={() =>
            requestDesktopNotificationPermissionOnce({ fromUserGesture: true })
              .catch(() => {})
          }
          className="text-xs font-semibold text-amber-700 hover:text-amber-900 underline underline-offset-2 transition-colors"
        >
          Enable
        </button>

        {/* Open browser notification settings guide */}
        <a
          href="https://support.google.com/chrome/answer/3220216"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 hover:text-amber-800 transition-colors"
          title="How to enable notifications in Chrome"
        >
          How to fix
          <ExternalLink size={11} />
        </a>

        {/* Dismiss for this session */}
        <button
          onClick={() => setDismissed(true)}
          className="p-1 rounded text-amber-500 hover:text-amber-700 hover:bg-amber-100 transition-colors"
          aria-label="Dismiss"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
