import API from './axios';

export const authApi = {
  register:           (data)            => API.post('/auth/register', data).then(r => r.data),
  login:              (email, password) => API.post('/auth/login', { email, password }).then(r => r.data),
  getMe:              ()                => API.get('/auth/me').then(r => r.data),
  logout:             ()                => API.post('/auth/logout').then(r => r.data),
  forgotPassword:     (email)           => API.post('/auth/forgot-password', { email }).then(r => r.data),
  resetPassword:      (token, password) => API.put(`/auth/reset-password/${token}`, { password }).then(r => r.data),
  verifyEmail:        (token)           => API.get(`/auth/verify-email/${token}`).then(r => r.data),
  resendVerification: (email)           => API.post('/auth/resend-verification', { email }).then(r => r.data),
};
