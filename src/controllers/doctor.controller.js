import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { createDoctorSchema, updateDoctorSchema } from "../utils/validation/doctor.validation.js";
import { Doctor } from "../models/doctor.model.js";
import { Appointment } from "../models/appointment.model.js";
import { Consultation } from "../models/consultation.model.js";
import { Patient } from '../models/patient.model.js'
import { Prescription } from "../models/prescription.model.js";


export const createDoctorProfile = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    if (req.user.role !== "doctor") {
        throw new ApiError(403, "Only doctors can create doctor profile");
    }
    const existingProfile = await Doctor.findOne({ userId }).lean();
    if (existingProfile) {
        throw new ApiError(400, "Doctor profile already exists for this user");
    }


    let doctorImageUrl = null;
    let certificateImageUrl = null;

    if (req.files?.doctorImage?.[0]?.buffer) {
        const uploaded = await uploadOnCloudinary(req.files.doctorImage[0].buffer);
        if (!uploaded) throw new ApiError(500, "Doctor image upload failed");
        doctorImageUrl = uploaded.secure_url;
    }

    if (req.files?.certificateImage?.[0]?.buffer) {
        const uploaded = await uploadOnCloudinary(req.files.certificateImage[0].buffer);
        if (!uploaded) throw new ApiError(500, "Certificate upload failed");
        certificateImageUrl = uploaded.secure_url;
    }



    if (req.body.experience) {
        req.body.experience = Number(req.body.experience);
    }

    if (req.body.consultationFee) {
        req.body.consultationFee = Number(req.body.consultationFee);
    }

    if (req.body.location) {
        req.body.location = JSON.parse(req.body.location);
    }

    if (req.body.availabilitySlots) {
        req.body.availabilitySlots = JSON.parse(req.body.availabilitySlots);
    }

    const doctorData = {
        ...req.body,
        doctorImage: doctorImageUrl || undefined,
        certificateImage: certificateImageUrl || undefined
    };

    const validation = createDoctorSchema.safeParse(doctorData);
    if (!validation.success) {
        throw new ApiError(400, "Invalid doctor data", validation.error.errors);
    }

    const doctor = await Doctor.create({
        userId,
        ...validation.data
    });

    return res.status(201).json(
        new ApiResponse(201, doctor, "Doctor profile created successfully")
    );
});

export const getMyProfile = asyncHandler(async (req, res) => {
    const profile = await Doctor.findOne({ userId: req.user._id }).populate(
        "userId",
        "username email role isVerified status"
    );

    if (!profile) {
        throw new ApiError(404, "Doctor profile not found. Please complete your profile setup.");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, profile, "Doctor profile fetched successfully"));
});


export const updateDoctorProfile = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    const allowedUpdates = [
        "gender",
        "specialization",
        "qualifications",
        "experience",
        "location",
        "consultationFee",
        "availabilitySlots"
    ];

    const updateData = {};

    // 🔹 Convert and prepare body fields first
    if (req.body.experience !== undefined) {
        req.body.experience = Number(req.body.experience);
    }

    if (req.body.consultationFee !== undefined) {
        req.body.consultationFee = Number(req.body.consultationFee);
    }

    if (req.body.location !== undefined) {
        req.body.location = JSON.parse(req.body.location);
    }

    if (req.body.availabilitySlots !== undefined) {
        req.body.availabilitySlots = JSON.parse(req.body.availabilitySlots);
    }

    // 🔹 Pick only allowed fields
    for (const key of allowedUpdates) {
        if (req.body[key] !== undefined) {
            updateData[key] = req.body[key];
        }
    }

    // 🔹 Handle doctor image upload
    if (req.files?.doctorImage?.[0]?.buffer) {
        const uploaded = await uploadOnCloudinary(req.files.doctorImage[0].buffer);
        if (!uploaded) throw new ApiError(500, "Doctor image upload failed");
        updateData.doctorImage = uploaded.secure_url;
    }

    // 🔹 Handle certificate upload
    if (req.files?.certificateImage?.[0]?.buffer) {
        const uploaded = await uploadOnCloudinary(req.files.certificateImage[0].buffer);
        if (!uploaded) throw new ApiError(500, "Certificate upload failed");
        updateData.certificateImage = uploaded.secure_url;
    }

    if (Object.keys(updateData).length === 0) {
        throw new ApiError(400, "No valid fields provided for update");
    }

    // 🔹 Validate using Zod
    const validation = updateDoctorSchema.safeParse(updateData);

    if (!validation.success) {
        throw new ApiError(
            400,
            "Invalid data for profile update",
            validation.error.errors
        );
    }

    // 🔹 Update doctor
    const updatedDoctor = await Doctor.findOneAndUpdate(
        { userId },
        { $set: validation.data },
        { new: true, runValidators: true }
    ).populate("userId", "username email role");

    if (!updatedDoctor) {
        throw new ApiError(404, "Doctor profile not found");
    }

    return res.status(200).json(
        new ApiResponse(
            200,
            updatedDoctor,
            "Doctor profile updated successfully"
        )
    );
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
    const deleted = await Doctor.findOneAndDelete({ userId: req.user._id });

    if (!deleted) {
        throw new ApiError(404, "Doctor profile not found");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, null, "Doctor profile deleted successfully"));
});

export const listDoctors = asyncHandler(async (req, res) => {
    const { specialization, city } = req.query;

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

// controller for the dashboard
export const getDoctorStats = asyncHandler(async (req, res) => {
    const doctorProfile = await Doctor.findOne({ userId: req.user._id });
    if (!doctorProfile) throw new ApiError(404, "Doctor profile not found");

    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);

    const [allAppointments, todayAppointments, pendingAppointments] = await Promise.all([
        Appointment.find({ doctor: doctorProfile._id }),

        Appointment.find({
            doctor: doctorProfile._id,
            appointmentDate: { $gte: todayStart, $lte: todayEnd },
            status: "approved",
        }).populate("patient", "personalInfo phoneNumber"),

        Appointment.find({ doctor: doctorProfile._id, status: "pending" })
            .populate("patient", "personalInfo phoneNumber")
            .sort({ createdAt: -1 })
            .limit(5),
    ]);

    const completedAppointments = allAppointments.filter(a => a.status === "completed");
    const uniquePatients = new Set(allAppointments.map(a => String(a.patient))).size;
    const totalEarnings = completedAppointments.length * (doctorProfile.consultationFee || 0);

    return res.status(200).json(new ApiResponse(200, {
        // counts
        totalAppointments: allAppointments.length,
        pendingCount: allAppointments.filter(a => a.status === "pending").length,
        approvedCount: allAppointments.filter(a => a.status === "approved").length,
        completedCount: completedAppointments.length,
        cancelledCount: allAppointments.filter(a => a.status === "cancelled").length,
        totalPatients: uniquePatients,
        totalEarnings,
        // lists for dashboard widgets
        todayAppointments,   // today's schedule
        pendingAppointments, // latest 5 pending — for quick approve/decline
    }, "Dashboard stats fetched"));
});

// GET /doctors/my-patients
export const getMyPatients = asyncHandler(async (req, res) => {
    const doctorProfile = await Doctor.findOne({ userId: req.user._id });
    if (!doctorProfile) throw new ApiError(404, "Doctor profile not found");

    const consultations = await Consultation.find({
        doctorId: doctorProfile._id,
        status: "completed"
    })
        .populate({
            path: "patientId",
            populate: { path: "user", select: "username email" }
        })
        .sort({ consultationDate: -1 });

    const seen = new Set();
    const patients = [];

    for (const c of consultations) {
        const pid = String(c.patientId._id);
        if (!seen.has(pid)) {
            seen.add(pid);
            patients.push({
                ...c.patientId.toObject(),
                lastVisit: c.consultationDate,
                totalVisits: consultations.filter(
                    x => String(x.patientId._id) === pid
                ).length,
            });
        }
    }

    return res.status(200).json(
        new ApiResponse(200, patients, "Patients fetched successfully")
    );
});

export const getPatientRecords = asyncHandler(async (req, res) => {
    const doctorProfile = await Doctor.findOne({ userId: req.user._id });
    if (!doctorProfile) throw new ApiError(404, "Doctor profile not found");

    const { patientId } = req.params;

    const [patient, consultations, prescriptions] = await Promise.all([
        Patient.findById(patientId).populate("user", "username email"),

        Consultation.find({
            doctorId: doctorProfile._id,
            patientId,
        })
            .populate("appointmentId")
            .sort({ consultationDate: -1 }),

        Prescription.find({
            doctorId: doctorProfile._id,
            patientId,
        }).sort({ createdAt: -1 }),
    ]);

    if (!patient) throw new ApiError(404, "Patient not found");

    return res.status(200).json(
        new ApiResponse(200, { patient, consultations, prescriptions },
            "Patient records fetched")
    );
});
