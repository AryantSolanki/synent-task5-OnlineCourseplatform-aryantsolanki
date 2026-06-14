import API from './axios';

export const assignmentApi = {
  /* ── Instructor ───────────────────────────────────────── */

  /** GET /api/instructor/courses/:courseId/assignments */
  getCourseAssignments: (courseId) =>
    API.get(`/instructor/courses/${courseId}/assignments`).then(r => r.data),

  /** POST /api/instructor/courses/:courseId/assignments */
  createAssignment: (courseId, data) =>
    API.post(`/instructor/courses/${courseId}/assignments`, data).then(r => r.data),

  /** PUT /api/instructor/assignments/:id */
  updateAssignment: (id, data) =>
    API.put(`/instructor/assignments/${id}`, data).then(r => r.data),

  /** DELETE /api/instructor/assignments/:id */
  deleteAssignment: (id) =>
    API.delete(`/instructor/assignments/${id}`).then(r => r.data),

  /** GET /api/instructor/assignments/:assignmentId/submissions */
  getSubmissions: (assignmentId) =>
    API.get(`/instructor/assignments/${assignmentId}/submissions`).then(r => r.data),

  /** POST /api/instructor/submissions/:id/grade */
  gradeSubmission: (submissionId, data) =>
    API.post(`/instructor/submissions/${submissionId}/grade`, data).then(r => r.data),

  /* ── Student ──────────────────────────────────────────── */

  /** GET /api/courses/:courseId/assignments */
  getStudentAssignments: (courseId) =>
    API.get(`/courses/${courseId}/assignments`).then(r => r.data),

  /**
   * POST /api/assignments/:assignmentId/submit
   * body: { textContent?, submissionUrl?, fileUrl? }
   * Returns: { submission, autoGraded, result }
   */
  submitAssignment: (assignmentId, data) =>
    API.post(`/assignments/${assignmentId}/submit`, data).then(r => r.data),

  /** GET /api/assignments/:assignmentId/my-submission */
  getMySubmission: (assignmentId) =>
    API.get(`/assignments/${assignmentId}/my-submission`).then(r => r.data),
};
