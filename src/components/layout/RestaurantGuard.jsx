import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const RestaurantGuard = () => {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/restaurant/login" replace />;
  }

  if (user.role !== 'RESTAURANT_ADMIN' && user.role !== '2') {
    return <Navigate to="/restaurant/login" replace />;
  }

  return <Outlet />;
};

export default RestaurantGuard;
