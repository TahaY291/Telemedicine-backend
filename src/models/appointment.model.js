import mongoose from "mongoose";

const appointmentSchema = new mongoose.Schema(
  {
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
    appointmentDate: {
      type: Date,
      required: true,
    },
    timeSlot: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rescheduled", "cancelled", "completed"],
      default: "pending",
    },
    consultationType: {
      type: String,
      enum: ["video", "audio", "chat"],
      default: "video",
    },
    reasonForVisit: {
      type: String,
      required: true,
      trim: true,
    },
    doctorNotes: {
      type: String,
    },
    meetingLink: {
      type: String,
    },
    meetingStartedAt: {
      type: Date,
    },
    meetingEndedAt: {
      type: Date,
    },
    prescription: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Prescription",
    },
    cancelledBy: {
      type: String,
      enum: ["patient", "doctor", "admin"],
    },
    cancellationReason: {
      type: String,
    },
    roomID: {
      type: String,
      unique: true,
      sparse: true,
    },
    callLogs: {
      startedAt: Date,
      endedAt: Date,
      duration: Number,
      terminationReason: {
        type: String,
        enum: ["normal", "dropped", "denied"],
      }
    },
    isReviewed: {
      type: Boolean,
      default: false,
    },
    payment: {
      amount: { type: Number, required: true },
      currency: { type: String, default: "PKR" },
      method: {
        type: String,
        enum: ["stripe", "paypal", "razorpay", "jazzcash", "easypaisa", "cash"],
      },
      status: {
        type: String,
        enum: ["pending", "paid", "failed", "refunded", "partially_refunded"],
        default: "pending",
      },
      transactionId: String,
      paymentIntentId: String,
      paidAt: Date,
      refundedAt: Date,
      refundAmount: { type: Number, default: 0 },
      paymentVerified: { type: Boolean, default: false }
    }
  },
  {
    timestamps: true,
  }
);

export const Appointment = mongoose.model("Appointment", appointmentSchema);
