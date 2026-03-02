import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { Consultation } from "../models/consultation.model.js";
import { Doctor } from "../models/doctor.model.js";
import { Patient } from "../models/patient.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import {
    updateConsultationSchema,
    consultationQuerySchema,
} from "../utils/validation/consultation.validation.js";

export const getConsultationById = asyncHandler(async (req, res) => {
    const consultation = await Consultation.findById(req.params.consultationId)
        .populate("doctorId", "userId specialization doctorImage")
        .populate("patientId", "personalInfo phoneNumber")
        .populate("appointmentId", "appointmentDate timeSlot consultationType reasonForVisit")
        .populate("prescriptionId");

    if (!consultation) throw new ApiError(404, "Consultation not found");

    const doctorProfile = await Doctor.findOne({ userId: req.user._id });
    const patientProfile = await Patient.findOne({ user: req.user._id });

    const isDoctor = doctorProfile && consultation.doctorId._id.toString() === doctorProfile._id.toString();
    const isPatient = patientProfile && consultation.patientId._id.toString() === patientProfile._id.toString();
    const isAdmin = req.user.role === "admin";

    if (!isDoctor && !isPatient && !isAdmin) {
        throw new ApiError(403, "You are not authorized to view this consultation");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, consultation, "Consultation fetched successfully"));
});

export const getMyConsultations = asyncHandler(async (req, res) => {
    const validation = consultationQuerySchema.safeParse(req.query);
    if (!validation.success) {
        throw new ApiError(400, "Invalid query parameters", validation.error.errors);
    }

    const { status, from, to, page = 1, limit = 10 } = validation.data;

    const patientProfile = await Patient.findOne({ user: req.user._id });
    if (!patientProfile) throw new ApiError(404, "Patient profile not found");

    const filter = { patientId: patientProfile._id };
    if (status) filter.status = status;
    if (from || to) {
        filter.consultationDate = {};
        if (from) filter.consultationDate.$gte = new Date(from);
        if (to) filter.consultationDate.$lte = new Date(to);
    }

    const skip = (page - 1) * limit;

    const [consultations, total] = await Promise.all([
        Consultation.find(filter)
            .populate("doctorId", "userId specialization doctorImage")
            .populate("appointmentId", "appointmentDate timeSlot consultationType")
            .populate("prescriptionId", "diagnosis medicines followUpDate")
            .sort({ consultationDate: -1 })
            .skip(skip)
            .limit(limit),
        Consultation.countDocuments(filter),
    ]);

    return res.status(200).json(
        new ApiResponse(200, {
            consultations,
            pagination: {
                total,
                page,
                totalPages: Math.ceil(total / limit),
                hasMore: page * limit < total,
            },
        }, "Consultations fetched successfully")
    );
});

export const getDoctorConsultations = asyncHandler(async (req, res) => {
    const validation = consultationQuerySchema.safeParse(req.query);
    if (!validation.success) {
        throw new ApiError(400, "Invalid query parameters", validation.error.errors);
    }

    const { status, from, to, page = 1, limit = 10 } = validation.data;

    const doctorProfile = await Doctor.findOne({ userId: req.user._id });
    if (!doctorProfile) throw new ApiError(404, "Doctor profile not found");

    const filter = { doctorId: doctorProfile._id };
    if (status) filter.status = status;
    if (from || to) {
        filter.consultationDate = {};
        if (from) filter.consultationDate.$gte = new Date(from);
        if (to) filter.consultationDate.$lte = new Date(to);
    }

    const skip = (page - 1) * limit;

    const [consultations, total] = await Promise.all([
        Consultation.find(filter)
            .populate("patientId", "personalInfo phoneNumber medicalInfo")
            .populate("appointmentId", "appointmentDate timeSlot consultationType reasonForVisit")
            .populate("prescriptionId", "diagnosis medicines")
            .sort({ consultationDate: -1 })
            .skip(skip)
            .limit(limit),
        Consultation.countDocuments(filter),
    ]);

    return res.status(200).json(
        new ApiResponse(200, {
            consultations,
            pagination: {
                total,
                page,
                totalPages: Math.ceil(total / limit),
                hasMore: page * limit < total,
            },
        }, "Consultations fetched successfully")
    );
});

export const updateConsultation = asyncHandler(async (req, res) => {
    const validation = updateConsultationSchema.safeParse(req.body);
    if (!validation.success) {
        throw new ApiError(400, "Invalid consultation data", validation.error.errors);
    }

    const doctorProfile = await Doctor.findOne({ userId: req.user._id });
    if (!doctorProfile) throw new ApiError(404, "Doctor profile not found");

    const consultation = await Consultation.findById(req.params.consultationId);
    if (!consultation) throw new ApiError(404, "Consultation not found");

    if (consultation.doctorId.toString() !== doctorProfile._id.toString()) {
        throw new ApiError(403, "You can only update your own consultations");
    }

    const updateData = {};
    const { vitalSigns, testResults, symptoms, ...rest } = validation.data;

    // Flat fields
    Object.assign(updateData, rest);

    if (vitalSigns) {
        for (const [key, val] of Object.entries(vitalSigns)) {
            if (val !== undefined) updateData[`vitalSigns.${key}`] = val;
        }
    }

    if (symptoms) updateData.symptoms = symptoms;

    const updated = await Consultation.findByIdAndUpdate(
        req.params.consultationId,
        {
            $set: updateData,
            ...(testResults && { $push: { testResults: { $each: testResults } } }),
        },
        { new: true, runValidators: true }
    );

    return res
        .status(200)
        .json(new ApiResponse(200, updated, "Consultation updated successfully"));
});

export const uploadTestResult = asyncHandler(async (req, res) => {
    const { name } = req.body;
    const filePath = req.file?.path;

    if (!filePath) throw new ApiError(400, "No file uploaded");
    if (!name) throw new ApiError(400, "Test name is required");

    const consultation = await Consultation.findById(req.params.consultationId);
    if (!consultation) throw new ApiError(404, "Consultation not found");

    const doctorProfile = await Doctor.findOne({ userId: req.user._id });
    const patientProfile = await Patient.findOne({ user: req.user._id });

    const isDoctor = doctorProfile && consultation.doctorId.toString() === doctorProfile._id.toString();
    const isPatient = patientProfile && consultation.patientId.toString() === patientProfile._id.toString();

    if (!isDoctor && !isPatient) {
        throw new ApiError(403, "You are not authorized to upload to this consultation");
    }

    const uploaded = await uploadOnCloudinary(filePath);
    if (!uploaded) throw new ApiError(500, "File upload failed");

    const testResult = {
        name,
        fileUrl: uploaded.secure_url,
        uploadedBy: isDoctor ? "doctor" : "patient",
        uploadedAt: new Date(),
    };

    const updated = await Consultation.findByIdAndUpdate(
        req.params.consultationId,
        { $push: { testResults: testResult } },
        { new: true }
    );

    return res
        .status(200)
        .json(new ApiResponse(200, updated.testResults, "Test result uploaded successfully"));
});

export const getConsultationStats = asyncHandler(async (req, res) => {
    const stats = await Consultation.aggregate([
        {
            $group: {
                _id: "$status",
                count: { $sum: 1 },
                totalFees: { $sum: "$fees" },
            },
        },
    ]);

    const totalConsultations = await Consultation.countDocuments();

    return res.status(200).json(
        new ApiResponse(200, { stats, totalConsultations }, "Stats fetched successfully")
    );
});