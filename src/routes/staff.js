import express from 'express';
import staffController from '../controllers/staffController.js';
import { authenticateJWT } from '../middleware/auth.js';
import roleCheck from '../middleware/roleCheck.js';
import { prescriptionValidationRules, appointmentValidationRules } from '../utils/validators.js';
import validateRequest from '../middleware/validateRequest.js';
import upload from '../middleware/upload.js';

const router = express.Router();

router.use(authenticateJWT);
router.use(roleCheck(['staff']));

router.get('/profile', staffController.getProfile);
router.put('/profile', staffController.updateProfile);

router.post('/prescriptions', upload.single('prescriptionImage'), prescriptionValidationRules(), (req, res) => staffController.createPrescription(req, res));
router.post('/prescriptions', upload.single('prescriptionImage'), prescriptionValidationRules(), validateRequest, staffController.createPrescription);
router.get('/prescriptions', staffController.getPrescriptions);
router.put('/prescriptions/:id', upload.single('prescriptionImage'), prescriptionValidationRules(), validateRequest, staffController.updatePrescription);
router.delete('/prescriptions/:id', staffController.deletePrescription);

router.get('/appointments', staffController.getAppointments);
router.put('/appointments/:id', appointmentValidationRules(), validateRequest, staffController.updateAppointment);
router.put('/appointments/:id/schedule', staffController.scheduleAppointment);

router.get('/patients/search', staffController.searchPatients);
router.get('/patients/:patientId/prescriptions', staffController.getPatientPrescriptions);

export default router;

