import API from './axios';

export const adminApi = {
  /* ── Dashboard ─────────────────────────────────────────── */
  getDashboardStats: () =>
    API.get('/admin/dashboard/stats').then(r => r.data),

  /* ── Users ──────────────────────────────────────────────── */
  getUsers: (params = {}) =>
    API.get('/admin/users', { params }).then(r => r.data),

  getUserById: (id) =>
    API.get(`/admin/users/${id}`).then(r => r.data),

  updateUser: (id, data) =>
    API.put(`/admin/users/${id}`, data).then(r => r.data),

  deleteUser: (id) =>
    API.delete(`/admin/users/${id}`).then(r => r.data),

  bulkUpdateUsers: (data) =>
    API.post('/admin/users/bulk', data).then(r => r.data),

  /* ── Instructor Approvals ───────────────────────────────── */
  getPendingInstructors: (params = {}) =>
    API.get('/admin/instructors/pending', { params }).then(r => r.data),

  approveInstructor: (id) =>
    API.put(`/admin/instructors/${id}/approve`).then(r => r.data),

  rejectInstructor: (id, reason) =>
    API.put(`/admin/instructors/${id}/reject`, { reason }).then(r => r.data),

  /* ── Courses ────────────────────────────────────────────── */
  getCourses: (params = {}) =>
    API.get('/admin/courses', { params }).then(r => r.data),

  // Alias kept for backwards compatibility
  getAllCourses: (params = {}) =>
    API.get('/admin/courses', { params }).then(r => r.data),

  getCoursesByCategory: (categoryId, params = {}) =>
    API.get('/admin/courses', { params: { ...params, category: categoryId } }).then(r => r.data),

  updateCourseStatus: (id, data) =>
    API.put(`/admin/courses/${id}/status`, data).then(r => r.data),

  /* ── Payouts ────────────────────────────────────────────── */
  getPayouts: (params = {}) =>
    API.get('/admin/payouts', { params }).then(r => r.data),

  updatePayout: (id, data) =>
    API.put(`/admin/payouts/${id}`, data).then(r => r.data),

  /* ── Revenue ────────────────────────────────────────────── */
  getRevenueReport: (params = {}) =>
    API.get('/admin/revenue', { params }).then(r => r.data),

  /* ── Activity Logs ──────────────────────────────────────── */
  getActivityLogs: (params = {}) =>
    API.get('/admin/activity-logs', { params }).then(r => r.data),

  /* ── Categories ─────────────────────────────────────────── */
  getCategories: () =>
    API.get('/admin/categories').then(r => r.data),

  createCategory: (data) =>
    API.post('/admin/categories', data).then(r => r.data),

  updateCategory: (id, data) =>
    API.put(`/admin/categories/${id}`, data).then(r => r.data),

  deleteCategory: (id) =>
    API.delete(`/admin/categories/${id}`).then(r => r.data),

  /* ── Settings ───────────────────────────────────────────── */
  getSettings: () =>
    API.get('/admin/settings').then(r => r.data),

  updateSettings: (data) =>
    API.put('/admin/settings', data).then(r => r.data),

  /* ── Email Templates ────────────────────────────────────── */
  getEmailTemplates: () =>
    API.get('/admin/email-templates').then(r => r.data),

  getEmailTemplate: (id) =>
    API.get(`/admin/email-templates/${id}`).then(r => r.data),

  updateEmailTemplate: (id, data) =>
    API.put(`/admin/email-templates/${id}`, data).then(r => r.data),
};

// Convenience helpers — suspend/activate via updateUser
adminApi.suspendUser  = (id) => adminApi.updateUser(id, { isActive: false });
adminApi.activateUser = (id) => adminApi.updateUser(id, { isActive: true  });
