import API from './axios';

export const enrollmentApi = {
  /** POST /api/enrollments/enroll/:courseId */
  enroll: (courseId) =>
    API.post(`/enrollments/enroll/${courseId}`).then(r => r.data),

  /** GET /api/enrollments/my-enrollments?status=... */
  getMyEnrollments: (status) =>
    API.get('/enrollments/my-enrollments', { params: status ? { status } : {} }).then(r => r.data),

  /** GET /api/enrollments/:id */
  getById: (id) =>
    API.get(`/enrollments/${id}`).then(r => r.data),

  /** GET /api/enrollments/progress/:courseId → { progressRecords, enrollment } */
  getCourseProgress: (courseId) =>
    API.get(`/enrollments/progress/${courseId}`).then(r => r.data),

  /**
   * POST /api/enrollments/progress/update
   * body: { courseId, lectureId, sectionId, watchTime, lastPosition }
   */
  updateProgress: (data) =>
    API.post('/enrollments/progress/update', data).then(r => r.data),

  /**
   * POST /api/enrollments/progress/complete
   * body: { courseId, lectureId, sectionId }
   */
  completeLecture: (data) =>
    API.post('/enrollments/progress/complete', data).then(r => r.data),
};
