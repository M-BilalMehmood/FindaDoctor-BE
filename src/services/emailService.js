import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

const sendEmail = async (to, subject, text, html) => {
    try {
        const info = await transporter.sendMail({
            from: `"FindADoctor" <${process.env.EMAIL_USER}>`,
            to: to,
            subject: subject,
            text: text,
            html: html,
        });
        console.log('Message sent: %s', info.messageId);
        return info;
    } catch (error) {
        console.error('Error sending email:', error);
        throw error;
    }
};

const sendWelcomeEmail = async (user) => {
    const subject = 'Welcome to FindADoctor';
    const text = `Welcome to FindADoctor, ${user.name}! We're excited to have you on board. Start exploring doctors and get personalized recommendations today!`;
    const html = `
    <h1>Welcome to FindADoctor, ${user.name}!</h1>
    <p>We're excited to have you on board. Start exploring doctors and get personalized recommendations today!</p>
    <p>If you have any questions, feel free to reply to this email.</p>
    <p>Happy exploring!</p>
  `;
    return sendEmail(user.email, subject, text, html);
};

const sendPasswordResetEmail = async (user, resetToken) => {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
    const subject = 'Password Reset Request';
    const text = `You requested a password reset. Please go to this link to reset your password: ${resetUrl}`;
    const html = `
    <h1>You requested a password reset</h1>
    <p>Please click on the following link to reset your password:</p>
    <a href="${resetUrl}">${resetUrl}</a>
    <p>If you didn't request this, please ignore this email.</p>
  `;
    return sendEmail(user.email, subject, text, html);
};

const sendNewAppointmentNotification = async (email, appointment) => {
    const subject = `New Appointment Alert: ${appointment.title}`;
    const text = `A new appointment has been scheduled: ${appointment.title}. Doctor: ${appointment.doctor}. Date: ${appointment.date.toDateString()}. Check it out now and add it to your calendar!`;
    const html = `
        <h1>New Appointment Scheduled: ${appointment.title}</h1>
        <p>A new appointment has been scheduled:</p>
        <h2>${appointment.title}</h2>
        <p>Doctor: ${appointment.doctor}</p>
        <p>Date: ${appointment.date.toDateString()}</p>
        <p>Check it out now and add it to your calendar!</p>
    `;
    return sendEmail(email, subject, text, html);
};

const sendAppointmentConfirmation = async (email, appointment) => {
    const subject = `Appointment Confirmed: ${appointment.title}`;
    const text = `Your appointment has been confirmed: ${appointment.title}. Doctor: ${appointment.doctor}. Date: ${appointment.date.toDateString()}. See you there!`;
    const html = `
        <h1>Appointment Confirmed</h1>
        <p>Your appointment has been confirmed:</p>
        <p>Doctor: ${appointment.doctor}</p>
        <p>Date: ${appointment.date.toDateString()}</p>
        <p>Time: ${appointment.time}</p>
        <p>See you there!</p>
    `;
    return sendEmail(email, subject, text, html);
};

export default {
    sendEmail,
    sendWelcomeEmail,
    sendPasswordResetEmail,
    sendNewAppointmentNotification,
    sendAppointmentConfirmation,
};