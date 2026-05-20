import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Layout from "./components/layout/Layout";
import { Toaster } from "react-hot-toast";
import { OrderNotificationProvider } from "./context/OrderNotificationContext";
import { useAuth } from "./context/AuthContext";

import AdminLogin from "./pages/auth/AdminLogin";
import RestaurantLogin from "./pages/auth/RestaurantLogin";
import Register from "./pages/auth/Register";

import Dashboard from "./pages/dashboard/Dashboard";
import CustomersList from "./pages/customers/CustomersList";
import CustomerDetails from "./pages/customers/CustomerDetails";
import RestaurantsList from "./pages/restaurants/RestaurantsList";
import RestaurantDetails from "./pages/restaurants/RestaurantDetails";
import DeliveryPartnersList from "./pages/delivery-partners/DeliveryPartnersList";
import DeliveryPartnerDetails from "./pages/delivery-partners/DeliveryPartnerDetails";
import AttendanceLog from "./pages/delivery-partners/AttendanceLog";
import OrdersList from "./pages/orders/OrdersList";
import OrderDetails from "./pages/orders/OrderDetails";
import BookingsList from "./pages/bookings/BookingsList";
import BookingDetails from "./pages/bookings/BookingDetails";
import EventApprovalList from "./pages/bookings/EventApprovalList";
import EventApprovalDetails from "./pages/bookings/EventApprovalDetails";
import OffersList from "./pages/offers/OffersList";
import OfferDetails from "./pages/offers/OfferDetails";
import OfferConfiguration from "./pages/offers/OfferConfiguration";
import ExistingOffers from "./pages/offers/ExistingOffers";
import OfferEdit from "./pages/offers/OfferEdit";
import AdminOfferDetails from "./pages/offers/AdminOfferDetails";
import LiveTracking from "./pages/live-tracking/LiveTracking";
import AnalyticsDashboard from "./pages/analytics/AnalyticsDashboard";
import Settings from "./pages/settings/Settings";
import CuisineList from "./pages/cuisine/CuisineList";
import CouponManagement from "./pages/coupon/CouponManagement";
import SubscriptionManagement from "./pages/subscription/SubscriptionManagement";
import MenuManagement from "./pages/menu/MenuManagement";
import MenuDetails from "./pages/menu/MenuDetails";
import CategoryItems from "./pages/menu/CategoryItems";
import AddEditDish from "./pages/menu/AddEditDish";
import AddMenu from "./pages/menu/AddMenu";
import EditMenu from "./pages/menu/EditMenu";
import BulkUploadMenu from "./pages/menu/BulkUploadMenu";
import AddDining from "./pages/dining/AddDining";
import AddEvent from "./pages/events/AddEvent";
import BannerManagement from "./pages/banners/BannerManagement";
import AdminGuard from "./components/layout/AdminGuard";
import RestaurantGuard from "./components/layout/RestaurantGuard";
import ActivityLog from "./pages/activity/ActivityLog";
import RestaurantDashboard from "./pages/restaurant-dashboard/RestaurantDashboard";
import RestaurantMenu from "./pages/restaurant-dashboard/RestaurantMenu";

function App() {
  const { logout, user } = useAuth();

  const handleLogout = async () => {
    await logout();
    const role = user?.role;
    if (role === 'RESTAURANT_ADMIN' || role === '2') {
      window.location.href = "/restaurant/login";
    } else {
      window.location.href = "/admin/login";
    }
  };

  return (
    <Router>
      <Toaster position="top-right" />
      <Routes>
        {/* Public login pages */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/restaurant/login" element={<RestaurantLogin />} />
        <Route path="/login" element={<Navigate to="/admin/login" replace />} />
        <Route path="/register" element={<Register />} />

        {/* Super Admin routes */}
        <Route element={<AdminGuard />}>
          <Route element={<OrderNotificationProvider><Layout onLogout={handleLogout} /></OrderNotificationProvider>}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/activity-log" element={<ActivityLog />} />

            <Route path="/customers" element={<CustomersList />} />
            <Route path="/customers/:id" element={<CustomerDetails />} />

            <Route path="/restaurants" element={<RestaurantsList />} />
            <Route path="/restaurants/:uid" element={<RestaurantDetails />} />

            <Route path="/delivery-partners" element={<DeliveryPartnersList />} />
            <Route path="/delivery-partners/:id" element={<DeliveryPartnerDetails />} />
            <Route path="/delivery-partners/:partnerId/attendance" element={<AttendanceLog />} />

            <Route path="/orders" element={<OrdersList />} />
            <Route path="/orders/:orderId" element={<OrderDetails />} />

            <Route path="/bookings/approval" element={<EventApprovalList />} />
            <Route path="/events/approval/:id" element={<EventApprovalDetails />} />
            <Route path="/bookings" element={<BookingsList />} />
            <Route path="/bookings/:id" element={<BookingDetails />} />

            <Route path="/offers" element={<OffersList />} />
            <Route path="/offers/create" element={<OfferConfiguration />} />
            <Route path="/offers/existing" element={<ExistingOffers />} />
            <Route path="/offers/:id" element={<OfferDetails />} />
            <Route path="/offers/edit/:id" element={<OfferEdit />} />
            <Route path="/offers/admin/:id" element={<AdminOfferDetails />} />

            <Route path="/coupon" element={<CouponManagement />} />
            <Route path="/menu" element={<MenuManagement />} />
            <Route path="/menu/view/:menuUid" element={<MenuDetails />} />
            <Route path="/menu/categories/:restaurantId/items/:categoryId" element={<CategoryItems />} />
            <Route path="/menu/categories/:restaurantId/items/:categoryId/add" element={<AddEditDish />} />
            <Route path="/menu/categories/:restaurantId/items/:categoryId/edit/:dishId" element={<AddEditDish />} />
            <Route path="/live-tracking" element={<LiveTracking />} />
            <Route path="/analytics" element={<AnalyticsDashboard />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/cuisine" element={<CuisineList />} />
            <Route path="/banners" element={<BannerManagement />} />
            <Route path="/menu/add" element={<AddMenu />} />
            <Route path="/menu/bulk-upload" element={<BulkUploadMenu />} />
            <Route path="/menu/edit/:menuUid" element={<EditMenu />} />
            <Route path="/dining/add" element={<AddDining />} />
            <Route path="/events/add" element={<AddEvent />} />
            <Route path="/subscription" element={<SubscriptionManagement />} />

            <Route path="/" element={<Navigate to="/dashboard" />} />
          </Route>
        </Route>

        {/* Restaurant Admin routes */}
        <Route element={<RestaurantGuard />}>
          <Route element={<Layout onLogout={handleLogout} />}>
            <Route path="/restaurant/dashboard" element={<RestaurantDashboard />} />
            <Route path="/restaurant/restaurants" element={<RestaurantsList />} />
            <Route path="/restaurant/restaurants/:uid" element={<RestaurantDetails />} />
            <Route path="/restaurant/delivery-partners" element={<DeliveryPartnersList />} />
            <Route path="/restaurant/delivery-partners/:id" element={<DeliveryPartnerDetails />} />
            <Route path="/restaurant/delivery-partners/:partnerId/attendance" element={<AttendanceLog />} />
            <Route path="/restaurant/live-tracking" element={<LiveTracking />} />
            <Route path="/restaurant/orders" element={<OrdersList />} />
            <Route path="/restaurant/orders/:orderId" element={<OrderDetails />} />
            <Route path="/restaurant/menu" element={<RestaurantMenu />} />
            <Route path="/restaurant/menu/add" element={<AddMenu />} />
            <Route path="/restaurant/menu/edit/:menuUid" element={<EditMenu />} />
            <Route path="/restaurant/offers" element={<OffersList />} />
            <Route path="/restaurant/offers/:id" element={<OfferDetails />} />
            <Route path="/restaurant/bookings/approval" element={<EventApprovalList />} />
            <Route path="/restaurant/events/approval/:id" element={<EventApprovalDetails />} />
            <Route path="/restaurant/bookings" element={<BookingsList />} />
            <Route path="/restaurant/bookings/:id" element={<BookingDetails />} />
            <Route path="/restaurant/dining/add" element={<AddDining />} />
            <Route path="/restaurant/events/add" element={<AddEvent />} />
            <Route path="/restaurant" element={<Navigate to="/restaurant/dashboard" />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/admin/login" />} />
      </Routes>
    </Router>
  );
}

export default App;
