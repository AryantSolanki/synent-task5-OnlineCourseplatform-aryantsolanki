const mongoose = require('mongoose');

const siteSettingsSchema = new mongoose.Schema(
    {
        platformName: { type: String, default: 'LearnHub' },
        platformTagline: { type: String, default: 'Learn anything, anywhere.' },
        logoUrl: { type: String, default: '' },
        primaryColor: { type: String, default: '#6366f1' },
        platformFeePercent: { type: Number, default: 30, min: 0, max: 100 },
        currency: { type: String, default: 'INR' },
        supportEmail: { type: String, default: 'support@learnhub.com' },
        maintenanceMode: { type: Boolean, default: false },
        maintenanceMessage: { type: String, default: 'We are under maintenance. Please check back soon.' },
        allowRegistrations: { type: Boolean, default: true },
        requireEmailVerification: { type: Boolean, default: true },
        allowInstructorSignup: { type: Boolean, default: true },
        maxCoursePrice: { type: Number, default: 10000 },
        minPayoutAmount: { type: Number, default: 500 },
        termsUrl: { type: String, default: '' },
        privacyUrl: { type: String, default: '' },
        socialLinks: {
            twitter: { type: String, default: '' },
            facebook: { type: String, default: '' },
            linkedin: { type: String, default: '' },
            youtube: { type: String, default: '' },
        },
        smtp: {
            host: { type: String, default: '' },
            port: { type: Number, default: 587 },
            user: { type: String, default: '' },
            from: { type: String, default: '' },
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model('SiteSettings', siteSettingsSchema);
