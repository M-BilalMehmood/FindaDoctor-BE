import express from 'express';
import adminController from '../controllers/adminController.js';
import { authenticateJWT } from '../middleware/auth.js';
import roleCheck from '../middleware/roleCheck.js';

const router = express.Router();

router.use(authenticateJWT);
router.use(roleCheck(['admin']));

// Existing routes
router.get('/dashboard', adminController.getDashboard);
router.get('/feedback', adminController.getFeedback);
router.get('/users', adminController.getUsers);
router.put('/feedback/:id/moderate', adminController.moderateFeedback);

// webengbackend/src/routes/admin.js
router.post('/spam-feedback', adminController.createSpamFeedback);
router.get('/spam-feedback', adminController.getSpamFeedbacks);
router.put('/spam-feedback/:id/resolve', adminController.resolvespamFeedback);

// User management routes2
router.put('/users/:id/ban', adminController.banUser);
router.put('/users/:id/activate', adminController.activateUser);

export default router;