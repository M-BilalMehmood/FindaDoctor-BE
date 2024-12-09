import { OAuth2Client } from 'google-auth-library';
import dotenv from 'dotenv';

dotenv.config();

export const JWT_SECRET = process.env.JWT_SECRET;
export const JWT_EXPIRE = '24h';

export const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
export const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

export const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);
