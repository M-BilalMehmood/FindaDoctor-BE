import mongoose from "mongoose";
import User from "./User.js";

const staffSchema = new mongoose.Schema(
  {
    department: {
      type: String,
      required: true,
      enum: ["Reception", "Pharmacy", "Lab", "Nursing", "Administration"],
    },
    position: {
      type: String,
      required: true,
    },
    employeeId: {
      type: String,
      required: true,
      unique: true,
    },
    dateOfJoining: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

const Staff = User.discriminator("Staff", staffSchema);

export default Staff;
