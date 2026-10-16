import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';

import MainLayout from './components/layout/MainLayout/MainLayout';
import ManagerLayout from './components/layout/ManagerLayout/ManagerLayout';
import AdminSystemLayout from './components/layout/AdminSystemLayout/AdminSystemLayout';
import RolePermissionManagementPage from './features/admin/pages/RolePermissionManagementPage';

import LoginPage from './features/auth/pages/LoginPage';
import RegisterPage from './features/auth/pages/RegisterPage';
import ProfilePage from './features/user/pages/ProfilePage';
import UserManagementPage from './features/user/pages/UserManagementPage';
import MovieListPage from './features/movie/pages/MovieListPage';
import MovieDetailPage from './features/movie/pages/MovieDetailPage';
import CinemaListPage from './features/cinema/pages/CinemaListPage';
import CinemaShowtimesPage from './features/cinema/pages/CinemaShowtimesPage';
import ShowtimeDetailPage from './features/showtime/pages/ShowtimeDetailPage';
import AdminDashboardPage from './features/admin/pages/AdminDashboardPage';
import MovieManagementPage from './features/admin/pages/MovieManagementPage';
import CinemaManagementPage from './features/admin/pages/CinemaManagementPage';
import ShowtimeManagementPage from './features/admin/pages/ShowtimeManagementPage';
import NotificationsPage from './features/user/pages/NotificationsPage';
import ProtectedRoute from './routes/ProtectedRoute';
import ReviewsPage from './features/reviews/pages/ReviewsPage';
import ReviewDetailPage from './features/reviews/pages/ReviewDetailPage';
import ReviewManagementPage from './features/admin/pages/ReviewManagementPage';
import ServicesPage from './features/services/pages/ServicesPage';
import './experience.css';
import ProfileLayout from './components/layout/ProfileLayout/ProfileLayout';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Giao diện dành cho Khách & User (Dùng MainLayout) */}
          <Route element={<MainLayout />}>
            <Route path="/" element={<MovieListPage />} />
            <Route path="/movies/:id" element={<MovieDetailPage />} />
            <Route path="/showtimes/:id" element={<ShowtimeDetailPage />} />
            <Route path="/cinemas" element={<CinemaListPage />} />
            <Route path="/cinemas/:id/showtimes" element={<CinemaShowtimesPage />} />
            <Route path="/reviews" element={<ReviewsPage />} />
            <Route path="/reviews/movie/:movieId" element={<ReviewsPage />} />
            <Route path="/reviews/:id" element={<ReviewDetailPage />} />
            <Route path="/services" element={<ServicesPage />} />

            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            <Route path="/notifications" element={<NotificationsPage />} />
          </Route>

          {/* HỒ SƠ CÁ NHÂN DÙNG CHUNG */}
<Route element={<ProtectedRoute />}>
  <Route element={<ProfileLayout />}>
    <Route
      path="/profile"
      element={<ProfilePage />}
    />
  </Route>
</Route>

          
          {/* KHU VỰC MANAGER */}
<Route element={<ProtectedRoute allowedRoles={['MANAGER']} />}>
  <Route element={<ManagerLayout />}>
    <Route
      path="/manager"
      element={<Navigate to="/manager/dashboard" replace />}
    />

    <Route
      path="/manager/dashboard"
      element={<AdminDashboardPage />}
    />

    <Route
      path="/manager/movies"
      element={<MovieManagementPage />}
    />

    <Route
      path="/manager/reviews"
      element={<ReviewManagementPage />}
    />

    <Route
      path="/manager/cinemas"
      element={<CinemaManagementPage />}
    />

    <Route
      path="/manager/showtimes"
      element={<ShowtimeManagementPage />}
    />
  </Route>
</Route>

{/* KHU VỰC ADMIN SYSTEM */}
<Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
  <Route element={<AdminSystemLayout />}>
    <Route
      path="/admin"
      element={
        <Navigate to="/admin/role-permissions" replace />
      }
    />

    <Route
      path="/admin/role-permissions"
      element={<RolePermissionManagementPage />}
    />

    <Route
      path="/admin/users"
      element={<UserManagementPage />}
    />
  </Route>
</Route>

          {/* Fallback route khi gõ sai đường dẫn */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;