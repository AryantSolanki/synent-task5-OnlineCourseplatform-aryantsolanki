const express  = require('express');
const router   = express.Router();
const { submitQuiz, getMyQuizResult } = require('../controllers/quizController');
const { protect } = require('../middleware/authMiddleware');

// POST  /api/quizzes/:quizId/submit
router.post('/:quizId/submit',   protect, submitQuiz);

// GET   /api/quizzes/:quizId/my-result
router.get('/:quizId/my-result', protect, getMyQuizResult);

module.exports = router;
