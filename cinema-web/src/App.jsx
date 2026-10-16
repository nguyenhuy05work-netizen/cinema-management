
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';

import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './routes/ProtectedRoute';

import MainLayout from './components/layout/MainLayout/MainLayout';
import AdminLayout from './components/layout/AdminLayout/AdminLayout';

import LoginPage from './features/auth/pages/LoginPage';
import RegisterPage from './features/auth/pages/RegisterPage';

import ProfilePage from './features/user/pages/ProfilePage';
import UserManagementPage from './features/user/pages/UserManagementPage';
import NotificationsPage from './features/user/pages/NotificationsPage';

import MovieListPage from './features/movie/pages/MovieListPage';
import MovieDetailPage from './features/movie/pages/MovieDetailPage';

import CinemaListPage from './features/cinema/pages/CinemaListPage';
import CinemaShowtimesPage from './features/cinema/pages/CinemaShowtimesPage';

import ShowtimeDetailPage from './features/showtime/pages/ShowtimeDetailPage';

// Booking & VNPay
import CheckoutPage from './features/booking/pages/CheckoutPage';
import MyBookingsPage from './features/booking/pages/MyBookingsPage';
import TicketPage from './features/booking/pages/TicketPage';

// Admin
import AdminDashboardPage from './features/admin/pages/AdminDashboardPage';
import MovieManagementPage from './features/admin/pages/MovieManagementPage';
import CinemaManagementPage from './features/admin/pages/CinemaManagementPage';
import ShowtimeManagementPage from './features/admin/pages/ShowtimeManagementPage';

// Reviews
import ReviewsPage from './features/reviews/pages/ReviewsPage';
import ReviewDetailPage from './features/reviews/pages/ReviewDetailPage';
import ReviewManagementPage from './features/admin/pages/ReviewManagementPage';

// Services
import ServicesPage from './features/services/pages/ServicesPage';

import './experience.css';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>

          {/* GIAO DIỆN KHÁCH HÀNG */}
          <Route element={<MainLayout />}>

            <Route
              path="/"
              element={<MovieListPage />}
            />

            <Route
              path="/movies/:id"
              element={<MovieDetailPage />}
            />

            <Route
              path="/showtimes/:id"
              element={<ShowtimeDetailPage />}
            />

            <Route
              path="/cinemas"
              element={<CinemaListPage />}
            />

            <Route
              path="/cinemas/:id/showtimes"
              element={<CinemaShowtimesPage />}
            />

            {/* Reviews */}
            <Route
              path="/reviews"
              element={<ReviewsPage />}
            />

            <Route
              path="/reviews/movie/:movieId"
              element={<ReviewsPage />}
            />

            <Route
              path="/reviews/:id"
              element={<ReviewDetailPage />}
            />

            {/* Services */}
            <Route
              path="/services"
              element={<ServicesPage />}
            />

            {/* Authentication */}
            <Route
              path="/login"
              element={<LoginPage />}
            />

            <Route
              path="/register"
              element={<RegisterPage />}
            />

            <Route
              path="/profile"
              element={<ProfilePage />}
            />

            <Route
              path="/notifications"
              element={<NotificationsPage />}
            />

            {/* BOOKING - YÊU CẦU ĐĂNG NHẬP */}
            <Route element={<ProtectedRoute />}>

              <Route
                path="/checkout/:id"
                element={<CheckoutPage />}
              />

              <Route
                path="/tickets/:id"
                element={<TicketPage />}
              />

              <Route
                path="/bookings"
                element={<MyBookingsPage />}
              />

            </Route>

          </Route>

          {/* GIAO DIỆN ADMIN */}
          <Route
            element={
              <ProtectedRoute allowedRoles={['ADMIN']} />
            }
          >
            <Route element={<AdminLayout />}>

              <Route
                path="/admin"
                element={
                  <Navigate
                    to="/admin/dashboard"
                    replace
                  />
                }
              />

              <Route
                path="/admin/dashboard"
                element={<AdminDashboardPage />}
              />

              <Route
                path="/admin/movies"
                element={<MovieManagementPage />}
              />

              <Route
                path="/admin/reviews"
                element={<ReviewManagementPage />}
              />

              <Route
                path="/admin/cinemas"
                element={<CinemaManagementPage />}
              />

              <Route
                path="/admin/showtimes"
                element={<ShowtimeManagementPage />}
              />

              <Route
                path="/admin/users"
                element={<UserManagementPage />}
              />

            </Route>
          </Route>

          {/* ROUTE KHÔNG TỒN TẠI */}
          <Route
            path="*"
            element={<Navigate to="/" replace />}
          />

        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
