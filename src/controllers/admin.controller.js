import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Doctor } from "../models/doctor.model.js";
import { Patient } from "../models/patient.model.js";
import { Appointment } from "../models/appointment.model.js";
import { Consultation } from "../models/consultation.model.js";
import { User } from "../models/user.model.js";
import mongoose from "mongoose";

export const getTotalModalData = asyncHandler(async (req, res) => {
    if (req.user.role !== "admin") {
        throw new ApiError(403, "Only admin is allowed.");
    }

    const [totalDoctors, totalPatients, totalAppointments, totalConsultations] =
        await Promise.all([
            Doctor.countDocuments(),
            Patient.countDocuments(),
            Appointment.countDocuments(),
            Consultation.countDocuments(),
        ]);

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                { totalDoctors, totalPatients, totalAppointments, totalConsultations },
                "Dashboard stats fetched successfully"
            )
        );
});

export const getRecentActivity = asyncHandler(async (req, res) => {
    if (req.user.role !== "admin") {
        throw new ApiError(403, "Only admin is allowed.");
    }

    const [recentAppointments, recentPatients] = await Promise.all([
        Appointment.find()
            .sort({ createdAt: -1 })
            .limit(5)
            .populate({
                path: "patient",
                populate: {
                    path: "user",
                    select: "username email"
                }
            })
            .populate({
                path: "doctor",
                populate: {
                    path: "userId",
                    select: "username email"
                }
            }),

        Patient.find()
            .sort({ createdAt: -1 })
            .limit(5)
            .populate("user", "username email createdAt"),
    ]);

    const getName = (user) =>
        user?.name || user?.username || "Unknown";
    // Merge & sort both into one unified feed
    const activityFeed = [
        ...recentAppointments.map((appt) => ({
            type: "booking",
            message: `${getName(appt.patient?.user)} booked an appointment with Dr. ${getName(appt.doctor?.userId)}`,
            date: appt.createdAt,
        })),
        ...recentPatients.map((patient) => ({
            type: "signup",
            message: `${patient.name} signed up`,
            date: patient.createdAt,
        })),
    ].sort((a, b) => new Date(b.date) - new Date(a.date)) // latest first
        .slice(0, 10); // max 10 items in feed

    return res
        .status(200)
        .json(new ApiResponse(200, { activityFeed }, "Recent activity fetched successfully"));
});

export const getWeeklyAppointmentsChart = asyncHandler(async (req, res) => {
    if (req.user.role !== "admin") {
        throw new ApiError(403, "Only admin is allowed.");
    }


    const now = new Date();
    const dayOfWeek = now.getDay();

    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - ((dayOfWeek + 6) % 7));
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    const result = await Appointment.aggregate([
        {
            $match: {
                createdAt: { $gte: startOfWeek, $lte: endOfWeek },
            },
        },
        {
            $group: {
                _id: { $dayOfWeek: "$createdAt" },
                count: { $sum: 1 },
            },
        },
        {
            $sort: { _id: 1 },
        },
    ]);


    const dayMap = {
        2: "Mon", 3: "Tue", 4: "Wed",
        5: "Thu", 6: "Fri", 7: "Sat", 1: "Sun",
    };


    const chartData = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => {
        const found = result.find((r) => dayMap[r._id] === day);
        return { day, count: found ? found.count : 0 };
    });

    return res
        .status(200)
        .json(new ApiResponse(200, { chartData }, "Weekly appointments chart data fetched successfully"));
});



export const getDoctorById = asyncHandler(async (req, res) => {
    const { doctorId } = req.params;

    const profile = await Doctor.findById(doctorId).populate(
        "userId",
        "username email role status isVerified"
    );

    if (!profile) {
        throw new ApiError(404, "Doctor not found");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, profile, "Doctor profile fetched successfully"));
});

export const deleteDoctorProfile = asyncHandler(async (req, res) => {
    const { doctorId } = req.params;
    const deleted = await Doctor.findByIdAndDelete(doctorId);

    if (!deleted) {
        throw new ApiError(404, "Doctor profile not found");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, null, "Doctor profile deleted successfully"));
});

export const listDoctors = asyncHandler(async (req, res) => {
    const { specialization, city, } = req.query;

    const filter = {};

    if (specialization) {
        filter.specialization = {
            $regex: specialization,
            $options: "i",
        };
    }

    if (city) {
        filter["location.city"] = {
            $regex: city,
            $options: "i",
        };
    }

    filter.isActive = true;

    const doctors = await Doctor.find(filter)
        .populate("userId", "username email status isVerified")
        .sort({ rating: -1, numberOfConsultations: -1 });

    return res
        .status(200)
        .json(new ApiResponse(200, doctors, "Doctors fetched successfully"));
});

export const updateDoctorStatus = asyncHandler(async (req, res) => {
    const { doctorId } = req.params;
    const { status } = req.body;

    if (!["active", "blocked", "pending"].includes(status)) {
        throw new ApiError(400, "Invalid status value");
    }

    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
        throw new ApiError(404, "Doctor profile not found");
    }

    const user = await User.findById(doctor.userId);
    if (!user) {
        throw new ApiError(404, "Associated user not found");
    }

    if (!user._id.equals(doctor.userId)) {
        throw new ApiError(400, "User and doctor profile mismatch");
    }

    user.status = status;

    if (status === "active") {
        doctor.isVerified = true;
    } else {
        doctor.isVerified = false;
    }

    await user.save();
    await doctor.save();

    return res.status(200).json(
        new ApiResponse(200, { doctor, user }, `Doctor status updated to ${status}`)
    );
});
export const getDoctorStatsForAdmin = asyncHandler(async (req, res) => {
    if (req.user.role !== "admin") {                    // ✅ quoted string
        throw new ApiError(403, "Only admin is allowed");
    }

    const { doctorId } = req.params;                   // ✅ destructured
    const doctorObjectId = new mongoose.Types.ObjectId(doctorId);

    const [appointmentStats, consultationStats, doctor] = await Promise.all([  // ✅ capital P
        Appointment.aggregate([
            { $match: { doctor: doctorObjectId } },
            {
                $group: {
                    _id: null,
                    totalAppointments: { $sum: 1 },
                    completedAppointments: {
                        $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] }
                    },
                    cancelledAppointments: {
                        $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] }
                    },
                    pendingAppointments: {
                        $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] }
                    },
                    approvedAppointments: {
                        $sum: { $cond: [{ $eq: ["$status", "approved"] }, 1, 0] }
                    },
                    totalRevenue: {
                        $sum: {
                            $cond: [{ $eq: ["$payment.status", "paid"] }, "$payment.amount", 0]
                        }
                    }
                }
            }
        ]),
        Consultation.aggregate([
            { $match: { doctorId: doctorObjectId } },
            {
                $group: {
                    _id: null,
                    totalConsultations: { $sum: 1 },
                    completedConsultations: {
                        $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] }
                    },
                    cancelledConsultations: {
                        $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] }
                    },
                    noShowConsultations: {
                        $sum: { $cond: [{ $eq: ["$status", "no-show"] }, 1, 0] }
                    },
                    avgDuration: { $avg: "$duration" },
                }
            }
        ]),
        Doctor.findById(doctorId)
            .select("rating totalReviews isVerified numberOfConsultations createdAt")  // ✅ typos fixed
            .lean(),
    ]);

    if (!doctor) {
        throw new ApiError(404, "Doctor not found.");
    }

    const aStats = appointmentStats[0] || {
        totalAppointments: 0,
        completedAppointments: 0,
        cancelledAppointments: 0,
        pendingAppointments: 0,
        approvedAppointments: 0,
        totalRevenue: 0,
    };

    const cStats = consultationStats[0] || {
        totalConsultations: 0,
        completedConsultations: 0,
        cancelledConsultations: 0,
        noShowConsultations: 0,
        avgDuration: 0,
    };

    const cancellationRate = aStats.totalAppointments > 0
        ? ((aStats.cancelledAppointments / aStats.totalAppointments) * 100).toFixed(1)
        : "0.0";

    return res.status(200).json(
        new ApiResponse(200, {
            totalAppointments: aStats.totalAppointments,
            completedAppointments: aStats.completedAppointments,
            cancelledAppointments: aStats.cancelledAppointments,
            pendingAppointments: aStats.pendingAppointments,
            approvedAppointments: aStats.approvedAppointments,
            cancellationRate: `${cancellationRate}%`,
            totalConsultations: cStats.totalConsultations,
            completedConsultations: cStats.completedConsultations,
            cancelledConsultations: cStats.cancelledConsultations,
            noShowConsultations: cStats.noShowConsultations,
            avgDuration: cStats.avgDuration
                ? `${Math.round(cStats.avgDuration)} mins`
                : null,
            rating: doctor.rating,
            totalReviews: doctor.totalReviews,
            isVerified: doctor.isVerified,
            numberOfConsultations: doctor.numberOfConsultations,
            joinedDate: doctor.createdAt,
        }, "Doctor stats fetched successfully")
    );
});