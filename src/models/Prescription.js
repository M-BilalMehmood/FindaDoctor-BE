import mongoose from 'mongoose';

const PrescriptionSchema = new mongoose.Schema({
    patientId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Patient', 
        required: true 
    },
    doctorName: { 
        type: String, 
        required: true 
    },
    illnessType: { 
        type: String, 
        required: true 
    },
    imageUrl: { 
        type: String
    },
    createdAt: {
        type: Date, 
        default: Date.now 
    },
});

export default mongoose.model('Prescription', PrescriptionSchema);