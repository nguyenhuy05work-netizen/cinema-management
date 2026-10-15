import { useEffect, useState } from 'react';
import { notificationApi, roleApi, userApi } from '../api/userApi';
import './UserManagementPage.css';

const statusLabels = {
  ACTIVE: 'Đang hoạt động',
  TEMPORARY_LOCKED: 'Tạm khóa',
  PERMANENT_LOCKED: 'Đã khóa',
  PENDING_VERIFICATION: 'Chờ xác thực',
};

const formatRole = (role = '') => String(role).replace(/^ROLE_/, '').replaceAll('_', ' ');
const roleNameOf = (user) => {
  const role = user.roles?.[0];
  return typeof role === 'object' && role !== null ? role.name : role || 'ROLE_CUSTOMER';
};

export default function UserManagementPage() {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({ status: '', roleName: '' });
  const [isNotifyOpen, setIsNotifyOpen] = useState(false);
  const [noticeUser, setNoticeUser] = useState(null);
  const [notice, setNotice] = useState({ title: '', content: '' });
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [loadError, setLoadError] = useState('');

  const fetchData = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const [userData, roleData] = await Promise.all([
        userApi.getAllUsers({ page: 0, size: 50, sort: 'createdAt,desc' }),
        roleApi.getAll().catch(() => []),
      ]);
      const userList = userData?.content ?? userData ?? [];
      const roleList = roleData?.content ?? roleData ?? [];
      setUsers(Array.isArray(userList) ? userList : []);
      setRoles(Array.isArray(roleList) ? roleList : []);
    } catch (error) {
      console.error('Lỗi tải danh sách người dùng:', error);
      setLoadError('Không thể tải danh sách người dùng. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleEditClick = (user) => {
    setEditingUser(user);
    setFormData({ status: user.status || 'ACTIVE', roleName: roleNameOf(user) });
  };

  const handleSaveUser = async (event) => {
    event.preventDefault();
    if (!editingUser || saving) return;
    setSaving(true);
    try {
      if (formData.status !== editingUser.status) {
        await userApi.updateStatus(editingUser.id, { status: formData.status });
      }
      if (formData.roleName && formData.roleName !== roleNameOf(editingUser)) {
        await userApi.updateRoles(editingUser.id, { roleNames: [formData.roleName] });
      }
      await fetchData();
      setEditingUser(null);
      alert('Cập nhật người dùng thành công!');
    } catch (error) {
      console.error('Lỗi cập nhật người dùng:', error);
      alert('Có lỗi xảy ra khi cập nhật. Hãy tải lại danh sách để kiểm tra trạng thái.');
    } finally {
      setSaving(false);
    }
  };

  const openNotification = (user = null) => {
    setNoticeUser(user);
    setNotice({ title: '', content: '' });
    setIsNotifyOpen(true);
  };

  const handleSendNotification = async (event) => {
    event.preventDefault();
    if (sending) return;
    setSending(true);
    try {
      await notificationApi.create({
        title: notice.title.trim(),
        content: notice.content.trim(),
        userId: noticeUser ? noticeUser.id : null,
      });
      alert('Đã gửi thông báo thành công!');
      setNotice({ title: '', content: '' });
      setIsNotifyOpen(false);
    } catch (error) {
      console.error('Lỗi gửi thông báo:', error);
      alert('Gửi thông báo thất bại!');
    } finally {
      setSending(false);
    }
  };

  const query = searchTerm.trim().toLowerCase();
  const filteredUsers = users.filter((user) =>
    (user.fullName || '').toLowerCase().includes(query) ||
    (user.email || '').toLowerCase().includes(query)
  );

  if (loading) return <div className="loading">Đang tải dữ liệu...</div>;

  return (
    <div className="admin-page user-management-page">
      <div className="user-management-heading">
        <div>
          <p className="eyebrow">IDENTITY &amp; ACCESS</p>
          <h1>Khách hàng &amp; tài khoản</h1>
          <p>Theo dõi quyền truy cập, trạng thái thành viên và gửi thông báo từ một nơi.</p>
        </div>
        <button type="button" className="user-primary-button" onClick={() => openNotification()}>
          <span aria-hidden="true">✉</span> Gửi thông báo
        </button>
      </div>

      {loadError && <p className="form-error" role="alert">{loadError} <button type="button" onClick={fetchData}>Thử lại</button></p>}

      <div className="user-stats-grid">
        <article className="user-stat-card">
          <span className="user-stat-icon members">♙</span>
          <div><small>TÀI KHOẢN ĐANG HIỂN THỊ</small><strong>{filteredUsers.length}</strong><span>trên trang hiện tại</span></div>
        </article>
        <article className="user-stat-card">
          <span className="user-stat-icon active">✓</span>
          <div><small>ĐANG HOẠT ĐỘNG</small><strong>{filteredUsers.filter((user) => (user.status || 'ACTIVE') === 'ACTIVE').length}</strong><span>tài khoản sẵn sàng</span></div>
        </article>
        <article className="user-stat-card">
          <span className="user-stat-icon roles">◇</span>
          <div><small>VAI TRÒ HỆ THỐNG</small><strong>{roles.length}</strong><span>nhóm quyền khả dụng</span></div>
        </article>
      </div>

      <section className="user-directory">
        <div className="user-directory-toolbar">
          <div><p className="user-directory-kicker">DIRECTORY</p><h2>Danh sách tài khoản</h2></div>
          <label className="user-search">
            <span aria-hidden="true">⌕</span>
            <input type="search" placeholder="Tìm theo tên hoặc email" value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)} aria-label="Tìm người dùng theo tên hoặc email" />
            <kbd>⌕</kbd>
          </label>
        </div>
        <div className="user-table-wrap">
          <table className="user-table">
            <thead><tr><th>Người dùng</th><th>Trạng thái</th><th>Vai trò</th><th className="user-actions-heading">Thao tác</th></tr></thead>
            <tbody>
              {filteredUsers.map((user) => {
                const roleName = roleNameOf(user);
                const status = user.status || 'ACTIVE';
                const displayName = user.fullName || user.email || 'Người dùng';
                return (
                  <tr key={user.id}>
                    <td><div className="user-info">
                      <span className="user-table-avatar">{displayName.slice(0, 1).toUpperCase()}</span>
                      <span><strong>{user.fullName || 'Chưa cập nhật tên'}</strong><small>{user.email}</small></span>
                    </div></td>
                    <td><span className={`user-status-badge status-${status.toLowerCase()}`}><i />{statusLabels[status] || status.replaceAll('_', ' ')}</span></td>
                    <td><span className="user-role-badge"><i aria-hidden="true">◇</i>{formatRole(roleName)}</span></td>
                    <td className="user-row-actions">
                      <button type="button" className="user-icon-button" title={`Gửi thông báo tới ${displayName}`}
                        aria-label={`Gửi thông báo tới ${displayName}`} onClick={() => openNotification(user)}>✉</button>
                      <button type="button" className="user-edit-button" onClick={() => handleEditClick(user)}>Chỉnh sửa <span aria-hidden="true">↗</span></button>
                    </td>
                  </tr>
                );
              })}
              {!filteredUsers.length && <tr><td colSpan={4}><div className="user-empty-state"><span>⌕</span><strong>Không tìm thấy tài khoản</strong><small>Thử tìm bằng tên hoặc email khác.</small></div></td></tr>}
            </tbody>
          </table>
        </div>
        <div className="user-directory-footer"><span>Đang hiển thị <strong>{filteredUsers.length}</strong> tài khoản</span><span>Quyền truy cập được quản lý an toàn</span></div>
      </section>

      {editingUser && (
        <div className="user-modal-overlay" onClick={() => !saving && setEditingUser(null)}>
          <div className="user-modal" role="dialog" aria-modal="true" aria-label="Chỉnh sửa tài khoản" onClick={(event) => event.stopPropagation()}>
            <div className="user-modal-heading">
              <span className="user-modal-icon">♙</span>
              <div><p>ACCOUNT SETTINGS</p><h3>Chỉnh sửa tài khoản</h3><small>{editingUser.fullName} · {editingUser.email}</small></div>
              <button type="button" aria-label="Đóng" disabled={saving} onClick={() => setEditingUser(null)}>×</button>
            </div>
            <form onSubmit={handleSaveUser}>
              <div className="user-form-group">
                <label htmlFor="edit-user-status">Trạng thái tài khoản <small>Quyết định quyền truy cập của thành viên</small></label>
                <select id="edit-user-status" value={formData.status} onChange={(event) => setFormData({ ...formData, status: event.target.value })}>
                  <option value="ACTIVE">ACTIVE (Hoạt động)</option>
                  <option value="TEMPORARY_LOCKED">TEMPORARY_LOCKED (Tạm khóa)</option>
                  <option value="PERMANENT_LOCKED">PERMANENT_LOCKED (Khóa vĩnh viễn)</option>
                  <option value="PENDING_VERIFICATION">PENDING_VERIFICATION (Chờ xác thực)</option>
                </select>
              </div>
              <div className="user-form-group">
                <label htmlFor="edit-user-role">Vai trò <small>Nhóm quyền trong hệ thống</small></label>
                <select id="edit-user-role" value={formData.roleName} onChange={(event) => setFormData({ ...formData, roleName: event.target.value })}>
                  {!roles.some((role) => role.name === formData.roleName) && formData.roleName && (
                    <option value={formData.roleName}>{formData.roleName}</option>
                  )}
                  {roles.map((role) => <option key={role.id || role.name} value={role.name}>{role.name}</option>)}
                </select>
              </div>
              <div className="user-modal-actions">
                <button type="button" className="user-cancel-button" disabled={saving} onClick={() => setEditingUser(null)}>Hủy</button>
                <button type="submit" className="user-primary-button" disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu thay đổi'} <span aria-hidden="true">→</span></button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isNotifyOpen && (
        <div className="user-modal-overlay" onClick={() => !sending && setIsNotifyOpen(false)}>
          <div className="user-modal" role="dialog" aria-modal="true" aria-label="Gửi thông báo" onClick={(event) => event.stopPropagation()}>
            <div className="user-modal-heading">
              <span className="user-modal-icon">✉</span>
              <div><p>MESSAGE CENTER</p><h3>Gửi thông báo</h3><small>{noticeUser ? `Người nhận: ${noticeUser.fullName || noticeUser.email}` : 'Gửi tới tất cả người dùng'}</small></div>
              <button type="button" aria-label="Đóng" disabled={sending} onClick={() => setIsNotifyOpen(false)}>×</button>
            </div>
            <form onSubmit={handleSendNotification}>
              <div className="user-form-group">
                <label htmlFor="notice-title">Tiêu đề <small>Viết ngắn gọn để người nhận dễ nắm bắt</small></label>
                <input id="notice-title" type="text" value={notice.title} onChange={(event) => setNotice({ ...notice, title: event.target.value })} required />
              </div>
              <div className="user-form-group">
                <label htmlFor="notice-content">Nội dung <small>Thông tin chi tiết gửi đến thành viên</small></label>
                <textarea id="notice-content" rows={4} value={notice.content} onChange={(event) => setNotice({ ...notice, content: event.target.value })} required />
              </div>
              <div className="user-modal-actions">
                <button type="button" className="user-cancel-button" disabled={sending} onClick={() => setIsNotifyOpen(false)}>Hủy</button>
                <button type="submit" className="user-primary-button" disabled={sending}>{sending ? 'Đang gửi...' : 'Gửi thông báo'} <span aria-hidden="true">→</span></button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
