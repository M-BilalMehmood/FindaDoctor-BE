import express from 'express';
import authController from '../controllers/authController.js';
import { registerValidationRules, loginValidationRules } from '../utils/validators.js';
import validateRequest from '../middleware/validateRequest.js';

const router = express.Router();

//router.post('/register', registerValidationRules(), validateRequest, authController.register);
router.post('/register', authController.register);
router.post('/login', loginValidationRules(), validateRequest, authController.login);
router.post('/google-login', authController.googleLogin);
router.post('/google-signup', authController.googleSignup);
router.post('/complete-profile', authController.completeProfile);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

export default router;

