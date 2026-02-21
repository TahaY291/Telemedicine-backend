import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { createDoctorSchema, updateDoctorSchema } from "../utils/validation/doctor.validation.js";
import { Doctor } from "../models/doctor.model.js";

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

    if (req.files?.doctorImage?.[0]?.path) {
        const uploaded = await uploadOnCloudinary(req.files.doctorImage[0].path);
        if (!uploaded) throw new ApiError(500, "Doctor image upload failed");
        doctorImageUrl = uploaded.secure_url;
    }

    if (req.files?.certificateImage?.[0]?.path) {
        const uploaded = await uploadOnCloudinary(req.files.certificateImage[0].path);
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
    if (req.files?.doctorImage?.[0]?.path) {
        const uploaded = await uploadOnCloudinary(req.files.doctorImage[0].path);
        if (!uploaded) throw new ApiError(500, "Doctor image upload failed");
        updateData.doctorImage = uploaded.secure_url;
    }

    // 🔹 Handle certificate upload
    if (req.files?.certificateImage?.[0]?.path) {
        const uploaded = await uploadOnCloudinary(req.files.certificateImage[0].path);
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
