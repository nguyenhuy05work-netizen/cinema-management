
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { rolePermissionApi } from '../api/rolePermissionApi';
import PermissionSelector from '../components/PermissionSelector';
import './RolePermissionManagementPage.css';

const getErrorMessage = (error) => {
  const status = error?.response?.status;

  if (status === 401) {
    return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
  }

  if (status === 403) {
    return 'Bạn không có quyền quản lý phân quyền.';
  }

  return error?.response?.data?.message
    || error?.response?.data?.detail
    || error?.message
    || 'Có lỗi xảy ra. Vui lòng thử lại.';
};

const toIds = (permissions) =>
  permissions.map((permission) => permission.id);

const sameIds = (first, second) => {
  const a = new Set(first);
  const b = new Set(second);

  return a.size === b.size &&
    [...a].every((id) => b.has(id));
};

const RolePermissionManagementPage = () => {
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [selectedRoleId, setSelectedRoleId] = useState(null);

  const [originalIds, setOriginalIds] = useState([]);
  const [draftIds, setDraftIds] = useState([]);

  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [loadingRole, setLoadingRole] = useState(false);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const [roleLoadFailed, setRoleLoadFailed] = useState(false);

  // Bỏ qua response cũ khi đổi role nhanh.
  const requestIdRef = useRef(0);
  const catalogRequestRef = useRef(0);
  const savingRef = useRef(false);

  const dirty = !sameIds(originalIds, draftIds);

  const changesCount = useMemo(() => {
    const original = new Set(originalIds);
    const draft = new Set(draftIds);

    const added = draftIds.filter((id) => !original.has(id));
    const removed = originalIds.filter((id) => !draft.has(id));

    return added.length + removed.length;
  }, [originalIds, draftIds]);

  const loadCatalog = useCallback(async () => {
    const requestId = ++catalogRequestRef.current;
    setLoadingCatalog(true);
    setError('');

    try {
      const [roleData, permissionData] = await Promise.all([
        rolePermissionApi.getRoles(),
        rolePermissionApi.getPermissions(),
      ]);

      if (requestId !== catalogRequestRef.current) return;

      if (!Array.isArray(roleData) ||
          !Array.isArray(permissionData)) {
        throw new Error('Dữ liệu API không đúng định dạng.');
      }

      setRoles(roleData);
      setPermissions(permissionData);

      setSelectedRoleId((current) => {
        if (current !== null &&
            roleData.some((role) => role.id === current)) {
          return current;
        }

        return roleData.length > 0 ? roleData[0].id : null;
      });
    } catch (err) {
      if (requestId === catalogRequestRef.current) {
        setError(getErrorMessage(err));
      }
    } finally {
      if (requestId === catalogRequestRef.current) {
        setLoadingCatalog(false);
      }
    }
  }, []);

  useEffect(() => {
    loadCatalog();

    return () => {
      catalogRequestRef.current += 1;
    };
  }, [loadCatalog]);

  const loadRolePermissions = useCallback(async (roleId) => {
    const requestId = ++requestIdRef.current;

    setLoadingRole(true);
    setError('');
    setMessage('');
    setRoleLoadFailed(false);

    try {
      const data =
        await rolePermissionApi.getRolePermissions(roleId);

      if (requestId !== requestIdRef.current) return;

      if (!Array.isArray(data)) {
        throw new Error('Danh sách quyền không hợp lệ.');
      }

      const ids = toIds(data);

      setOriginalIds(ids);
      setDraftIds(ids);
    } catch (err) {
      if (requestId === requestIdRef.current) {
        setOriginalIds([]);
        setDraftIds([]);
        setError(getErrorMessage(err));
        setRoleLoadFailed(true);
      }
    } finally {
      if (requestId === requestIdRef.current) {
        setLoadingRole(false);
      }
    }
  }, []);

  useEffect(() => {
    if (selectedRoleId !== null && !loadingCatalog) {
      loadRolePermissions(selectedRoleId);
    }

    return () => {
      requestIdRef.current += 1;
    };
  }, [selectedRoleId, loadingCatalog, loadRolePermissions]);

  // Cảnh báo khi đóng tab hoặc reload với thay đổi chưa lưu.
  useEffect(() => {
    const handleBeforeUnload = (event) => {
      if (!dirty) return;

      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener(
        'beforeunload',
        handleBeforeUnload
      );
    };
  }, [dirty]);

  const handleSelectRole = (event) => {
    const nextId = Number(event.target.value);

    if (nextId === selectedRoleId || savingRef.current) return;

    if (dirty) {
      const confirmed = window.confirm(
        'Bạn có thay đổi chưa lưu. Chuyển Role sẽ hủy các thay đổi. Tiếp tục?'
      );

      if (!confirmed) return;
    }

    setSelectedRoleId(nextId);
  };

  const handleToggle = (permissionId) => {
    if (loadingRole || savingRef.current || error) return;

    setDraftIds((current) =>
      current.includes(permissionId)
        ? current.filter((id) => id !== permissionId)
        : [...current, permissionId]
    );

    setMessage('');
  };

  const handleCancel = () => {
    setDraftIds([...originalIds]);
    setMessage('');
  };

  const handleSave = async () => {
    if (
      !dirty ||
      savingRef.current ||
      loadingRole ||
      error ||
      selectedRoleId === null
    ) return;

    savingRef.current = true;
    setSaving(true);
    setError('');
    setMessage('');

    const roleId = selectedRoleId;
    const requestId = requestIdRef.current;

    try {
      const result = await rolePermissionApi.updateRolePermissions(
        roleId,
        draftIds
      );

      if (
        requestId !== requestIdRef.current ||
        !Array.isArray(result)
      ) {
        throw new Error('Không thể xác nhận quyền đã lưu.');
      }

      const savedIds = toIds(result);

      setOriginalIds(savedIds);
      setDraftIds(savedIds);
      setMessage('Cập nhật phân quyền thành công.');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const selectedRole = roles.find(
    (role) => role.id === selectedRoleId
  );

  return (
    <div className="role-permission-page">
      <header className="role-permission-header">
        <div>
          <h2>Quản lý vai trò & phân quyền</h2>
          <p>
            Cấp hoặc thu hồi quyền theo từng Role trong hệ thống.
          </p>
        </div>
      </header>

      {error && (
        <div className="rp-alert rp-error" role="alert">
          {error}
          <button type="button" onClick={() => {
            if (loadingCatalog || roles.length === 0) {
              loadCatalog();
            } else if (selectedRoleId !== null) {
              loadRolePermissions(selectedRoleId);
            }
          }}>
            Thử lại
          </button>
        </div>
      )}

      {message && (
        <div className="rp-alert rp-success" role="status">
          {message}
        </div>
      )}

      {loadingCatalog ? (
        <p>Đang tải danh sách Role và Permission...</p>
      ) : roles.length === 0 ? (
        <p>Chưa có Role nào để quản lý.</p>
      ) : (
        <>
          <div className="rp-role-picker">
            <label htmlFor="role-select">Chọn vai trò</label>

            <select
              id="role-select"
              value={selectedRoleId ?? ''}
              onChange={handleSelectRole}
              disabled={saving}
            >
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
          </div>

          <div className="rp-role-summary">
            <strong>
              {selectedRole?.name ?? 'Chưa chọn Role'}
            </strong>

            <span>
              {loadingRole
                ? 'Đang tải quyền...'
                : `${draftIds.length} quyền đang chọn`}
            </span>
          </div>
          <footer className="rp-actions">
            <span>
              {changesCount} thay đổi chưa lưu
            </span>

            <div>
              <button
                type="button"
                onClick={handleCancel}
                disabled={!dirty || saving}
              >
                Hủy thay đổi
              </button>

              <button
                type="button"
                className="rp-save"
                onClick={handleSave}
                disabled={!dirty || saving || loadingRole || Boolean(error)}
              >
                {saving ? 'Đang lưu...' : 'Lưu phân quyền'}
              </button>
            </div>
          </footer>

          {!loadingRole && (
            <PermissionSelector
              permissions={permissions}
              selectedIds={draftIds}
              onToggle={handleToggle}
              disabled={saving || Boolean(error)}
            />
          )}

          
        </>
      )}
    </div>
  );
};

export default RolePermissionManagementPage;
