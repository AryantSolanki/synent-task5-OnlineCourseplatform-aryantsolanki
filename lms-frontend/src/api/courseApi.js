import API from './axios';

export const courseApi = {
  /** GET /api/courses — all filters/sort/pagination pass as params */
  getAll:        (params = {})   => API.get('/courses', { params }).then(r => r.data),

  /** GET /api/courses/:id — returns { course, isEnrolled, enrollment } */
  getById:       (id)            => API.get(`/courses/${id}`).then(r => r.data),

  /** GET /api/courses/:id/reviews */
  getReviews:    (id, params={}) => API.get(`/courses/${id}/reviews`, { params }).then(r => r.data),

  /** POST /api/courses/:id/reviews  — requires auth */
  addReview:     (id, data)      => API.post(`/courses/${id}/reviews`, data).then(r => r.data),

  /** GET /api/courses/categories */
  getCategories: ()              => API.get('/courses/categories').then(r => r.data),
};
