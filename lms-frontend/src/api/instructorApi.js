import API from './axios';

export const instructorApi = {
  /* ── Dashboard ─────────────────────────────────────────── */
  getDashboard: () =>
    API.get('/instructor/dashboard').then(r => r.data),

  getAnalytics: (days = 30) =>
    API.get('/instructor/analytics', { params: { days } }).then(r => r.data),

  /* ── Courses ───────────────────────────────────────────── */
  getMyCourses: (params = {}) =>
    API.get('/instructor/my-courses', { params }).then(r => r.data),

  getCourse: (id) =>
    API.get(`/instructor/courses/${id}`).then(r => r.data),

  createCourse: (data) =>
    API.post('/instructor/courses', data).then(r => r.data),

  updateCourse: (id, data) =>
    API.put(`/instructor/courses/${id}`, data).then(r => r.data),

  publishCourse: (id) =>
    API.post(`/instructor/courses/${id}/publish`).then(r => r.data),

  unpublishCourse: (id) =>
    API.post(`/instructor/courses/${id}/unpublish`).then(r => r.data),

  deleteCourse: (id) =>
    API.delete(`/instructor/courses/${id}`).then(r => r.data),

  duplicateCourse: (id) =>
    API.post(`/instructor/courses/${id}/duplicate`).then(r => r.data),

  /* ── Students ──────────────────────────────────────────── */
  getCourseStudents: (courseId) =>
    API.get(`/instructor/courses/${courseId}/students`).then(r => r.data),

  getCourseAnalytics: (courseId) =>
    API.get(`/instructor/courses/${courseId}/analytics`).then(r => r.data),

  sendAnnouncement: (courseId, data) =>
    API.post(`/instructor/courses/${courseId}/announcement`, data).then(r => r.data),

  /* ── Upload ────────────────────────────────────────────── */
  uploadFile: (file, onProgress) => {
    const form = new FormData();
    form.append('file', file);
    return API.post('/instructor/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => onProgress?.(Math.round((e.loaded / e.total) * 100)),
    }).then(r => r.data);
  },

  /* ── Revenue & Payouts ─────────────────────────────────── */
  getRevenue: () =>
    API.get('/instructor/revenue').then(r => r.data),

  requestPayout: (data) =>
    API.post('/instructor/payout/request', data).then(r => r.data),

  /* ── Grading ───────────────────────────────────────────── */
  getSubmissions: (assignmentId) =>
    API.get(`/instructor/assignments/${assignmentId}/submissions`).then(r => r.data),

  gradeSubmission: (submissionId, data) =>
    API.post(`/instructor/submissions/${submissionId}/grade`, data).then(r => r.data),
};
