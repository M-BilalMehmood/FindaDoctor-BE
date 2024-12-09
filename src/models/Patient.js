import mongoose from 'mongoose';
import User from './User.js';

const patientSchema = new mongoose.Schema({
    dateOfBirth: {
        type: Date,
        required: true
    },
    gender: {
        type: String,
        enum: ['Male', 'Female', 'Other'],
        required: true
    },
    medicalHistory: [{
        condition: String,
        diagnosedDate: Date,
        medications: [String]
    }]
});

const Patient = User.discriminator('Patient', patientSchema);

export default Patient;

