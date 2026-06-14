const express = require('express');
const router = express.Router();
const { getDashboard, getProfile, updateProfile, getContinueLearning } = require('../controllers/studentController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);
router.get('/dashboard', getDashboard);
router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.get('/continue-learning', getContinueLearning);

module.exports = router;
