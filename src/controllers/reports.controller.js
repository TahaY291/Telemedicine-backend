import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Doctor } from "../models/doctor.model.js";
import { Patient } from "../models/patient.model.js";
import { Appointment } from "../models/appointment.model.js";
import { Consultation } from "../models/consultation.model.js";


export const getAdminReports = asyncHandler(async (req, res) => {
    if (req.user.role !== "admin") {
        throw new ApiError(403, "Only admin is allowed.");
    }
    const [
        summary,
        mostConsultedDoctors,
        patientSignupsOverTime,
        appointmentsBySpecialty,
    ] = await Promise.all([

        Promise.all([
            Doctor.countDocuments(),
            Patient.countDocuments(),
            Appointment.countDocuments(),
            Consultation.countDocuments(),
        ]).then(([totalDoctors, totalPatients, totalAppointments, totalConsultations]) => ({
            totalDoctors,
            totalPatients,
            totalAppointments,
            totalConsultations,
        })),

        Doctor.aggregate([
            {
                $lookup: {
                    from: "users",
                    localField: "userId",
                    foreignField: "_id",
                    as: "user",
                },
            },
            { $unwind: "$user" },
            {
                $project: {
                    doctorId: "$_id",
                    name: "$user.username",
                    specialization: "$specialization",
                    consultations: "$numberOfConsultations",
                    rating: "$rating",
                    totalReviews: "$totalReviews",
                },
            },
            { $sort: { consultations: -1 } },
            { $limit: 10 },
        ]),

        Patient.aggregate([
            {
                $match: {
                    createdAt: {
                        $gte: new Date(new Date().setFullYear(new Date().getFullYear() - 1)),
                    },
                },
            },
            {
                $group: {
                    _id: {
                        year: { $year: "$createdAt" },
                        month: { $month: "$createdAt" },
                    },
                    count: { $sum: 1 },
                },
            },
            { $sort: { "_id.year": 1, "_id.month": 1 } },
            {
                $project: {
                    _id: 0,
                    month: {
                        $concat: [
                            {
                                $arrayElemAt: [
                                    ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun",
                                        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
                                    "$_id.month"
                                ]
                            },
                            " ",
                            { $toString: "$_id.year" },
                        ],
                    },
                    count: 1,
                },
            },
        ]),


        Appointment.aggregate([
            {
                $lookup: {
                    from: "doctors",
                    localField: "doctor",
                    foreignField: "_id",
                    as: "doctorDoc",
                },
            },
            { $unwind: { path: "$doctorDoc", preserveNullAndEmptyArrays: true } },
            {
                $group: {
                    _id: { $ifNull: ["$doctorDoc.specialization", "Other"] },
                    count: { $sum: 1 },
                },
            },
            { $sort: { count: -1 } },
            { $limit: 10 }, 
            {
                $project: {
                    _id: 0,
                    specialty: "$_id",
                    count: 1,
                },
            },
        ]),
    ]);

    return res.status(200).json(
        new ApiResponse(200, {
            summary,
            mostConsultedDoctors,
            patientSignupsOverTime,
            appointmentsBySpecialty,
        }, "Reports fetched successfully")
    );
});