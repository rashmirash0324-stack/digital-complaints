import { Route, Routes } from "react-router-dom";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import ProtectedRoute from "./components/ProtectedRoute";
import ScrollToTop from "./components/ScrollToTop";
import SplashOverlay from "./components/SplashOverlay";
import MobileBottomNav from "./components/MobileBottomNav";

import Home from "./pages/Home";
import Login from "./pages/Login";
import OfficialLogin from "./pages/OfficialLogin";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import UserDashboard from "./pages/UserDashboard";
import StaffDashboard from "./pages/StaffDashboard";
import SubmitComplaint from "./pages/SubmitComplaint";
import MyComplaints from "./pages/MyComplaints";
import ComplaintDetails from "./pages/ComplaintDetails";
import TrackComplaint from "./pages/TrackComplaint";
import Profile from "./pages/Profile";
import Feedback from "./pages/Feedback";
import AdminDashboard from "./pages/AdminDashboard";
import ManageComplaints from "./pages/ManageComplaints";
import ManageUsers from "./pages/ManageUsers";
import NotFound from "./pages/NotFound";

function App() {
  return (
    <div className="app-shell">
      <SplashOverlay />
      <ScrollToTop />
      <Navbar />

      <main className="container">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/official-login" element={<OfficialLogin defaultRole="staff" />} />
          <Route path="/staff-login" element={<OfficialLogin defaultRole="staff" />} />
          <Route path="/admin-login" element={<OfficialLogin defaultRole="admin" />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          {/* Citizen Dashboard & Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute role="user">
                <UserDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/submit-complaint"
            element={
              <ProtectedRoute role="user">
                <SubmitComplaint />
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-complaints"
            element={
              <ProtectedRoute role="user">
                <MyComplaints />
              </ProtectedRoute>
            }
          />
          <Route
            path="/track-complaint"
            element={
              <ProtectedRoute role="user">
                <TrackComplaint />
              </ProtectedRoute>
            }
          />

          {/* Shared Authenticated Routes */}
          <Route
            path="/complaint/:id"
            element={
              <ProtectedRoute>
                <ComplaintDetails />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/feedback"
            element={
              <ProtectedRoute>
                <Feedback />
              </ProtectedRoute>
            }
          />

          {/* Staff Dashboard */}
          <Route
            path="/staff"
            element={
              <ProtectedRoute role="staff">
                <StaffDashboard />
              </ProtectedRoute>
            }
          />

          {/* Admin Dashboard & Management */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute role="admin">
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/manage-complaints"
            element={
              <ProtectedRoute role={["admin", "staff"]}>
                <ManageComplaints />
              </ProtectedRoute>
            }
          />
          <Route
            path="/manage-users"
            element={
              <ProtectedRoute role="admin">
                <ManageUsers />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>

      <Footer />
      <MobileBottomNav />
    </div>
  );
}

export default App;
