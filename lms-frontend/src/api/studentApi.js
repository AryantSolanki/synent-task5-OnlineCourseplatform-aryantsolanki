import API from './axios';

export const studentApi = {
  /**
   * GET /api/student/dashboard
   * → { stats, continueLearning, recentProgress, recommended, allEnrollments }
   */
  getDashboard: () =>
    API.get('/student/dashboard').then(r => r.data),

  /** GET /api/student/profile → { profile, stats } */
  getProfile: () =>
    API.get('/student/profile').then(r => r.data),

  /** PUT /api/student/profile — { name, bio, profilePicture } */
  updateProfile: (data) =>
    API.put('/student/profile', data).then(r => r.data),

  /** GET /api/student/continue-learning */
  getContinueLearning: () =>
    API.get('/student/continue-learning').then(r => r.data),
};
