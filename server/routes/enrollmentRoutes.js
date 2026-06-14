const express = require('express');
const router = express.Router();
const { enrollInCourse, getMyEnrollments, getEnrollmentById, updateProgress, completeLecture, getCourseProgress } = require('../controllers/enrollmentController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect); // all enrollment routes need auth
router.post('/enroll/:courseId', enrollInCourse);
router.get('/my-enrollments', getMyEnrollments);
router.get('/progress/:courseId', getCourseProgress);
router.get('/:id', getEnrollmentById);
router.post('/progress/update', updateProgress);
router.post('/progress/complete', completeLecture);

module.exports = router;
