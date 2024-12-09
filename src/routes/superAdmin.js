import express from 'express';
import superAdminController from '../controllers/superAdminController.js';
import { authenticateJWT } from '../middleware/auth.js';
import roleCheck from '../middleware/roleCheck.js';

const router = express.Router();

router.use(authenticateJWT);
router.use(roleCheck(['superAdmin']));

router.get('/dashboard', superAdminController.getDashboard);
router.get('/users', superAdminController.getUsers);
router.get('/users/banned', superAdminController.getBannedUsers);
router.put('/users/:id/authorize', superAdminController.authorizeUser);
router.put('/users/:id/ban', superAdminController.banUser);
router.get('/users/search', superAdminController.searchUsers);

export default router;