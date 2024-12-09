import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { JWT_SECRET } from '../config/auth.js';

export const authenticateJWT = async (req, res, next) => {
    try {
        const token = req.cookies.token; // Use cookie-parser to access cookies
        if (!token) {
            console.log('No token found in cookie');
            return res.status(401).json({ message: 'Not authorized, no token' });
        }

        try {
            //console.log('Attempting to verify token');
            const decoded = jwt.verify(token, JWT_SECRET);

            const user = await User.findById(decoded.id).select('-password');
            // console.log('User found:', user ? 'Yes' : 'No');

            if (!user) {
                return res.status(401).json({ message: 'Not authorized, user not found' });
            }

            req.user = user;
            next();
        } catch (verifyError) {
            console.error('Token verification failed:', verifyError);
            return res.status(401).json({ message: 'Not authorized, token verification failed', error: verifyError.message });
        }
    } catch (error) {
        console.error('Middleware error:', error);
        res.status(500).json({ message: 'Server error in auth middleware' });
    }
};

export const authorizeRole = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ message: 'Forbidden' });
        }

        next();
    };
};

export const isActive = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user || !user.isActive) {
            return res.status(403).json({ message: 'Account is not active' });
        }
        next();
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};