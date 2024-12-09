import express from 'express';
import doctorController from '../controllers/doctorController.js';
import { authenticateJWT } from '../middleware/auth.js';
import roleCheck from '../middleware/roleCheck.js';
import { prescriptionValidationRules } from '../utils/validators.js';
import validateRequest from '../middleware/validateRequest.js';
import upload from '../middleware/upload.js';

const router = express.Router();

router.use(authenticateJWT);
router.use(roleCheck(['doctor']));

router.get('/profile', doctorController.getProfile);
router.put('/profile', doctorController.updateProfile);
router.post('/profile/picture', upload.single('profilePicture'), doctorController.uploadProfilePicture);
router.get('/appointments', doctorController.getAppointments);
router.put('/appointments/:id', doctorController.updateAppointment);
router.get('/stats', doctorController.getStats);
router.get('/patients', doctorController.getPatients);
router.get('/patients/:id/history', doctorController.getPatientHistory);
router.get('/feedback', doctorController.getFeedback);

export default router;

