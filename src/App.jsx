import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Layout from "./components/layout/Layout";
import { Toaster } from "react-hot-toast";

import Login from "./pages/auth/Login";
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
import ProtectedRoute from "./components/layout/ProtectedRoute";

import ActivityLog from "./pages/activity/ActivityLog";

function App() {
  const handleLogout = async () => {
    await fetch("/auth/logout", { credentials: "include" });
    localStorage.clear();
    window.location.href = "/login";
  };


  return (
    <Router>
      <Toaster position="top-right" />
      <Routes>
        {}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {}
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout onLogout={handleLogout} />}>
            <Route path="/dashboard" element={<Dashboard />} />

            <Route path="/activity-log" element={<ActivityLog />} />

            <Route path="/customers" element={<CustomersList />} />
            <Route path="/customers/:id" element={<CustomerDetails />} />

            <Route path="/restaurants" element={<RestaurantsList />} />
            <Route path="/restaurants/:uid" element={<RestaurantDetails />} />

            <Route
              path="/delivery-partners"
              element={<DeliveryPartnersList />}
            />
            <Route
              path="/delivery-partners/:id"
              element={<DeliveryPartnerDetails />}
            />
            <Route
              path="/delivery-partners/:partnerId/attendance"
              element={<AttendanceLog />}
            />

            <Route path="/orders" element={<OrdersList />} />
            <Route path="/orders/:orderId" element={<OrderDetails />} />

            {}

            <Route path="/bookings/approval" element={<EventApprovalList />} />
            <Route
              path="/events/approval/:id"
              element={<EventApprovalDetails />}
            />

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
            <Route
              path="/menu/categories/:restaurantId/items/:categoryId"
              element={<CategoryItems />}
            />
            <Route
              path="/menu/categories/:restaurantId/items/:categoryId/add"
              element={<AddEditDish />}
            />
            <Route
              path="/menu/categories/:restaurantId/items/:categoryId/edit/:dishId"
              element={<AddEditDish />}
            />

            <Route path="/live-tracking" element={<LiveTracking />} />

            <Route path="/analytics" element={<AnalyticsDashboard />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/cuisine" element={<CuisineList />} />
            <Route path="/banners" element={<BannerManagement />} />

            {/* Menu & Others */}
            <Route path="/menu/add" element={<AddMenu />} />
            <Route path="/menu/bulk-upload" element={<BulkUploadMenu />} />
            <Route path="/menu/edit/:menuUid" element={<EditMenu />} />
            <Route path="/dining/add" element={<AddDining />} />
            <Route path="/events/add" element={<AddEvent />} />

            <Route path="/" element={<Navigate to="/dashboard" />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </Router>
  );
}

export default App;
