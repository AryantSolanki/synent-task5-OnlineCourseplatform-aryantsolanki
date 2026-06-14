const mongoose = require('mongoose');

// Revenue - created per enrollment for instructor earnings tracking
const revenueSchema = new mongoose.Schema({
    instructor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    enrollment: { type: mongoose.Schema.Types.ObjectId, ref: 'Enrollment', required: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    grossAmount: { type: Number, required: true },     // price student paid
    platformFee: { type: Number, required: true },     // 30%
    instructorShare: { type: Number, required: true }, // 70%
    currency: { type: String, default: 'INR' },
    status: { type: String, enum: ['pending', 'available', 'paid'], default: 'available' },
    payoutId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payout' },
}, { timestamps: true });

revenueSchema.index({ instructor: 1, createdAt: -1 });
revenueSchema.index({ course: 1 });

// Payout - instructor's withdrawal request
const payoutSchema = new mongoose.Schema({
    instructor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    method: { type: String, enum: ['bank_transfer', 'upi', 'paypal'], default: 'bank_transfer' },
    status: { type: String, enum: ['pending', 'processing', 'completed', 'rejected'], default: 'pending' },
    notes: { type: String },
    processedAt: { type: Date },
    revenueIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Revenue' }],
}, { timestamps: true });

payoutSchema.index({ instructor: 1, createdAt: -1 });

const Revenue = mongoose.model('Revenue', revenueSchema);
const Payout = mongoose.model('Payout', payoutSchema);

module.exports = { Revenue, Payout };
