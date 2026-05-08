import { ApiError } from "../utils/ApiError.js";
import { Doctor } from "../models/doctor.model.js";

export const authorizeRole = (...roles) => async (req, res, next) => {
    const user = req.user;

    // Step 1 — role check (same as before, nothing breaks)
    if (!roles.includes(user.role)) {
        return next(new ApiError(403, "You are not authorized to perform this action"));
    }

    try {
        // Step 2 — patient extra checks
        if (user.role === "patient" && roles.includes("patient")) {
            if (!user.isVerified) {
                return res.status(403).json({
                    success: false,
                    message: "Please verify your email to access this feature.",
                    code: "EMAIL_NOT_VERIFIED",
                });
            }
            return next();
        }

        // Step 3 — doctor extra checks
        if (user.role === "doctor" && roles.includes("doctor")) {
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
                    message: user.status === "pending"
                        ? "Your account is pending admin approval."
                        : "Your account is not active. Please contact support.",
                    code: "ACCOUNT_NOT_ACTIVE",
                });
            }

            const doctor = await Doctor.findOne({ userId: user._id });

            if (!doctor) {
                return res.status(404).json({
                    success: false,
                    message: "Doctor profile not found. Please complete your profile.",
                    code: "DOCTOR_PROFILE_NOT_FOUND",
                });
            }

            if (!doctor.isVerified) {
                return res.status(403).json({
                    success: false,
                    message: "Your profile is under admin review. You will be notified once approved.",
                    code: "DOCTOR_NOT_VERIFIED",
                    ...(doctor.adminVerification?.rejectionReason && {
                        reason: doctor.adminVerification.rejectionReason,
                    }),
                });
            }

            req.doctor = doctor; // attach for controllers to reuse
            return next();
        }

        // Step 4 — admin or any other role — just role check is enough
        next();

    } catch (error) {
        next(new ApiError(500, "Authorization check failed"));
    }
};