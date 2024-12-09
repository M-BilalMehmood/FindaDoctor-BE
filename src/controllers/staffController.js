import Staff from "../models/Staff.js";
import Prescription from "../models/Prescription.js";
import Appointment from "../models/Appointment.js";
import Patient from "../models/Patient.js";
import imageUploadService from "../services/imageUploadService.js";
import emailService from "../services/emailService.js";
import { paginateResults, sanitizeUser } from "../utils/helpers.js";

class StaffController {
  async getProfile(req, res) {
    try {
      const staff = await Staff.findById(req.user.id).select("-password");
      if (!staff) {
        return res.status(404).json({ message: "Staff not found" });
      }
      res.status(200).json(sanitizeUser(staff));
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  async updateProfile(req, res) {
    try {
      const { name, department, position } = req.body;
      const updatedStaff = await Staff.findByIdAndUpdate(
        req.user.id,
        { name, department, position },
        { new: true }
      ).select("-password");
      if (!updatedStaff) {
        return res.status(404).json({ message: "Staff not found" });
      }
      res.status(200).json(sanitizeUser(updatedStaff));
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }

  async createPrescription(req, res) {
    try {
      const { doctorName, illnessType, patientId } = req.body;

      if (!doctorName || !illnessType || !patientId) {
        return res
          .status(400)
          .json({
            message: "Doctor name, illness type, and patient ID are required",
          });
      }

      let imageUrl = null;
      if (req.file) {
        imageUrl = await imageUploadService.uploadPrescriptionImage(req.file);
      }

      const newPrescription = new Prescription({
        patientId,
        doctorName,
        illnessType,
        imageUrl,
      });

      const savedPrescription = await newPrescription.save();
      res.status(201).json(savedPrescription);
    } catch (error) {
      console.error("Error uploading prescription:", error);
      res.status(500).json({ message: error.message });
    }
  }

  async scheduleAppointment(req, res) {
    try {
      const { id } = req.params;
      const { slot } = req.body;
      if (!slot) {
        return res.status(400).json({ message: "Slot time is required" });
      }
      const appointment = await Appointment.findById(id)
        .populate("doctor", "name specialty")
        .populate("patient", "name");
      if (!appointment) {
        return res.status(404).json({ message: "Appointment not found" });
      }
      const date = new Date(appointment.dateTime);
      const [time, modifier] = slot.split(" ");
      let [hours, minutes] = time.split(":").map(Number);
      if (modifier.toUpperCase() === "PM" && hours !== 12) {
        hours += 12;
      } else if (modifier.toUpperCase() === "AM" && hours === 12) {
        hours = 0;
      }
      const newDateTime = new Date(date);
      newDateTime.setHours(hours, minutes, 0, 0);

      appointment.dateTime = newDateTime;
      appointment.status = "Scheduled";
      await appointment.save();

      await appointment.populate([
        { path: "doctor", select: "name specialty" },
        { path: "patient", select: "name email" },
      ]);

      console.log("Appointment scheduled:", appointment.patient.email);

      //send email to the patient about the appointment scheduled and confirmation
      await emailService.sendAppointmentConfirmation(
        appointment.patient.email,
        {
          title: appointment.title,
          doctor: appointment.doctor.name,
          date: appointment.dateTime,
          time: `${hours.toString().padStart(2, "0")}:${minutes
            .toString()
            .padStart(2, "0")}`, // Format time
        }
      );

      res.status(200).json(appointment);
    } catch (error) {
      console.error("Error scheduling appointment:", error);
      res.status(500).json({ message: error.message });
    }
  }

  async getPrescriptions(req, res) {
    try {
      const { page, limit, patientId } = req.query;
      const { skip, limit: limitParsed } = paginateResults(page, limit);
      const query = patientId ? { patient: patientId } : {};

      const prescriptions = await Prescription.find(query)
        .populate("doctor", "name")
        .populate("patient", "name")
        .skip(skip)
        .limit(limitParsed)
        .sort({ issuedDate: -1 });

      const total = await Prescription.countDocuments(query);

      res.status(200).json({
        prescriptions,
        currentPage: page,
        totalPages: Math.ceil(total / limitParsed),
        total,
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  async updatePrescription(req, res) {
    try {
      const { id } = req.params;
      const { medications, instructions } = req.body;
      let imageUrl = null;

      if (req.file) {
        imageUrl = await imageUploadService.uploadPrescriptionImage(req.file);
      }

      const updatedPrescription = await Prescription.findByIdAndUpdate(
        id,
        { medications, instructions, ...(imageUrl && { imageUrl }) },
        { new: true }
      );

      if (!updatedPrescription) {
        return res.status(404).json({ message: "Prescription not found" });
      }

      res.status(200).json(updatedPrescription);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }

  async deletePrescription(req, res) {
    try {
      const { id } = req.params;
      const deletedPrescription = await Prescription.findByIdAndDelete(id);

      if (!deletedPrescription) {
        return res.status(404).json({ message: "Prescription not found" });
      }

      res.status(200).json({ message: "Prescription deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  async searchPatients(req, res) {
    try {
      const { name } = req.query;
      const query = {};
      if (name) {
        query.name = { $regex: name, $options: "i" };
      }
      const patients = await Patient.find(query).select("-password");
      res.status(200).json({ patients });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  async getAppointments(req, res) {
    try {
      const { page, limit, status } = req.query;
      const { skip, limit: limitParsed } = paginateResults(page, limit);
      const query = status ? { status } : {};

      const appointments = await Appointment.find(query)
        .populate("doctor", "name")
        .populate("patient", "name")
        .skip(skip)
        .limit(limitParsed)
        .sort({ dateTime: 1 });

      const total = await Appointment.countDocuments(query);

      res.status(200).json({
        appointments,
        currentPage: page,
        totalPages: Math.ceil(total / limitParsed),
        total,
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  async updateAppointment(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const updatedAppointment = await Appointment.findByIdAndUpdate(
        id,
        { status },
        { new: true }
      )
        .populate("doctor", "name")
        .populate("patient", "name");

      if (!updatedAppointment) {
        return res.status(404).json({ message: "Appointment not found" });
      }

      res.status(200).json(updatedAppointment);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }

  async getPatientPrescriptions(req, res) {
    try {
      const { patientId } = req.params;
      const { page, limit } = req.query;
      const { skip, limit: limitParsed } = paginateResults(page, limit);

      const prescriptions = await Prescription.find({ patient: patientId })
        .populate("doctor", "name")
        .skip(skip)
        .limit(limitParsed)
        .sort({ issuedDate: -1 });

      const total = await Prescription.countDocuments({ patient: patientId });

      res.status(200).json({
        prescriptions,
        currentPage: page,
        totalPages: Math.ceil(total / limitParsed),
        total,
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
}

export default new StaffController();
