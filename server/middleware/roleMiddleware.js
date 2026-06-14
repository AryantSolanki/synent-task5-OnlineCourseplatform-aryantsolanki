const asyncHandler = require('express-async-handler');

// Check if user has a specific role
const authorize = (...roles) => asyncHandler(async (req, res, next) => {
    if (!req.user) {
        res.status(401);
        throw new Error('Not authenticated');
    }
    if (!roles.includes(req.user.role)) {
        res.status(403);
        throw new Error(`Access denied. Required role: ${roles.join(' or ')}`);
    }
    next();
});

// Shorthand helpers
const studentOnly = authorize('student', 'admin');
const instructorOnly = authorize('instructor', 'admin');
const adminOnly = authorize('admin');

module.exports = { authorize, studentOnly, instructorOnly, adminOnly };
