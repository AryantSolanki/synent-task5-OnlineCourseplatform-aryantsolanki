import API from './axios';

export const quizApi = {
  /* ── Instructor ───────────────────────────────────────── */

  /** GET /api/instructor/courses/:courseId/quizzes */
  getCourseQuizzes: (courseId) =>
    API.get(`/instructor/courses/${courseId}/quizzes`).then(r => r.data),

  /** POST /api/instructor/courses/:courseId/quizzes */
  createQuiz: (courseId, data) =>
    API.post(`/instructor/courses/${courseId}/quizzes`, data).then(r => r.data),

  /** PUT /api/instructor/quizzes/:id */
  updateQuiz: (id, data) =>
    API.put(`/instructor/quizzes/${id}`, data).then(r => r.data),

  /** DELETE /api/instructor/quizzes/:id */
  deleteQuiz: (id) =>
    API.delete(`/instructor/quizzes/${id}`).then(r => r.data),

  /** GET /api/instructor/quizzes/:id/submissions */
  getQuizSubmissions: (id) =>
    API.get(`/instructor/quizzes/${id}/submissions`).then(r => r.data),

  /* ── Student ──────────────────────────────────────────── */

  /** GET /api/courses/:courseId/quizzes */
  getStudentQuizzes: (courseId) =>
    API.get(`/courses/${courseId}/quizzes`).then(r => r.data),

  /**
   * POST /api/quizzes/:quizId/submit
   * body: { answers: [{ questionId, selectedOption?, textAnswer? }] }
   * Returns: { submission, result: { score, maxScore, percentage, passed, questionBreakdown[] } }
   */
  submitQuiz: (quizId, answers) =>
    API.post(`/quizzes/${quizId}/submit`, { answers }).then(r => r.data),

  /** GET /api/quizzes/:quizId/my-result */
  getMyQuizResult: (quizId) =>
    API.get(`/quizzes/${quizId}/my-result`).then(r => r.data),
};
