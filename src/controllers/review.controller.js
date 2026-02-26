import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { Review } from "../models/review.model.js";
import { Appointment } from "../models/appointment.model.js";
import { Patient } from "../models/patient.model.js";
import { createReviewSchema } from "../utils/validation/review.validation.js";

export const createReview = asyncHandler(async (req, res) => {
    const { appointmentId, rating, comment, punctuality, communication, treatment } = req.body;

    const validation = createReviewSchema.safeParse(req.body);
    if (!validation.success) {
        throw new ApiError(400, "Invalid review data", validation.error.errors);
    }

    const patientProfile = await Patient.findOne({ user: req.user._id }).select("_id");
    if (!patientProfile) throw new ApiError(404, "Patient profile not found");

    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) throw new ApiError(404, "Appointment not found");

    if (appointment.patient.toString() !== patientProfile._id.toString()) {
        throw new ApiError(403, "You can only review your own appointments");
    }
    if (appointment.status !== "completed") {
        throw new ApiError(400, "Only completed appointments can be reviewed");
    }
    if (appointment.isReviewed) {
        throw new ApiError(400, "Review already exists for this appointment");
    }

    const session = await mongoose.startSession();
    try {
        let newReview;
        await session.withTransaction(async () => {
            [newReview] = await Review.create([{
                doctorId: appointment.doctor,
                patientId: patientProfile._id,
                appointmentId,
                rating,
                comment,
                punctuality,
                communication,
                treatment,
            }], { session });

            appointment.isReviewed = true;
            await appointment.save({ session });
        });

        return res.status(201).json(new ApiResponse(201, newReview, "Review submitted successfully"));
    } finally {
        session.endSession();
    }
});

export const getDoctorReviews = asyncHandler(async (req, res) => {
    const { doctorId } = req.params;

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
        Review.find({ doctorId })
            .populate("patientId", "personalInfo.profileImage") 
            .populate({
                path: "patientId",
                populate: { path: "user", select: "username" },
            })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit),
        Review.countDocuments({ doctorId }),
    ]);

    return res.status(200).json(
        new ApiResponse(200, {
            reviews,
            pagination: {
                total,
                page,
                totalPages: Math.ceil(total / limit),
                hasMore: page * limit < total,
            },
        }, "Doctor reviews fetched successfully")
    );
});

export const getMyReviews = asyncHandler(async (req, res) => {
    const patientProfile = await Patient.findOne({ user: req.user._id });
    if (!patientProfile) {
        throw new ApiError(404, "Patient profile not found");
    }

    const reviews = await Review.find({ patientId: patientProfile._id })
        .populate("doctorId", "userId specialization doctorImage")
        .populate("appointmentId", "appointmentDate timeSlot")
        .sort({ createdAt: -1 });

    return res
        .status(200)
        .json(new ApiResponse(200, reviews, "Your reviews fetched successfully"));
});

export const updateReview = asyncHandler(async (req, res) => {
    const patientProfile = await Patient.findOne({ user: req.user._id }).select("_id");
    if (!patientProfile) throw new ApiError(404, "Patient profile not found");

    const review = await Review.findById(req.params.reviewId);
    if (!review) throw new ApiError(404, "Review not found");

    if (review.patientId.toString() !== patientProfile._id.toString()) {
        throw new ApiError(403, "You can only update your own reviews");
    }
    const validation = updateReviewSchema.safeParse(req.body);
    if (!validation.success) {
        throw new ApiError(400, "Invalid update data", validation.error.errors);
    }

    const updatedReview = await Review.findByIdAndUpdate(
        req.params.reviewId,
        { $set: validation.data },
        { new: true, runValidators: true }
    );

    return res.status(200).json(new ApiResponse(200, updatedReview, "Review updated successfully"));
});

export const deleteReview = asyncHandler(async (req, res) => {
    const review = await Review.findById(req.params.reviewId);
    if (!review) throw new ApiError(404, "Review not found");

    if (req.user.role !== "admin") {
        const patientProfile = await Patient.findOne({ user: req.user._id }).select("_id");
        if (!patientProfile || review.patientId.toString() !== patientProfile._id.toString()) {
            throw new ApiError(403, "Access denied");
        }
    }

    const session = await mongoose.startSession();
    try {
        await session.withTransaction(async () => {
            await Review.findByIdAndDelete(req.params.reviewId, { session });

            await Appointment.findByIdAndUpdate(
                review.appointmentId,
                { isReviewed: false },
                { session }
            );
        });

        return res.status(200).json(new ApiResponse(200, null, "Review deleted successfully"));
    } finally {
        session.endSession();
    }
});