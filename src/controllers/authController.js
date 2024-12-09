import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import Doctor from "../models/Doctor.js";
import Patient from "../models/Patient.js";
import Staff from "../models/Staff.js";
import { JWT_SECRET, googleClient } from "../config/auth.js";
import emailService from "../services/emailService.js";
import { sanitizeUser, generateRandomString } from "../utils/helpers.js";
import { OAuth2Client } from "google-auth-library";

class AuthController {
  constructor() {
    this.generateToken = this.generateToken.bind(this);
    this.register = this.register.bind(this);
    this.login = this.login.bind(this);
  }

  generateToken(user) {
    return jwt.sign({ id: user._id }, JWT_SECRET, {
      expiresIn: "1h",
    });
  }

  async register(req, res) {
    try {
      const { name, email, password, role, ...additionalInfo } = req.body;
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
      }

      let newUser;

      switch (role) {
        case "doctor":
          newUser = new Doctor({
            name,
            email,
            password,
            role,
            ...additionalInfo,
          });
          break;
        case "patient":
          newUser = new Patient({
            name,
            email,
            password,
            role,
            ...additionalInfo,
          });
          break;
        case "staff":
          newUser = new Staff({
            name,
            email,
            password,
            role,
            ...additionalInfo,
          });
          break;
        default:
          newUser = new User({ name, email, password, role });
      }

      await newUser.save();

      // Send welcome email
      await emailService.sendWelcomeEmail(newUser);

      res.status(201).json({ message: "User registered successfully" });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  async completeProfile(req, res) {
    try {
      const { userId, role, ...additionalData } = req.body;

      let user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Assign role-specific fields
      switch (role) {
        case "doctor":
          user.specialty = additionalData.specialty;
          user.qualifications = additionalData.qualifications;
          user.experience = additionalData.experience;
          user.PMDCRegistrationNumber = additionalData.PMDCRegistrationNumber;
          user.consultationFee = additionalData.consultationFee;
          break;
        case "patient":
          user.dateOfBirth = additionalData.dateOfBirth;
          user.gender = additionalData.gender;
          break;
        case "staff":
          user.department = additionalData.department;
          user.position = additionalData.position;
          user.employeeId = additionalData.employeeId;
          break;
        default:
          break;
      }

      user.profileComplete = true;
      await user.save();

      // Generate JWT token
      const jwtToken = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, {
        expiresIn: "1d",
      });
      res.status(200).json({ token: jwtToken, user });
    } catch (error) {
      console.error("Complete profile error:", error);
      res.status(500).json({ message: "Failed to complete profile" });
    }
  }

  async googleSignup(req, res) {
    try {
      const { token, role } = req.body;

      if (!token || !role) {
        return res.status(400).json({
          message: "Token and role are required",
        });
      }

      const ticket = await googleClient.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      const { name, email } = ticket.getPayload();

      // Check if user already exists
      let user = await User.findOne({ email });

      if (!user) {
        // Create a basic user first
        const baseUserData = {
          name,
          email,
          role,
          isOAuthUser: true,
          profileComplete: false,
        };

        // Create the user based on role but with minimal required fields
        switch (role) {
          case "doctor":
            user = new Doctor({
              ...baseUserData,
              specialty: "Pending", // Temporary value
              qualifications: ["Pending"], // Temporary value
              experience: 0, // Temporary value
              PMDCRegistrationNumber: "Pending", // Temporary value
              consultationFee: 0, // Temporary value
            });
            break;
          case "patient":
            user = new Patient({
              ...baseUserData,
              dateOfBirth: new Date(), // Temporary value
              gender: "Other", // Temporary value
            });
            break;
          case "staff":
            user = new Staff({
              ...baseUserData,
              department: "Pending", // Temporary value
              position: "Pending", // Temporary value
              employeeId: "Pending", // Temporary value
            });
            break;
          default:
            user = new User(baseUserData);
        }

        await user.save();

        return res.status(200).json({
          user: {
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
          },
          requiresAdditionalInfo: true,
        });
      }

      // If user exists but profile is not complete
      if (!user.profileComplete) {
        return res.status(200).json({
          user: {
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
          },
          requiresAdditionalInfo: true,
        });
      }

      // User exists and profile is complete
      const jwtToken = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, {
        expiresIn: "1d",
      });

      res.cookie("token", jwtToken, {
        httpOnly: true,
        secure: true, // Enable for HTTPS
        sameSite: "none", // Required for cross-origin cookies
        maxAge: 24 * 60 * 60 * 1000, // 1 day
      });

      return res.status(200).json({
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      });
    } catch (error) {
      console.error("Google signup error:", error);
      res.status(500).json({
        message: "Error processing Google signup",
        error: error.message,
      });
    }
  }

  async login(req, res) {
    try {
      const { email, password } = req.body;
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(400).json({ message: "Invalid credentials" });
      }
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({ message: "Invalid credentials" });
      }
      const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, {
        expiresIn: "1d",
      });
      // Set the token as an HTTP-only cookie
      res.cookie("token", token, {
        httpOnly: true,
        secure: true, // Enable for HTTPS
        sameSite: "none", // Required for cross-origin cookies
        maxAge: 24 * 60 * 60 * 1000, // 1 day
      });
      res.status(200).json({
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: error.message });
    }
  }

  async googleLogin(req, res) {
    try {
      const { token } = req.body;
      const ticket = await googleClient.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      const { name, email } = ticket.getPayload();
      let user = await User.findOne({ email });
      if (!user) {
        return res.status(400).json({ message: "User not found" });
      }

      const jwtToken = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, {
        expiresIn: "1d",
      });

      // Set the cookie properly
      res.cookie("token", jwtToken, {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        maxAge: 24 * 60 * 60 * 1000, // 1 day
      });

      res.status(200).json({
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  async forgotPassword(req, res) {
    try {
      const { email } = req.body;
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const resetToken = generateRandomString(20);
      user.resetPasswordToken = resetToken;
      user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
      await user.save();

      await emailService.sendPasswordResetEmail(email, resetToken);

      res.status(200).json({ message: "Password reset email sent" });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  async resetPassword(req, res) {
    try {
      const { token, newPassword } = req.body;
      const user = await User.findOne({
        resetPasswordToken: token,
        resetPasswordExpires: { $gt: Date.now() },
      });
      if (!user) {
        return res.status(400).json({ message: "Invalid or expired token" });
      }
      user.password = newPassword;
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();
      res.status(200).json({ message: "Password reset successful" });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
}

export default new AuthController();
