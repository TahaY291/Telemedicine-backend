import mongoose from "mongoose";

const appointmentSchema = new mongoose.Schema(
  {
    // 🔗 Relationships
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
      required: true,
    },

    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
      required: true,
    },

    // 📅 Appointment Schedule
    appointmentDate: {
      type: Date,
      required: true,
    },

    timeSlot: {
      type: String, // e.g. "10:00 AM - 10:30 AM"
      required: true,
    },

    // 📌 Appointment Status
    status: {
      type: String,
      enum: ["pending", "approved", "rescheduled", "cancelled", "completed"],
      default: "pending",
    },

    // 💻 Consultation Type
    consultationType: {
      type: String,
      enum: ["video", "audio", "chat"],
      default: "video",
    },

    // 📝 Reason & Notes
    reasonForVisit: {
      type: String,
      required: true,
      trim: true,
    },

    doctorNotes: {
      type: String,
    },

    // 🔗 Video Call Info (WebRTC)
    meetingLink: {
      type: String,
    },

    meetingStartedAt: {
      type: Date,
    },

    meetingEndedAt: {
      type: Date,
    },

    // 📄 Prescription Reference
    prescription: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Prescription",
    },

    // ❌ Cancellation Info
    cancelledBy: {
      type: String,
      enum: ["patient", "doctor", "admin"],
    },

    cancellationReason: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

export const Appointment = mongoose.model("Appointment", appointmentSchema);
