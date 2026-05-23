import Sidebar from './Sidebar';
import Header from './Header';
import { Outlet } from 'react-router-dom';

const Layout = ({ onLogout }) => {
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
    </div>
  );
};

export default Layout;
