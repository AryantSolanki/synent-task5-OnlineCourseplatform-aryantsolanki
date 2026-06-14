const asyncHandler = require('express-async-handler');
const SiteSettings = require('../models/SiteSettings');
const EmailTemplate = require('../models/EmailTemplate');
const ActivityLog = require('../models/ActivityLog');

const logActivity = async (req, action, targetType, targetId, targetName, details = {}) => {
    try {
        await ActivityLog.create({
            admin: req.user._id,
            action,
            targetType,
            targetId,
            targetName,
            details,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'] || '',
        });
    } catch (err) {
        console.error('Activity log error:', err.message);
    }
};

// Helper: ensure settings doc exists (singleton pattern)
const getOrCreateSettings = async () => {
    let settings = await SiteSettings.findOne();
    if (!settings) settings = await SiteSettings.create({});
    return settings;
};

// GET /api/admin/settings
const getSettings = asyncHandler(async (req, res) => {
    const settings = await getOrCreateSettings();
    res.json({ success: true, data: { settings } });
});

// PUT /api/admin/settings
const updateSettings = asyncHandler(async (req, res) => {
    const settings = await getOrCreateSettings();
    const updatableFields = [
        'platformName', 'platformTagline', 'logoUrl', 'primaryColor',
        'platformFeePercent', 'currency', 'supportEmail',
        'maintenanceMode', 'maintenanceMessage',
        'allowRegistrations', 'requireEmailVerification', 'allowInstructorSignup',
        'maxCoursePrice', 'minPayoutAmount', 'termsUrl', 'privacyUrl',
        'socialLinks', 'smtp',
    ];

    updatableFields.forEach((field) => {
        if (req.body[field] !== undefined) settings[field] = req.body[field];
    });

    await settings.save();
    await logActivity(req, 'SETTINGS_UPDATED', 'Settings', null, 'Site Settings');

    res.json({ success: true, message: 'Settings updated', data: { settings } });
});

// ─────────────────────────────────────────────────────────────
// Email Templates
// ─────────────────────────────────────────────────────────────

const DEFAULT_TEMPLATES = [
    {
        name: 'welcome',
        displayName: 'Welcome Email',
        description: 'Sent when a new user registers',
        subject: 'Welcome to {{platformName}}!',
        htmlBody: `<h1>Welcome to {{platformName}}, {{userName}}!</h1><p>We're glad you're here. Start exploring courses today.</p>`,
        variables: ['platformName', 'userName'],
    },
    {
        name: 'email_verification',
        displayName: 'Email Verification',
        description: 'Sent to verify user email address',
        subject: 'Verify your email — {{platformName}}',
        htmlBody: `<h2>Verify Your Email</h2><p>Hi {{userName}}, click the link below to verify your email:</p><a href="{{verificationLink}}">Verify Email</a>`,
        variables: ['platformName', 'userName', 'verificationLink'],
    },
    {
        name: 'password_reset',
        displayName: 'Password Reset',
        description: 'Sent when user requests password reset',
        subject: 'Reset your password — {{platformName}}',
        htmlBody: `<h2>Password Reset</h2><p>Hi {{userName}}, click below to reset your password (expires in 30 min):</p><a href="{{resetLink}}">Reset Password</a>`,
        variables: ['platformName', 'userName', 'resetLink'],
    },
    {
        name: 'course_approved',
        displayName: 'Course Approved',
        description: 'Sent to instructor when their course is approved',
        subject: 'Your course "{{courseTitle}}" has been approved!',
        htmlBody: `<h2>Course Approved 🎉</h2><p>Hi {{instructorName}}, your course <strong>{{courseTitle}}</strong> has been approved and is now live.</p>`,
        variables: ['instructorName', 'courseTitle', 'courseLink'],
    },
    {
        name: 'payout_processed',
        displayName: 'Payout Processed',
        description: 'Sent to instructor when payout is processed',
        subject: 'Your payout of {{amount}} has been processed',
        htmlBody: `<h2>Payout Processed</h2><p>Hi {{instructorName}}, your payout of <strong>{{amount}}</strong> has been processed. Please allow 3-5 business days.</p>`,
        variables: ['instructorName', 'amount', 'payoutDate'],
    },
];

const seedDefaultTemplates = async () => {
    const count = await EmailTemplate.countDocuments();
    if (count === 0) {
        await EmailTemplate.insertMany(DEFAULT_TEMPLATES);
    }
};

// GET /api/admin/email-templates
const getEmailTemplates = asyncHandler(async (req, res) => {
    await seedDefaultTemplates();
    const templates = await EmailTemplate.find().sort({ name: 1 }).populate('lastEditedBy', 'name');
    res.json({ success: true, data: { templates } });
});

// GET /api/admin/email-templates/:id
const getEmailTemplate = asyncHandler(async (req, res) => {
    const template = await EmailTemplate.findById(req.params.id).populate('lastEditedBy', 'name email');
    if (!template) { res.status(404); throw new Error('Template not found'); }
    res.json({ success: true, data: { template } });
});

// PUT /api/admin/email-templates/:id
const updateEmailTemplate = asyncHandler(async (req, res) => {
    const { subject, htmlBody, textBody, isActive } = req.body;
    const template = await EmailTemplate.findById(req.params.id);
    if (!template) { res.status(404); throw new Error('Template not found'); }

    if (subject !== undefined) template.subject = subject;
    if (htmlBody !== undefined) template.htmlBody = htmlBody;
    if (textBody !== undefined) template.textBody = textBody;
    if (isActive !== undefined) template.isActive = isActive;
    template.lastEditedBy = req.user._id;

    await template.save();
    await logActivity(req, 'EMAIL_TEMPLATE_UPDATED', 'EmailTemplate', template._id, template.displayName);

    res.json({ success: true, message: 'Template updated', data: { template } });
});

module.exports = { getSettings, updateSettings, getEmailTemplates, getEmailTemplate, updateEmailTemplate };
