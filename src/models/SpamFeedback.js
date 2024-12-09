import mongoose from 'mongoose';

const spamFeedbackSchema = new mongoose.Schema({
    feedback: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Feedback',
        required: true
    },
    reportedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    reason: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['Pending', 'Resolved', 'Dismissed'],
        default: 'Pending'
    },
    resolution: String
}, {
    timestamps: true
});

const SpamFeedback = mongoose.model('SpamFeedback', spamFeedbackSchema);

export default SpamFeedback;