const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema(
    {
        admin: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        action: {
            type: String,
            required: true,
            // e.g. 'USER_BANNED', 'COURSE_APPROVED', 'PAYOUT_PROCESSED'
        },
        targetType: {
            type: String,
            enum: ['User', 'Course', 'Category', 'Payout', 'Settings', 'EmailTemplate'],
        },
        targetId: { type: mongoose.Schema.Types.ObjectId },
        targetName: { type: String, default: '' },
        details: { type: mongoose.Schema.Types.Mixed, default: {} },
        ipAddress: { type: String, default: '' },
        userAgent: { type: String, default: '' },
    },
    { timestamps: true }
);

activityLogSchema.index({ admin: 1, createdAt: -1 });
activityLogSchema.index({ action: 1 });
activityLogSchema.index({ targetType: 1, targetId: 1 });

module.exports = mongoose.model('ActivityLog', activityLogSchema);
