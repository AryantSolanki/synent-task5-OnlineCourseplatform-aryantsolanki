const crypto = require('crypto');
const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const generateToken = require('../utils/generateToken');
const sendEmail = require('../utils/sendEmail');

// ─────────────────────────────────────────────────────────────
// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
// ─────────────────────────────────────────────────────────────
const register = asyncHandler(async (req, res) => {
    const { name, email, password, role } = req.body;

    // Validation
    if (!name || !email || !password) {
        res.status(400);
        throw new Error('Please provide name, email, and password');
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
        res.status(400);
        throw new Error('An account with this email already exists');
    }

    // Create user
    const user = await User.create({
        name,
        email,
        password,
        role: role || 'student',
        // Instructors require admin approval before they can log in
        approvalStatus: role === 'instructor' ? 'pending' : 'not_required',
    });

    // Generate email verification token
    const verificationToken = user.generateVerificationToken();
    await user.save({ validateBeforeSave: false });

    // Build verification URL
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email/${verificationToken}`;

    // Send verification email (non-blocking — account is created regardless)
    let emailSent = true;
    try {
        await sendEmail({
            to: user.email,
            subject: 'Verify Your Email - LMS Platform',
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">Welcome to LMS!</h1>
          </div>
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #333;">Hi ${user.name},</h2>
            <p style="color: #666; line-height: 1.6;">Thank you for registering! Please verify your email address to activate your account.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 30px; border-radius: 25px; text-decoration: none; font-weight: bold; font-size: 16px;">
                Verify My Email
              </a>
            </div>
            <p style="color: #999; font-size: 14px;">This link will expire in 24 hours. If you didn't create an account, please ignore this email.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="color: #999; font-size: 12px; text-align: center;">LMS Platform © ${new Date().getFullYear()}</p>
          </div>
        </div>
      `,
        });
    } catch (emailError) {
        // Log the error but don't fail registration
        // Configure EMAIL_USER and EMAIL_PASSWORD in .env to enable verification emails
        emailSent = false;
        console.warn('⚠️  Verification email could not be sent:', emailError.message);
        console.warn('👉  To enable emails, set EMAIL_USER and EMAIL_PASSWORD in server/.env');
        // Log the verification link in development so you can test manually
        if (process.env.NODE_ENV === 'development') {
            console.log(`\n📧  [DEV] Manual verification link for ${user.email}:\n    ${verificationUrl}\n`);
        }
    }

    res.status(201).json({
        success: true,
        requiresApproval: role === 'instructor',
        message: role === 'instructor'
            ? 'Your instructor application has been submitted! An admin will review it and you will be able to log in once approved.'
            : (emailSent
                ? 'Registration successful! Please check your email to verify your account.'
                : 'Registration successful! (Email service not configured — check server logs for verification link)'),
        emailSent,
        user: {
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            isVerified: user.isVerified,
            approvalStatus: user.approvalStatus,
        },
    });
});

// ─────────────────────────────────────────────────────────────
// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
// ─────────────────────────────────────────────────────────────
const login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
        res.status(400);
        throw new Error('Please provide email and password');
    }

    // Check if user exists
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
        res.status(401);
        throw new Error('Invalid email or password');
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
        res.status(401);
        throw new Error('Invalid email or password');
    }

    // Check if account is active
    if (!user.isActive) {
        res.status(403);
        throw new Error('Your account has been deactivated. Please contact support.');
    }

    // Check if instructor account is approved by admin
    if (user.role === 'instructor') {
        if (user.approvalStatus === 'pending') {
            res.status(403);
            throw new Error('Your instructor account is pending admin approval. You will be notified once your application is reviewed.');
        }
        if (user.approvalStatus === 'rejected') {
            res.status(403);
            throw new Error(`Your instructor application was not approved. Reason: ${user.approvalReason || 'Please contact support for details.'}`);
        }
    }

    // Check if email is verified
    if (!user.isVerified) {
        // In development with no email configured, auto-verify so testing isn't blocked
        if (process.env.NODE_ENV === 'development') {
            console.warn(`⚠️  [DEV] Auto-verifying ${user.email} since email service is not configured.`);
            user.isVerified = true;
            await user.save({ validateBeforeSave: false });
        } else {
            res.status(403);
            throw new Error('Please verify your email before logging in');
        }
    }

    // Update last login
    user.lastLogin = Date.now();
    await user.save({ validateBeforeSave: false });

    // Generate token
    const token = generateToken(user._id);

    res.status(200).json({
        success: true,
        token,
        user: {
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            profilePicture: user.profilePicture,
            isVerified: user.isVerified,
        },
    });
});

// ─────────────────────────────────────────────────────────────
// @desc    Verify email
// @route   GET /api/auth/verify-email/:token
// @access  Public
// ─────────────────────────────────────────────────────────────
const verifyEmail = asyncHandler(async (req, res) => {
    const hashedToken = crypto
        .createHash('sha256')
        .update(req.params.token)
        .digest('hex');

    const user = await User.findOne({
        verificationToken: hashedToken,
        verificationTokenExpire: { $gt: Date.now() },
    }).select('+verificationToken +verificationTokenExpire');

    if (!user) {
        res.status(400);
        throw new Error('Invalid or expired verification token');
    }

    if (user.isVerified) {
        return res.status(200).json({
            success: true,
            message: 'Email already verified. You can log in.',
        });
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpire = undefined;
    await user.save({ validateBeforeSave: false });

    const token = generateToken(user._id);

    res.status(200).json({
        success: true,
        message: 'Email verified successfully! You can now log in.',
        token,
        user: {
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            isVerified: user.isVerified,
        },
    });
});

// ─────────────────────────────────────────────────────────────
// @desc    Resend verification email
// @route   POST /api/auth/resend-verification
// @access  Public
// ─────────────────────────────────────────────────────────────
const resendVerification = asyncHandler(async (req, res) => {
    const { email } = req.body;

    if (!email) {
        res.status(400);
        throw new Error('Please provide your email address');
    }

    const user = await User.findOne({ email });
    if (!user) {
        res.status(404);
        throw new Error('No account found with this email');
    }

    if (user.isVerified) {
        res.status(400);
        throw new Error('Email is already verified. Please log in.');
    }

    const verificationToken = user.generateVerificationToken();
    await user.save({ validateBeforeSave: false });

    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email/${verificationToken}`;

    try {
        await sendEmail({
            to: user.email,
            subject: 'Verify Your Email - LMS Platform',
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">Email Verification</h1>
          </div>
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #333;">Hi ${user.name},</h2>
            <p style="color: #666; line-height: 1.6;">Here is your new verification link. Click the button below to verify your email address.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 30px; border-radius: 25px; text-decoration: none; font-weight: bold; font-size: 16px;">
                Verify My Email
              </a>
            </div>
            <p style="color: #999; font-size: 14px;">This link will expire in 24 hours.</p>
          </div>
        </div>
      `,
        });
    } catch (error) {
        // Non-fatal — log link to terminal in dev mode
        console.warn('⚠️  Resend verification email failed:', error.message);
        if (process.env.NODE_ENV === 'development') {
            console.log(`\n📧  [DEV] Manual verification link for ${user.email}:\n    ${verificationUrl}\n`);
        }
    }

    res.status(200).json({
        success: true,
        message: 'Verification email resent successfully',
    });
});

// ─────────────────────────────────────────────────────────────
// @desc    Forgot password
// @route   POST /api/auth/forgot-password
// @access  Public
// ─────────────────────────────────────────────────────────────
const forgotPassword = asyncHandler(async (req, res) => {
    const { email } = req.body;

    if (!email) {
        res.status(400);
        throw new Error('Please provide your email address');
    }

    const user = await User.findOne({ email });

    // Always respond with success for security (don't reveal if email exists)
    if (!user) {
        return res.status(200).json({
            success: true,
            message: 'If an account exists with this email, a reset link will be sent.',
        });
    }

    const resetToken = user.generateResetToken();
    await user.save({ validateBeforeSave: false });

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

    try {
        await sendEmail({
            to: user.email,
            subject: 'Password Reset Request - LMS Platform',
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">Password Reset</h1>
          </div>
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #333;">Hi ${user.name},</h2>
            <p style="color: #666; line-height: 1.6;">We received a request to reset your password. Click the button below to create a new password.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 14px 30px; border-radius: 25px; text-decoration: none; font-weight: bold; font-size: 16px;">
                Reset My Password
              </a>
            </div>
            <p style="color: #999; font-size: 14px;">This link will expire in 30 minutes. If you didn't request a password reset, please ignore this email.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="color: #999; font-size: 12px; text-align: center;">LMS Platform © ${new Date().getFullYear()}</p>
          </div>
        </div>
      `,
        });
    } catch (error) {
        // Non-fatal — log reset link to terminal in dev mode
        console.warn('⚠️  Password reset email failed:', error.message);
        if (process.env.NODE_ENV === 'development') {
            console.log(`\n🔑  [DEV] Manual reset link for ${user.email}:\n    ${resetUrl}\n`);
        }
    }

    res.status(200).json({
        success: true,
        message: 'If an account exists with this email, a reset link will be sent.',
    });
});

// ─────────────────────────────────────────────────────────────
// @desc    Reset password
// @route   PUT /api/auth/reset-password/:token
// @access  Public
// ─────────────────────────────────────────────────────────────
const resetPassword = asyncHandler(async (req, res) => {
    const { password, confirmPassword } = req.body;

    if (!password || !confirmPassword) {
        res.status(400);
        throw new Error('Please provide password and confirm password');
    }

    if (password !== confirmPassword) {
        res.status(400);
        throw new Error('Passwords do not match');
    }

    if (password.length < 6) {
        res.status(400);
        throw new Error('Password must be at least 6 characters');
    }

    const hashedToken = crypto
        .createHash('sha256')
        .update(req.params.token)
        .digest('hex');

    const user = await User.findOne({
        resetPasswordToken: hashedToken,
        resetPasswordExpire: { $gt: Date.now() },
    }).select('+resetPasswordToken +resetPasswordExpire');

    if (!user) {
        res.status(400);
        throw new Error('Invalid or expired reset token. Please request a new password reset.');
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    // Send confirmation email
    try {
        await sendEmail({
            to: user.email,
            subject: 'Password Changed Successfully - LMS Platform',
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">Password Changed</h1>
          </div>
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #333;">Hi ${user.name},</h2>
            <p style="color: #666; line-height: 1.6;">Your password has been changed successfully. If you did not make this change, please contact our support immediately.</p>
          </div>
        </div>
      `,
        });
    } catch (error) {
        console.error('Password change confirmation email failed:', error.message);
    }

    const token = generateToken(user._id);

    res.status(200).json({
        success: true,
        message: 'Password reset successful! You can now log in with your new password.',
        token,
    });
});

// ─────────────────────────────────────────────────────────────
// @desc    Get current logged-in user
// @route   GET /api/auth/me
// @access  Private
// ─────────────────────────────────────────────────────────────
const getMe = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id);

    if (!user) {
        res.status(404);
        throw new Error('User not found');
    }

    res.status(200).json({
        success: true,
        user: {
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            profilePicture: user.profilePicture,
            bio: user.bio,
            isVerified: user.isVerified,
            createdAt: user.createdAt,
            lastLogin: user.lastLogin,
        },
    });
});

// ─────────────────────────────────────────────────────────────
// @desc    Logout user (client-side token removal)
// @route   POST /api/auth/logout
// @access  Private
// ─────────────────────────────────────────────────────────────
const logout = asyncHandler(async (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Logged out successfully',
    });
});

module.exports = {
    register,
    login,
    verifyEmail,
    resendVerification,
    forgotPassword,
    resetPassword,
    getMe,
    logout,
};
