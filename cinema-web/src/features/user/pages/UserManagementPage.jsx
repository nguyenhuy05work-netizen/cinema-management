import { useState, useEffect } from 'react';
import { notificationApi, roleApi, userApi } from '../api/userApi';

const UserManagementPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  // States quản lý Drawer/Modal chỉnh sửa User
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({ status: '', roleName: '' });

  // States quản lý Modal gửi thông báo
  const [isNotifyOpen, setIsNotifyOpen] = useState(false);
  const [noticeUser, setNoticeUser] = useState(null);
  const [notice, setNotice] = useState({ title: '', content: '' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [userData, roleData] = await Promise.all([
        userApi.getAllUsers({ page: 0, size: 50, sort: 'createdAt,desc' }),
        roleApi.getAll().catch(() => []),
      ]);
      setUsers(userData?.content || userData || []);
      setRoles(roleData || []);
    } catch (error) {
      console.error('Lỗi khi tải dữ liệu:', error);
    } finally {
      setLoading(false);
    }
  };

  // Mở Drawer/Modal chỉnh sửa
  const handleEditClick = (user) => {
    setEditingUser(user);
    const currentRole = typeof user.roles?.[0] === 'object' ? user.roles[0].name : (user.roles?.[0] || 'ROLE_CUSTOMER');
    setFormData({ status: user.status || 'ACTIVE', roleName: currentRole });
  };

  // Lưu thông tin sau khi sửa
  const handleSaveUser = async (e) => {
    e.preventDefault();
    try {
      if (formData.status !== editingUser.status) {
        await userApi.updateStatus(editingUser.id, { status: formData.status });
      }
      if (formData.roleName) {
        await userApi.updateRoles(editingUser.id, { roleNames: [formData.roleName] });
      }
      
      // Cập nhật lại state local
      setUsers(users.map((u) => u.id === editingUser.id ? { ...u, status: formData.status, roles: [formData.roleName] } : u));
      setEditingUser(null);
      alert('Cập nhật người dùng thành công!');
    } catch (err) {
      alert('Có lỗi xảy ra khi cập nhật!');
    }
  };

  // Gửi thông báo
  const handleSendNotification = async (e) => {
    e.preventDefault();
    try {
      await notificationApi.create({
        ...notice,
        userId: noticeUser ? noticeUser.id : null,
      });
      alert('Đã gửi thông báo thành công!');
      setNotice({ title: '', content: '' });
      setIsNotifyOpen(false);
    } catch (err) {
      alert('Gửi thông báo thất bại!');
    }
  };

  const filteredUsers = users.filter((u) =>
    u.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="loading">Đang tải dữ liệu...</div>;

  return (
    <div className="admin-page">
      {/* Header */}
      <div className="admin-header">
        <div>
          <p className="eyebrow">IDENTITY & ACCESS</p>
          <h1>Quản lý người dùng</h1>
        </div>
        <button className="btn-primary" onClick={() => { setNoticeUser(null); setIsNotifyOpen(true); }}>
          Gửi thông báo toàn hệ thống
        </button>
      </div>

      {/* Toolbar / Search */}
      <div className="admin-toolbar">
        <input
          type="text"
          placeholder="Tìm kiếm theo tên hoặc email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
        <span>Tổng số: <strong>{filteredUsers.length}</strong> người dùng</span>
      </div>

      {/* Table gọn gàng, hiển thị Badges tĩnh */}
      <div className="table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Người dùng</th>
              <th>Trạng thái</th>
              <th>Vai trò</th>
              <th style={{ textAlign: 'right' }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((u) => {
              const roleName = typeof u.roles?.[0] === 'object' ? u.roles[0].name : (u.roles?.[0] || 'ROLE_CUSTOMER');
              return (
                <tr key={u.id}>
                  <td>#{u.id}</td>
                  <td>
                    <div className="user-info">
                      <strong>{u.fullName}</strong>
                      <small>{u.email}</small>
                    </div>
                  </td>
                  <td>
                    {/* Badge trạng thái thay vì Select */}
                    <span className={`badge status-${u.status?.toLowerCase()}`}>
                      {u.status || 'ACTIVE'}
                    </span>
                  </td>
                  <td>
                    {/* Badge vai trò */}
                    <span className="badge role-badge">{roleName}</span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="btn-icon" title="Gửi thông báo riêng" onClick={() => { setNoticeUser(u); setIsNotifyOpen(true); }}>
                      ✉️
                    </button>
                    <button className="btn-secondary" onClick={() => handleEditClick(u)}>
                      ✏️ Chỉnh sửa
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal/Drawer Chỉnh sửa User */}
      {editingUser && (
        <div className="modal-overlay" onClick={() => setEditingUser(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h3>Chỉnh sửa tài khoản: {editingUser.fullName}</h3>
            <form onSubmit={handleSaveUser}>
              <div className="form-group">
                <label>Trạng thái tài khoản</label>
                <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
                  <option value="ACTIVE">ACTIVE (Hoạt động)</option>
                  <option value="TEMPORARY_LOCKED">TEMPORARY_LOCKED (Tạm khóa)</option>
                  <option value="PERMANENT_LOCKED">PERMANENT_LOCKED (Khóa vĩnh viễn)</option>
                  <option value="PENDING_VERIFICATION">PENDING_VERIFICATION (Chờ xác thực)</option>
                </select>
              </div>

              <div className="form-group">
                <label>Vai trò (Role)</label>
                <select value={formData.roleName} onChange={(e) => setFormData({ ...formData, roleName: e.target.value })}>
                  {roles.map((r) => (
                    <option key={r.id || r.name} value={r.name}>{r.name}</option>
                  ))}
                </select>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setEditingUser(null)}>Hủy</button>
                <button type="submit" className="btn-primary">Lưu thay đổi</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Gửi thông báo */}
      {isNotifyOpen && (
        <div className="modal-overlay" onClick={() => setIsNotifyOpen(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h3>{noticeUser ? `Gửi thông báo tới ${noticeUser.fullName}` : 'Gửi thông báo cho TẤT CẢ người dùng'}</h3>
            <form onSubmit={handleSendNotification}>
              <div className="form-group">
                <label>Tiêu đề</label>
                <input type="text" value={notice.title} onChange={(e) => setNotice({ ...notice, title: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Nội dung</label>
                <textarea rows="4" value={notice.content} onChange={(e) => setNotice({ ...notice, content: e.target.value })} required />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setIsNotifyOpen(false)}>Hủy</button>
                <button type="submit" className="btn-primary">Gửi đi</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
    );
};

export default UserManagementPage;