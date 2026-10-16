
import { useMemo, useState } from 'react';

const MODULE_NAMES = {
  MOVIE: 'Quản lý phim',
  GENRE: 'Quản lý thể loại',
  COMMENT: 'Quản lý bình luận',
  CITY: 'Quản lý thành phố',
  CINEMA: 'Quản lý rạp',
  HALL: 'Quản lý phòng chiếu',
  SEAT: 'Quản lý ghế',
  SHOWTIME: 'Quản lý suất chiếu',
  SHOWTIME_SEAT: 'Ghế theo suất chiếu',
  PROFILE: 'Hồ sơ cá nhân',
  PASSWORD: 'Mật khẩu',
  USER: 'Quản lý người dùng',
  ROLE: 'Quản lý vai trò',
  NOTIFICATION: 'Thông báo',
  BOOKING: 'Đặt vé',
};

// Sắp xếp tiền tố dài trước để không nhầm
// SHOWTIME_SEAT với SHOWTIME.
const PREFIXES = Object.keys(MODULE_NAMES).sort(
  (a, b) => b.length - a.length
);

const getModuleName = (code) => {
  const prefix = PREFIXES.find(
    (item) => code === item || code.startsWith(`${item}_`)
  );

  return prefix ? MODULE_NAMES[prefix] : 'Khác';
};

const PermissionSelector = ({
  permissions,
  selectedIds,
  onToggle,
  disabled = false,
}) => {
  const [search, setSearch] = useState('');

  const groups = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    const result = {};

    permissions
      .filter((permission) => {
        const content = [
          permission.code,
          permission.name,
          permission.description,
        ].join(' ').toLowerCase();

        return content.includes(keyword);
      })
      .forEach((permission) => {
        const moduleName = getModuleName(permission.code);

        if (!result[moduleName]) {
          result[moduleName] = [];
        }

        result[moduleName].push(permission);
      });

    return result;
  }, [permissions, search]);

  return (
    <section className="permission-selector">
      <div className="permission-toolbar">
        <input
          type="search"
          placeholder="Tìm theo mã, tên hoặc mô tả quyền..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          aria-label="Tìm kiếm Permission"
        />

        <span>
          {selectedIds.length}/{permissions.length} quyền được chọn
        </span>
      </div>

      {Object.keys(groups).length === 0 && (
        <p>Không tìm thấy Permission phù hợp.</p>
      )}

      {Object.entries(groups).map(([moduleName, items]) => (
        <section className="permission-group" key={moduleName}>
          <h3>{moduleName}</h3>

          <div className="permission-list">
            {items.map((permission) => (
              <label
                key={permission.id}
                className="permission-item"
              >
                <input
                  type="checkbox"
                  checked={selectedIds.includes(permission.id)}
                  onChange={() => onToggle(permission.id)}
                  disabled={disabled}
                />

                <span>
                  <strong>{permission.name}</strong>
                  <code>{permission.code}</code>

                  {permission.description && (
                    <small>{permission.description}</small>
                  )}
                </span>
              </label>
            ))}
          </div>
        </section>
      ))}
    </section>
  );
};

export default PermissionSelector;
