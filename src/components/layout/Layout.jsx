import Sidebar from './Sidebar';
import Header from './Header';
import { Outlet } from 'react-router-dom';
import NotificationPopup from '../ui/NotificationPopup';
import { useOrderNotifications } from '../../context/OrderNotificationContext';

const Layout = ({ onLogout }) => {
  const { popupQueue, dismissPopup } = useOrderNotifications();

  return (
    <div className="flex h-screen bg-gray-50/80">
      <Sidebar isOpen={true} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header onLogout={onLogout} />

        <main className="flex-1 overflow-y-auto">
          <div className="animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Global in-app notification popups — rendered outside main scroll area */}
      <NotificationPopup popups={popupQueue} onDismiss={dismissPopup} />
    </div>
  );
};

export default Layout;
