import mongoose from "mongoose";

const consultationSchema = new mongoose.Schema(
  {
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
      required: true,
      index: true,
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
      required: true,
      index: true,
    },
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Appointment",
      required: true,
      unique: true, // One consultation per appointment
    },
    prescriptionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Prescription",
    },
    status: {
      type: String,
      enum: ["completed", "cancelled", "no-show"],
      default: "completed",
    },
    consultationDate: {
      type: Date,
      default: Date.now,
    },
    duration: {
      type: Number, // in minutes
      min: 0,
    },
    fees: {
      type: Number,
      required: true,
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// ===== INDEXES =====
consultationSchema.index({ doctorId: 1, status: 1, consultationDate: -1 });
consultationSchema.index({ patientId: 1, consultationDate: -1 });

// ===== AUTO-UPDATE DOCTOR'S CONSULTATION COUNT =====
consultationSchema.post("save", async function (doc) {
  if (doc.status === "completed") {
    try {
      const Doctor = mongoose.model("Doctor");
      
      await Doctor.findByIdAndUpdate(doc.doctorId, {
        $inc: { numberOfConsultations: 1 },
        statsLastUpdated: new Date(),
      });
    } catch (error) {
      console.error("Error updating doctor consultation count:", error);
    }
  }
});

// If consultation is deleted, decrement count
consultationSchema.post("findOneAndDelete", async function (doc) {
  if (doc && doc.status === "completed") {
    try {
      const Doctor = mongoose.model("Doctor");
      
      await Doctor.findByIdAndUpdate(doc.doctorId, {
        $inc: { numberOfConsultations: -1 },
        statsLastUpdated: new Date(),
      });
    } catch (error) {
      console.error("Error updating doctor consultation count:", error);
    }
  }
});

export const Consultation = mongoose.model("Consultation", consultationSchema);