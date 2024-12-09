import User from "../models/User.js";
import Feedback from "../models/Feedback.js";
import SpamFeedback from "../models/SpamFeedback.js";
import { paginateResults } from "../utils/helpers.js";
import Users from "../models/User.js";

class AdminController {
  async getDashboard(req, res) {
    try {
      const userCount = await User.countDocuments();
      const doctorCount = await User.countDocuments({ role: "doctor" });
      const patientCount = await User.countDocuments({ role: "patient" });
      const feedbackCount = await Feedback.countDocuments();
      const spamFeedbackCount = await SpamFeedback.countDocuments({
        status: "Pending",
      });

      res.status(200).json({
        userCount,
        doctorCount,
        patientCount,
        feedbackCount,
        spamFeedbackCount,
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  async getFeedback(req, res) {
        try {
            const { page, limit } = req.query;
            const { skip, limit: limitParsed } = paginateResults(page, limit);
            
            // Get all spam feedback IDs that are marked as resolved
            const spamFeedbacks = await SpamFeedback.find({ 
                status: { $in: ['Resolved', 'Pending'] } 
            }).select('feedback');
            const spamFeedbackIds = spamFeedbacks.map(sf => sf.feedback);

            // Exclude spam feedbacks from the query
            const feedback = await Feedback.find({
                _id: { $nin: spamFeedbackIds }
            })
                .populate("patient", "name")
                .populate("doctor", "name")
                .skip(skip)
                .limit(limitParsed)
                .sort({ createdAt: -1 });

            const total = await Feedback.countDocuments({
                _id: { $nin: spamFeedbackIds }
            });

            res.status(200).json({
                feedback,
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / limitParsed),
                total
            });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    async moderateFeedback(req, res) {
        try {
        const { id } = req.params;
        const { isModerated } = req.body;
        const feedback = await Feedback.findByIdAndUpdate(
            id,
            { isModerated },
            { new: true }
        );
        if (!feedback) {
            return res.status(404).json({ message: "Feedback not found" });
        }
        res.status(200).json(feedback);
        } catch (error) {
        res.status(400).json({ message: error.message });
        }
    }

    async createSpamFeedback(req, res) {
        try {
            const { feedback, reason } = req.body;
            
            if (!feedback || !reason) {
                return res.status(400).json({
                    message: 'Feedback ID and reason are required'
                });
            }

            // Check if feedback exists
            const feedbackExists = await Feedback.findById(feedback);
            if (!feedbackExists) {
                return res.status(404).json({
                    message: 'Feedback not found'
                });
            }

            // Check if already reported
            const existingReport = await SpamFeedback.findOne({ feedback });
            if (existingReport) {
                return res.status(400).json({
                    message: 'This feedback has already been reported'
                });
            }

            const newSpamFeedback = new SpamFeedback({
                feedback,
                reportedBy: req.user.id,
                reason,
                status: 'Pending'
            });

            await newSpamFeedback.save();

            await newSpamFeedback.populate([
                {
                    path: 'feedback',
                    populate: [
                        { path: 'patient', select: 'name' },
                        { path: 'doctor', select: 'name' }
                    ]
                },
                { path: 'reportedBy', select: 'name' }
            ]);

            res.status(201).json(newSpamFeedback);
        } catch (error) {
            console.error('Error creating spam report:', error);
            res.status(400).json({ message: error.message });
        }
    }

  async resolvespamFeedback(req, res) {
    try {
      const { id } = req.params;
      const { status, resolution } = req.body;
      const spamFeedback = await SpamFeedback.findByIdAndUpdate(
        id,
        { status, resolution },
        { new: true }
      );
      if (!spamFeedback) {
        return res.status(404).json({ message: "Spam report not found" });
      }
      res.status(200).json(spamFeedback);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }

  async getSpamFeedbacks(req, res) {
        try {
            const { page, limit } = req.query;
            const { skip, limit: limitParsed } = paginateResults(page, limit);
            
            // Get all spam feedback reports with populated references
            const spamFeedbacks = await SpamFeedback.find()
                .populate({
                    path: 'feedback',
                    populate: [
                        { path: 'patient', select: 'name' },
                        { path: 'doctor', select: 'name' }
                    ]
                })
                .populate('reportedBy', 'name')
                .skip(skip)
                .limit(limitParsed)
                .sort({ createdAt: -1 });

            const total = await SpamFeedback.countDocuments();

            res.status(200).json({
                spamFeedbacks,
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / limitParsed),
                total
            });
        } catch (error) {
            console.error('Error fetching spam feedback:', error);
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
      ).select("-password");

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.status(200).json(user);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }

  async activateUser(req, res) {
    try {
      const { id } = req.params;
      const user = await User.findByIdAndUpdate(
        id,
        { isBanned: false },
        { new: true }
      ).select("-password");

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.status(200).json(user);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }

  async getUsers(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = 10;
      const role = req.query.role;

      let query = {
        role: { $nin: ["admin", "superAdmin"] }, // Exclude admin and superAdmin
        isBanned: false,
      };

      // Add additional role filter if specified
      if (role && role !== "all") {
        query.role = role;
      }

      const users = await User.find(query)
        .select("-password")
        .limit(limit)
        .skip((page - 1) * limit)
        .sort({ createdAt: -1 });

      const total = await User.countDocuments(query);

      res.json({
        users,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        total,
      });
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: error.message });
    }
  }

  async resolvespamFeedback(req, res) {
    try {
      const { id } = req.params;
      const { status, resolution } = req.body;
      const spamFeedback = await spamFeedback.findByIdAndUpdate(
        id,
        { status, resolution },
        { new: true }
      );
      if (!spamFeedback) {
        return res.status(404).json({ message: "Spam report not found" });
      }
      res.status(200).json(spamFeedback);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }
}

export default new AdminController();
