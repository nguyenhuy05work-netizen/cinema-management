
import axiosClient from '../../../api/axiosClient';

// axiosClient hiện đã trả response.data.
// Hỗ trợ thêm trường hợp backend bọc ApiResponse.
const unwrap = (response) => {
  if (
    response &&
    typeof response === 'object' &&
    !Array.isArray(response) &&
    'data' in response
  ) {
    return response.data;
  }

  return response;
};

export const rolePermissionApi = {
  async getRoles() {
    const response = await axiosClient.get('/api/v1/roles');
    return unwrap(response);
  },

  async getPermissions() {
    const response = await axiosClient.get('/api/v1/permissions');
    return unwrap(response);
  },

  async getRolePermissions(roleId) {
    const response = await axiosClient.get(
      `/api/v1/roles/${roleId}/permissions`
    );

    return unwrap(response);
  },

  async updateRolePermissions(roleId, permissionIds) {
    const response = await axiosClient.put(
      `/api/v1/roles/${roleId}/permissions`,
      { permissionIds }
    );

    return unwrap(response);
  },
};
