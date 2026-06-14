const express = require('express');
const router  = express.Router();
const { getAllCourses, getCourseById, getCourseReviews, addReview, getCategories, seedCourses } = require('../controllers/courseController');
const { getStudentAssignments } = require('../controllers/assignmentController');
const { getStudentQuizzes } = require('../controllers/quizController');
const { protect, optionalAuth } = require('../middleware/authMiddleware');

// ── Public ────────────────────────────────────────────────
router.get('/',            getAllCourses);
router.get('/categories',  getCategories);
router.post('/seed',       protect, seedCourses); // dev only
router.get('/:id',         optionalAuth, getCourseById);
router.get('/:id/reviews', getCourseReviews);
router.post('/:id/reviews',protect, addReview);

// ── Student assignments (requires auth + enrollment) ──────
router.get('/:courseId/assignments', protect, getStudentAssignments);

// ── Student quizzes (requires auth + enrollment) ──────────
router.get('/:courseId/quizzes', protect, getStudentQuizzes);

module.exports = router;
