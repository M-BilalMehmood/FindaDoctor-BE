import express from 'express';
import patientController from '../controllers/patientController.js';
import { authenticateJWT } from '../middleware/auth.js';
import roleCheck from '../middleware/roleCheck.js';
import { appointmentValidationRules, feedbackValidationRules } from '../utils/validators.js';
import validateRequest from '../middleware/validateRequest.js';

const router = express.Router();

router.use(authenticateJWT);
router.use(roleCheck(['patient']));

router.get('/profile', patientController.getProfile);
router.put('/profile', patientController.updateProfile);
router.get('/stats', patientController.getStats);
router.get('/doctors', patientController.getAllDoctors);
router.get('/doctors/search', patientController.searchDoctors);
router.get('/doctors/:id', patientController.getDoctorById);
router.post('/appointments/:appointmentId/payment', patientController.updatePaymentStatus);
router.post('/appointments', appointmentValidationRules(), validateRequest, patientController.bookAppointment);
router.get('/appointments', patientController.getAppointments);
router.post('/feedback', feedbackValidationRules(), validateRequest, patientController.submitFeedback);
router.get('/feedback', patientController.getFeedback);
router.get('/medical-records', patientController.getMedicalRecords);
router.get('/prescriptions', patientController.getPrescriptions);
router.get('/prescriptions/:id', patientController.getPrescription);

export default router;

