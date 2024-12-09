import mongoose from 'mongoose';

const appointmentSchema = new mongoose.Schema({
    doctor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Doctor',
        required: true
    },
    patient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Patient',
        required: true
    },
    issues: {
        type: String,
        required: true
    },
    dateTime: {
        type: Date,
        required: true
    },
    status: {
        type: String,
        enum: ['Pending', 'Scheduled', 'Completed', 'Cancelled', 'Rescheduled', 'Confirmed'],
        default: 'Pending'
    },
    notes: String,
    paymentStatus: {
        type: String,
        enum: ['Pending', 'Paid', 'Refunded'],
        default: 'Pending'
    },
    paymentIntentId: String
}, {
    timestamps: true
});

const Appointment = mongoose.model('Appointment', appointmentSchema);

export default Appointment;

