import mongoose from 'mongoose';
import User from './User.js';

const doctorSchema = new mongoose.Schema({
    specialty: {
        type: String,
        required: true
    },
    qualifications: [{
        type: String,
        required: true
    }],
    experience: {
        type: Number,
        required: true
    },
    PMDCRegistrationNumber: {
        type: String,
        required: true
    },
    availableHours: [{
        day: {
            type: String,
            enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
            required: true
        },
        startTime: {
            type: String,
            required: true
        },
        endTime: {
            type: String,
            required: true
        }
    }],
    consultationFee: {
        type: Number,
        required: true
    },
    rating: {
        type: Number,
        default: 0
    },
    totalRatings: {
        type: Number,
        default: 0
    }
});

const Doctor = User.discriminator('Doctor', doctorSchema);

export default Doctor;

