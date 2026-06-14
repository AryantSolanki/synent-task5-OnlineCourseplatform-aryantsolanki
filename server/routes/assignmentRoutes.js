// assignmentRoutes.js  — mount as: app.use('/api/assignments', require('./routes/assignmentRoutes'))
const express = require('express');
const router  = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { submitAssignment, getMySubmission } = require('../controllers/assignmentController');

// POST /api/assignments/:assignmentId/submit      — student submits
router.post('/:assignmentId/submit', protect, submitAssignment);

// GET  /api/assignments/:assignmentId/my-submission  — student checks own result
router.get('/:assignmentId/my-submission', protect, getMySubmission);

module.exports = router;
