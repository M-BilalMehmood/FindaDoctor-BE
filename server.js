import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import connectDB from './src/config/database.js';
import { v2 as cloudinary } from 'cloudinary';
import superAdminRoutes from './src/routes/superAdmin.js';
import adminRoutes from './src/routes/admin.js';
import doctorRoutes from './src/routes/doctor.js';
import patientRoutes from './src/routes/patient.js';
import staffRoutes from './src/routes/staff.js';
import authRoutes from './src/routes/auth.js';
import errorHandler from './src/middleware/errorHandler.js';
import bodyParser from 'body-parser';

dotenv.config();

const app = express();

// Connect to database
connectDB().then(() => console.log('^_^'));

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Middleware
app.use(bodyParser.json());

app.use(cors({
    origin: 'https://finda-doctor.vercel.app',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    exposedHeaders: ['set-cookie']
}));
app.use(cookieParser());
app.use(express.json());
app.use((req, res, next) => {
    res.header('Cross-Origin-Opener-Policy', 'same-origin');
    res.header('Cross-Origin-Embedder-Policy', 'require-corp');
    next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/super-admin', superAdminRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/doctor', doctorRoutes);
app.use('/api/patient', patientRoutes);
app.use('/api/staff', staffRoutes);

app.get('/api/index', (req, res) => {
  res.send('Welcome to the FindaDoctor API');
});

// Error handling middleware
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));