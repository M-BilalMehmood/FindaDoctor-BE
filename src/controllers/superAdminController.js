import User from '../models/User.js';
import { paginateResults, sanitizeUser } from '../utils/helpers.js';

class SuperAdminController {
    async getDashboard(req, res) {
        try {
            const userCount = await User.countDocuments();
            const doctorCount = await User.countDocuments({ role: 'doctor' });
            const patientCount = await User.countDocuments({ role: 'patient' });
            const adminCount = await User.countDocuments({ role: 'admin' });

            res.status(200).json({
                userCount,
                doctorCount,
                patientCount,
                adminCount
            });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    async getUsers(req, res) {
        try {
            const { page, limit, role } = req.query;
            const { skip, limit: limitParsed } = paginateResults(page, limit);
            const query = {
                ...(role ? { role } : {}),
                isBanned: false // Only get non-banned users
            };
            
            const users = await User.find(query)
                .skip(skip)
                .limit(limitParsed)
                .select('-password')
                .sort({ createdAt: -1 });
    
            const total = await User.countDocuments(query);
    
            res.status(200).json({
                users: users.map(sanitizeUser),
                currentPage: page,
                totalPages: Math.ceil(total / limitParsed),
                total
            });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    async authorizeUser(req, res) {
        try {
            const { id } = req.params;
            const user = await User.findByIdAndUpdate(
                id,
                { 
                    isBanned: false,
                    isActive: true 
                },
                { new: true }
            ).select('-password');
    
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }
    
            res.status(200).json(sanitizeUser(user));
        } catch (error) {
            res.status(400).json({ message: error.message });
        }
    }
    
    async getBannedUsers(req, res) {
        try {
            const { page, limit } = req.query;
            const { skip, limit: limitParsed } = paginateResults(page, limit);
            
            const query = { isBanned: true };
            const users = await User.find(query)
                .skip(skip)
                .limit(limitParsed)
                .select('-password')
                .sort({ createdAt: -1 });

            const total = await User.countDocuments(query);

            res.status(200).json({
                users: users.map(sanitizeUser),
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / limitParsed),
                total
            });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    async banUser(req, res) {
        try {
            const { id } = req.params;
            const user = await User.findByIdAndUpdate(
                id, 
                { isBanned: true }, 
                { new: true }
            ).select('-password');

            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }

            res.status(200).json(sanitizeUser(user));
        } catch (error) {
            res.status(400).json({ message: error.message });
        }
    }

    async searchUsers(req, res) {
        try {
            const { query, role, page, limit } = req.query;
            const { skip, limit: limitParsed } = paginateResults(page, limit);
            const searchQuery = {};
            if (role) searchQuery.role = role;
            if (query) {
                searchQuery.$or = [
                    { name: { $regex: query, $options: 'i' } },
                    { email: { $regex: query, $options: 'i' } }
                ];
            }
            const users = await User.find(searchQuery)
                .skip(skip)
                .limit(limitParsed)
                .select('-password')
                .sort({ createdAt: -1 });
            const total = await User.countDocuments(searchQuery);
            res.status(200).json({
                users: users.map(sanitizeUser),
                currentPage: page,
                totalPages: Math.ceil(total / limitParsed),
                total
            });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
}

export default new SuperAdminController();

