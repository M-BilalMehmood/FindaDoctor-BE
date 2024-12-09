import Doctor from '../models/Doctor.js';
import Patient from '../models/Patient.js';
import Appointment from '../models/Appointment.js';
import Prescription from '../models/Prescription.js';
import Feedback from '../models/Feedback.js';
import emailService from '../services/emailService.js';
import imageUploadService from '../services/imageUploadService.js';
import { paginateResults, sanitizeUser } from '../utils/helpers.js';

class DoctorController {
    async getProfile(req, res) {
        try {
            const doctor = await Doctor.findById(req.user.id).select('-password');
            if (!doctor) {
                return res.status(404).json({ message: 'doctor not found' });
            }
            res.status(200).json(sanitizeUser(doctor));
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    async updateProfile(req, res) {
        try {
            const { name, specialty, qualifications, experience, consultationFee } = req.body;
            const updatedDoctor = await Doctor.findByIdAndUpdate(
                req.user.id,
                { name, specialty, qualifications, experience, consultationFee },
                { new: true }
            ).select('-password');
            if (!updatedDoctor) {
                return res.status(404).json({ message: 'doctor not found' });
            }
            res.status(200).json(sanitizeUser(updatedDoctor));
        } catch (error) {
            res.status(400).json({ message: error.message });
        }
    }

    async uploadProfilePicture(req, res) {
        try {
            if (!req.file) {
                return res.status(400).json({ message: 'No file uploaded' });
            }
            const imageUrl = await imageUploadService.uploadProfilePicture(req.file, req.user.id);
            const updatedDoctor = await Doctor.findByIdAndUpdate(
                req.user.id,
                { profilePicture: imageUrl },
                { new: true }
            ).select('-password');
            res.status(200).json({ profilePicture: updatedDoctor.profilePicture });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    async getAppointments(req, res) {
        try {
            const { status } = req.query;
            const query = { doctor: req.user.id };
            
            if (status === 'upcoming') {
                query.dateTime = { $gte: new Date() };
                query.status = { $nin: ['Completed', 'Cancelled'] };
            } else if (status === 'past') {
                query.dateTime = { $lt: new Date() };
            }
    
            const appointments = await Appointment.find(query)
                .populate('patient', 'name')
                .sort({ dateTime: 1 });
    
            res.status(200).json({ appointments });
        } catch (error) {
            console.error('Error fetching appointments:', error);
            res.status(500).json({ message: error.message });
        }
    }

    async updateAppointment(req, res) {
        try {
            const { status } = req.body;
            const appointment = await Appointment.findOneAndUpdate(
                { _id: req.params.id, doctor: req.user.id },
                { status },
                { new: true }
            ).populate('patient', 'name email');
            if (!appointment) {
                return res.status(404).json({ message: 'Appointment not found' });
            }
            // Send email notification to patient
            await emailService.sendEmail(
                appointment.patient.email,
                'Appointment Update',
                `<h1>Your appointment status has been updated to ${status}</h1>`
            );
            res.status(200).json(appointment);
        } catch (error) {
            res.status(400).json({ message: error.message });
        }
    }

    async getStats(req, res) {
        try {

            // Get total appointments
            const totalAppointments = await Appointment.countDocuments({ 
                doctor: req.user.id 
            });
    
            // Get total patients (unique)
            const patients = await Appointment.distinct('patient', { 
                doctor: req.user.id 
            });
            const totalPatients = patients.length;
    
            // Get total prescriptions
            const totalPrescriptions = await Prescription.countDocuments({
                doctor: req.user.id
            });
    
            // Get doctor's rating
            const doctor = await Doctor.findById(req.user.id);
            const rating = doctor.rating || 0;
    
            // Calculate trends (you can implement more sophisticated trend calculation)
            const trends = {
                appointments: 0,
                patients: 0,
                prescriptions: 0,
                rating: 0
            };
    
            res.status(200).json({
                appointments: { 
                    value: totalAppointments, 
                    trend: trends.appointments 
                },
                patients: { 
                    value: totalPatients, 
                    trend: trends.patients 
                },
                prescriptions: { 
                    value: totalPrescriptions, 
                    trend: trends.prescriptions 
                },
                rating: { 
                    value: rating, 
                    trend: trends.rating 
                }
            });
        } catch (error) {
            console.error('Error fetching doctor stats:', error);
            res.status(500).json({ message: error.message });
        }
    }

    async getPatients(req, res) {
        try {
            const { search, page = 1, limit = 10 } = req.query;
            const { skip, limit: limitParsed } = paginateResults(page, limit);
            
            // Get unique patient IDs from appointments
            const patientIds = await Appointment.distinct('patient', { 
                doctor: req.user.id 
            });
    
            // Build query for patients
            let query = { _id: { $in: patientIds } };
            if (search) {
                query = {
                    ...query,
                    $or: [
                        { name: { $regex: search, $options: 'i' } },
                        { email: { $regex: search, $options: 'i' } }
                    ]
                };
            }
    
            // Find patients with pagination
            const patients = await Patient.find(query)
                .select('name email phone dateOfBirth gender')
                .skip(skip)
                .limit(limitParsed)
                .sort({ name: 1 });
    
            const total = await Patient.countDocuments(query);
    
            res.status(200).json({
                patients,
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / limitParsed),
                total
            });
        } catch (error) {
            console.error('Error fetching patients:', error);
            res.status(500).json({ message: error.message });
        }
    }

    async getPatientHistory(req, res) {
        try {
            const { id } = req.params; 
            
            const appointments = await Appointment.find({
                doctor: req.user.id,
                patient: id
            }).sort({ dateTime: -1 });
    
            const prescriptions = await Prescription.find({
                patientId: id
            }).sort({ createdAt: -1 });

            const history = [
                ...appointments.map(apt => ({
                    _id: apt._id,
                    type: 'appointment',
                    date: apt.dateTime,
                    description: `Appointment - ${apt.status} - ${apt.issues || 'No issues specified'}`
                })),
                ...prescriptions.map(pres => ({
                    _id: pres._id,
                    type: 'prescription',
                    date: pres.createdAt,
                    description: `Prescription - ${pres.illnessType}`,
                    doctorName: pres.doctorName,
                    imageUrl: pres.imageUrl,
                    illnessType: pres.illnessType
                }))
            ].sort((a, b) => new Date(b.date) - new Date(a.date));
    
            res.status(200).json({ history });
        } catch (error) {
            console.error('Error fetching patient history:', error);
            res.status(500).json({ message: error.message });
        }
    }

    async getFeedback(req, res) {
        try {
            const { page, limit } = req.query;
            const { skip, limit: limitParsed } = paginateResults(page, limit);
            const feedback = await Feedback.find({ doctor: req.user.id })
                .populate('patient', 'name')
                .skip(skip)
                .limit(limitParsed)
                .sort({ createdAt: -1 });
            const total = await Feedback.countDocuments({ doctor: req.user.id });
            res.status(200).json({
                feedback,
                currentPage: page,
                totalPages: Math.ceil(total / limitParsed),
                total
            });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
}

export default new DoctorController();