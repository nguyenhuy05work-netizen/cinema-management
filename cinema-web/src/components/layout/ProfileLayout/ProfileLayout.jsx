
import { Link, Outlet } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import './ProfileLayout.css';

const ProfileLayout = () => {
  const { hasRole } = useAuth();

  const backPath = hasRole('ADMIN')
    ? '/admin/role-permissions'
    : hasRole('MANAGER')
      ? '/manager/dashboard'
      : '/';

  return (
    <div className="profile-layout">
      <header className="profile-layout-header">
        <Link to="/" className="profile-layout-brand">
          <span className="profile-layout-logo">C</span>
          <span>
            <strong>CINEF</strong>
            <small>ACCOUNT CENTER</small>
          </span>
        </Link>

        <nav className="profile-layout-navigation">
          <Link to={backPath}>
            ← Quay lại khu vực của tôi
          </Link>

          <Link to="/">
            Trải nghiệm khách hàng ↗
          </Link>
        </nav>
      </header>

      <main className="profile-layout-main">
        <Outlet />
      </main>
    </div>
  );
};

export default ProfileLayout;
