import { Navigate, Outlet } from "react-router-dom";
import { canAccessRoute } from "../../utils/auth";

const ProtectedRoute = ({ allowedRoles, fallback = "/dashboard" }) => {
  const adminId = localStorage.getItem("adminId");

  if (!adminId) {
    return <Navigate to="/login" replace />;
  }

  if (!canAccessRoute(allowedRoles)) {
    return <Navigate to={fallback} replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
