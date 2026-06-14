const mongoose = require('mongoose');

const emailTemplateSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            unique: true,
            // e.g. 'welcome', 'email_verification', 'password_reset', 'course_approved', 'payout_processed'
        },
        displayName: { type: String, required: true },
        description: { type: String, default: '' },
        subject: { type: String, required: true },
        htmlBody: { type: String, required: true },
        textBody: { type: String, default: '' },
        variables: [{ type: String }], // list of {{variables}} supported
        isActive: { type: Boolean, default: true },
        lastEditedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    },
    { timestamps: true }
);

module.exports = mongoose.model('EmailTemplate', emailTemplateSchema);
