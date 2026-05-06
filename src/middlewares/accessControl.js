import { Doctor } from "../models/doctor.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const requirePatientAccess = asyncHandler(async (req, res, next) => {
  const user = req.user;

  if (user.role !== "patient") {
    return res.status(403).json({
      success: false,
      message: "Access denied. Patients only.",
    });
  }

  if (!user.isVerified) {
    return res.status(403).json({
      success: false,
      message: "Please verify your email to access this feature.",
      code: "EMAIL_NOT_VERIFIED", // useful for frontend to show the right UI
    });
  }

  next();
});

export const requireDoctorAccess = asyncHandler(async (req, res, next) => {
  const user = req.user;

  if (user.role !== "doctor") {
    return res.status(403).json({
      success: false,
      message: "Access denied. Doctors only.",
    });
  }

  if (!user.isVerified) {
    return res.status(403).json({
      success: false,
      message: "Please verify your email to access this feature.",
      code: "EMAIL_NOT_VERIFIED",
    });
  }

  if (user.status !== "active") {
    return res.status(403).json({
      success: false,
      message:
        user.status === "pending"
          ? "Your account is pending admin approval."
          : "Your account is not active. Please contact support.",
      code: "ACCOUNT_NOT_ACTIVE",
    });
  }

  const doctor = await Doctor.findOne({ user: user._id });

  if (!doctor) {
    return res.status(404).json({
      success: false,
      message: "Doctor profile not found. Please complete your profile.",
      code: "DOCTOR_PROFILE_NOT_FOUND",
    });
  }

  if (!doctor.adminVerification?.isVerified) {
    return res.status(403).json({
      success: false,
      message:
        "Your profile is under admin review. You will be notified once approved.",
      code: "DOCTOR_NOT_VERIFIED",

      ...(doctor.adminVerification?.rejectionReason && {
        reason: doctor.adminVerification.rejectionReason,
      }),
    });
  }

  req.doctor = doctor;
  next();
});


export const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Allowed roles: ${roles.join(", ")}`,
      });
    }
    next();
  };
};