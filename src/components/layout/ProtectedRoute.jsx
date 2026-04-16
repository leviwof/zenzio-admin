import { Navigate, Outlet } from "react-router-dom";

const ProtectedRoute = () => {
  const adminId = localStorage.getItem("adminId");

  if (!adminId) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
