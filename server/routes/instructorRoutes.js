const express = require('express');
const router  = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { instructorOnly } = require('../middleware/roleMiddleware');

const {
    getDashboard, getMyCourses, deleteCourse, duplicateCourse, getAnalytics,
    getCourseStudents, sendAnnouncement, getCourseAnalytics,
} = require('../controllers/instructorController');

const { getSubmissions, gradeSubmission } = require('../controllers/gradingController');

const {
    createCourse, updateCourse, publishCourse, unpublishCourse, getCourseForEdit, uploadFile,
} = require('../controllers/courseManagementController');

const {
    createAssignment, getCourseAssignments, updateAssignment, deleteAssignment,
} = require('../controllers/assignmentController');

const {
    getCourseQuizzes, createQuiz, updateQuiz, deleteQuiz, getQuizSubmissions,
} = require('../controllers/quizController');

const { getRevenueSummary, requestPayout } = require('../controllers/revenueController');
const upload = require('../middleware/upload');

router.use(protect, instructorOnly);

// ─── Dashboard & Analytics ───────────────────────────────
router.get('/dashboard',  getDashboard);
router.get('/analytics',  getAnalytics);

// ─── My Courses & Upload ─────────────────────────────────
router.get('/my-courses',               getMyCourses);
router.post('/upload',                  upload.single('file'), uploadFile);
router.post('/courses',                 createCourse);
router.get('/courses/:id',              getCourseForEdit);
router.put('/courses/:id',              updateCourse);
router.post('/courses/:id/publish',     publishCourse);
router.post('/courses/:id/unpublish',   unpublishCourse);
router.delete('/courses/:id',           deleteCourse);
router.post('/courses/:id/duplicate',   duplicateCourse);

// ─── Course Management ───────────────────────────────────
router.get('/courses/:id/students',     getCourseStudents);
router.post('/courses/:id/announcement',sendAnnouncement);
router.get('/courses/:id/analytics',    getCourseAnalytics);

// ─── Assignments (NEW) ───────────────────────────────────
router.get('/courses/:courseId/assignments',  getCourseAssignments);   // list
router.post('/courses/:courseId/assignments', createAssignment);       // create
router.put('/assignments/:id',               updateAssignment);        // update
router.delete('/assignments/:id',            deleteAssignment);        // delete

// ─── Quizzes ─────────────────────────────────────────────
router.get('/courses/:courseId/quizzes',     getCourseQuizzes);     // list
router.post('/courses/:courseId/quizzes',    createQuiz);           // create
router.put('/quizzes/:id',                   updateQuiz);           // update
router.delete('/quizzes/:id',                deleteQuiz);           // delete
router.get('/quizzes/:id/submissions',       getQuizSubmissions);   // view submissions

// ─── Revenue ─────────────────────────────────────────────
router.get('/revenue',          getRevenueSummary);
router.post('/payout/request',  requestPayout);

// ─── Grading ─────────────────────────────────────────────
router.get('/assignments/:assignmentId/submissions', getSubmissions);
router.post('/submissions/:id/grade',                gradeSubmission);

module.exports = router;
