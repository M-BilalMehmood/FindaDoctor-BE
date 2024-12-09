import Patient from '../models/Patient.js';
import Doctor from '../models/Doctor.js';
import Appointment from '../models/Appointment.js';
import Feedback from '../models/Feedback.js';
import Prescription from '../models/Prescription.js';
import emailService from '../services/emailService.js';
import paymentService from '../services/paymentService.js';
import { paginateResults, sanitizeUser } from '../utils/helpers.js';

class PatientController {
    async getProfile(req, res) {
        try {
            const doctor = await Doctor.findById(req.user.id).select('-password');
            if (!doctor) {
                return res.status(404).json({ message: 'User profile not found' });
            }
            res.status(200).json(sanitizeUser(patient));
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
    
    async updateProfile(req, res) {
        try {
            const { name, dateOfBirth, gender } = req.body;
            const updatedPatient = await Patient.findByIdAndUpdate(
                req.user.id,
                { name, dateOfBirth, gender },
                { new: true }
            );
            if (!updatedPatient) {
                return res.status(404).json({ message: 'Patient not found' });
            }
            res.status(200).json(sanitizeUser(updatedPatient));
        } catch (error) {
            res.status(400).json({ message: error.message });
        }
    }

    async getAllDoctors(req, res) {
        try {
            const doctors = await Doctor.find().select('-password');
            res.status(200).json(doctors);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    /**
     * Search doctors based on specialty and name
     * @param {*} req 
     * @param {*} res 
     */
    async searchDoctors(req, res) {
        try {
            const { specialty, name, page = 1, limit = 10 } = req.query;
            const { skip, limit: limitParsed } = paginateResults(page, limit);
            const query = {};

            if (specialty) {
                query.specialty = { $regex: specialty, $options: 'i' };
            }

            if (name) {
                query.name = { $regex: name, $options: 'i' };
            }

            const doctors = await Doctor.find(query)
                .skip(skip)
                .limit(limitParsed)
                .select('-password'); // Exclude password field

            const total = await Doctor.countDocuments(query);

            res.status(200).json({
                doctors,
                currentPage: parseInt(page, 10),
                totalPages: Math.ceil(total / limitParsed),
                total
            });
        } catch (error) {
            console.error('Error searching doctors:', error);
            res.status(500).json({ message: error.message });
        }
    }

    async bookAppointment(req, res) {
        try {
            const { doctorId, dateTime, issues } = req.body;
            
            // Validate required fields
            if (!doctorId || !dateTime) {
                return res.status(400).json({ message: 'Doctor ID and date/time are required' });
            }
    
            // Find the doctor
            const doctor = await Doctor.findById(doctorId);
            if (!doctor) {
                return res.status(404).json({ message: 'Doctor not found' });
            }
    
            // Create payment intent
            const paymentIntent = await paymentService.createPaymentIntent(doctor.consultationFee * 100);
    
            // Create new appointment
            const newAppointment = new Appointment({
                doctor: doctorId,
                patient: req.user.id,
                dateTime: new Date(dateTime),
                issues: issues || '',
                status: 'Pending',
                paymentIntentId: paymentIntent.id,
                paymentStatus: 'Pending'
            });
    
            const savedAppointment = await newAppointment.save();
    
            // Send email notification
            const appointmentDetails = {
                title: 'Medical Consultation',
                doctor: doctor.name,
                date: savedAppointment.dateTime,
            };
    
            await emailService.sendNewAppointmentNotification(req.user.email, appointmentDetails);
    
            res.status(201).json({
                appointment: savedAppointment,
                clientSecret: paymentIntent.client_secret
            });
    
        } catch (error) {
            console.error('Error booking appointment:', error);
            res.status(500).json({ 
                message: 'Failed to book appointment',
                error: error.message 
            });
        }
    }

    async updatePaymentStatus(req, res) {
        try {
            const { appointmentId } = req.params;
            const { paymentIntentId, status } = req.body;
    
            console.log('Updating payment status:', { appointmentId, paymentIntentId, status });
    
            if (!appointmentId) {
                return res.status(400).json({ message: 'Appointment ID is required' });
            }
    
            const appointment = await Appointment.findById(appointmentId);
            
            if (!appointment) {
                return res.status(404).json({ message: 'Appointment not found' });
            }
    
            // Verify that this appointment belongs to the logged-in user
            if (appointment.patient.toString() !== req.user.id) {
                return res.status(403).json({ message: 'Unauthorized' });
            }
    
            // Update the appointment
            const updatedAppointment = await Appointment.findByIdAndUpdate(
                appointmentId,
                {
                    paymentStatus: 'Paid',
                    status: 'Pending',
                    paymentIntentId: paymentIntentId
                },
                { new: true }
            );
    
            console.log('Updated appointment:', updatedAppointment);
    
            res.status(200).json(updatedAppointment);
        } catch (error) {
            console.error('Error updating payment status:', error);
            res.status(500).json({ message: error.message });
        }
    }

    async getAppointments(req, res) {
        try {
            const { page, limit } = req.query;
            const { skip, limit: limitParsed } = paginateResults(page, limit);
            const appointments = await Appointment.find({ patient: req.user.id })
                .populate('doctor', 'name specialty')
                .skip(skip)
                .limit(limitParsed)
                .sort({ dateTime: 1 });
            const total = await Appointment.countDocuments({ patient: req.user.id });
            res.status(200).json({
                appointments, // Ensure this is an array
                currentPage: page,
                totalPages: Math.ceil(total / limitParsed),
                total
            });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    
    async submitFeedback(req, res) {
        try {
            const { doctorId, appointmentId, rating, comment } = req.body;

            const newFeedback = new Feedback({
                doctor: doctorId,
                patient: req.user.id,
                appointment: appointmentId,
                rating,
                comment
            });
            const savedFeedback = await newFeedback.save();

            const doctor = await Doctor.findById(doctorId);
            if (!doctor) {
                return res.status(404).json({ message: 'doctor not found' });
            }

            doctor.totalRatings += 1;
            doctor.rating = ((doctor.rating * (doctor.totalRatings - 1)) + rating) / doctor.totalRatings;

            await doctor.save();

            res.status(201).json(savedFeedback);
        } catch (error) {
            res.status(400).json({ message: error.message });
        }
    }

    async getFeedback(req, res) {
        try {
            const { page, limit } = req.query;
            const { skip, limit: limitParsed } = paginateResults(page, limit);
            const feedback = await Feedback.find({ patient: req.user.id })
                .populate('doctor', 'name')
                .skip(skip)
                .limit(limitParsed)
                .sort({ createdAt: -1 });
            const total = await Feedback.countDocuments({ patient: req.user.id });
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

    async getPrescriptions(req, res) {
        try {
            const { page, limit } = req.query;
            const { skip, limit: limitParsed } = paginateResults(page, limit);
            const prescriptions = await Prescription.find({ patient: req.user.id })
                .populate('doctor', 'name')
                .skip(skip)
                .limit(limitParsed)
                .sort({ issuedDate: -1 });
            const total = await Prescription.countDocuments({ patient: req.user.id });
            res.status(200).json({
                prescriptions,
                currentPage: page,
                totalPages: Math.ceil(total / limitParsed),
                total
            });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    async getPrescription(req, res) {
        try {
            const { id } = req.params;
            const prescription = await Prescription.findOne({ patient: req.user.id })
                .populate('doctor', 'name');
            if (!prescription) {
                return res.status(404).json({ message: 'Prescription not found' });
            }
            res.status(200).json(prescription);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    /**
     * Get patient's medical records
     * @param {*} req 
     * @param {*} res 
     */
    async getMedicalRecords(req, res) {
        try {
            const records = await Prescription.find({ patientId: req.user.id })

                .sort({ createdAt: -1 });

            res.status(200).json({ records });
        } catch (error) {
            console.error('Error fetching medical records:', error);
            res.status(500).json({ message: 'Server error while fetching medical records' });
        }
    }

    /**
     * Get patient statistics
     * @param {*} req 
     * @param {*} res 
     */
    async getStats(req, res) {
        try {
            const patientId = req.user.id;

            // Total Appointments
            const totalAppointments = await Appointment.countDocuments({ patient: patientId });

            // Upcoming Visits (appointments in the future)
            const upcomingVisits = await Appointment.countDocuments({
                patient: patientId,
                dateTime: { $gte: new Date() }
            });

            // Active Prescriptions
            const activePrescriptions = await Prescription.countDocuments({
                patient: patientId,
                isActive: true
            });

            // Calculate trends (optional)
            // For simplicity, we'll set trends to 0. You can implement logic to calculate actual trends based on historical data.
            const trends = {
                appointments: 0,
                upcomingVisits: 0,
                prescriptions: 0
            };

            res.status(200).json({
                appointments: { value: totalAppointments, trend: trends.appointments },
                upcomingVisits: { value: upcomingVisits, trend: trends.upcomingVisits },
                prescriptions: { value: activePrescriptions, trend: trends.prescriptions }
            });
        } catch (error) {
            console.error('Error fetching patient stats:', error);
            res.status(500).json({ message: error.message });
        }
    }

    async getDoctorById(req, res) {
        try {
            const doctorId = req.params.id;
            const doctor = await Doctor.findById(doctorId).select('-password');
            if (!doctor) {
                return res.status(404).json({ message: 'doctor not found' });
            }
            res.status(200).json({ doctor });
        } catch (error) {
            console.error('Error fetching doctor by ID:', error);
            res.status(500).json({ message: 'Server error while fetching doctor details' });
        }
    }
}

export default new PatientController();

