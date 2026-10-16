import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import './ManagerLayout.css';

const ManagerLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const links = [
  { to: '/manager/dashboard', label: 'Tổng quan', icon: '◫' },
  { to: '/manager/movies', label: 'Phim & thể loại', icon: '▣' },
  { to: '/manager/reviews', label: 'Quản lý bài đánh giá', icon: '✎' },
  { to: '/manager/cinemas', label: 'Rạp & phòng chiếu', icon: '⌂' },
  { to: '/manager/showtimes', label: 'Suất chiếu', icon: '◷' },
];
  const signOut = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="admin-container">
      <aside className="admin-sidebar">
       <Link to="/manager/dashboard" className="admin-brand"><span className="admin-brand-mark">C</span><span>CINEF<small>CONTROL ROOM</small></span></Link>
        <p className="admin-nav-caption">QUẢN LÝ VẬN HÀNH</p>
        <nav className="admin-nav" aria-label="Điều hướng quản trị">
          {links.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`admin-nav-link ${location.pathname === item.to ? 'active' : ''}`}
              aria-current={location.pathname === item.to ? 'page' : undefined}
            >
              <span aria-hidden="true">{item.icon}</span>{item.label}
            </Link>
            
          ))}
   
        </nav>
        <div className="admin-sidebar-bottom">
          <div className="admin-user-card"><span className="admin-avatar">{(user?.fullName || 'A').slice(0, 1).toUpperCase()}</span><span><strong>{user?.fullName || 'Quản trị viên'}</strong><small>MANAGER</small></span></div>
          <Link to="/profile" className="admin-nav-link">
  Hồ sơ cá nhân
</Link>
<Link to="/" className="admin-nav-link">
  ↗ &nbsp; Trải nghiệm khách hàng
</Link>
          <button type="button" className="admin-signout" onClick={signOut}>↪ <span>Đăng xuất</span></button>
        </div>
      </aside>
      <div className="admin-content-wrapper">
        <header className="admin-header">
          <div>
  <span className="admin-status-dot" />
  KHU VỰC VẬN HÀNH
  <span className="admin-header-divider">/</span>
  CINEF
</div>
          <span className="admin-header-date">{new Intl.DateTimeFormat('vi-VN', { dateStyle: 'full' }).format(new Date())}</span>
        </header>
        <main className="admin-main-content"><Outlet /></main>
      </div>
    </div>
  );
};

export default ManagerLayout;