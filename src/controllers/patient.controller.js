import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { Patient } from "../models/patient.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { createPatientProfileSchema, updatePatientProfileSchema } from "../utils/validation/patient.validation.js";

export const createdPatientProfile = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const existingProfile = await Patient.findOne({ user: userId });

    if (existingProfile) {
        throw new ApiError(400, "Patient profile already exists for this user");
    }

    let profileImage = null;
    if (req.file?.path) {
        const cloudinaryResponse = await uploadOnCloudinary(req.file.path);
        if (!cloudinaryResponse) {
            throw new ApiError(500, "Failed to upload profile image");
        }
        profileImage = cloudinaryResponse.url;
    }

    const { personalInfo, medicalInfo, emergencyInfo, phoneNumber } = req.body;
    const patientData = { personalInfo, medicalInfo, emergencyInfo, phoneNumber }

    const validation = createPatientProfileSchema.safeParse(patientData);
    if (!validation.success) {
        throw new ApiError(400, "Invalid patient profile data", validation.error.errors);
    }

    const newProfile = await Patient.create({
        user: userId,
        phoneNumber: validation.data.phoneNumber,
        personalInfo: validation.data.personalInfo,
        medicalInfo: validation.data.medicalInfo,
        emergencyInfo: validation.data.emergencyInfo,
        profileImage: profileImage,
    })

    const populatedProfile = await Patient.findById(newProfile._id).populate("user", "username email role");

    return res
        .status(201)
        .json(new ApiResponse(201, populatedProfile, "Patient profile created successfully"));
})


export const getMyProfile = asyncHandler(async (req, res) => {
    const profile = await Patient.findOne({ user: req.user._id }).populate(
        "user",
        "username email role isVerified status"
    );

    if (!profile) {
        throw new ApiError(404, "Patient profile not found. Please complete your profile setup.");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, profile, "Patient profile fetched successfully"));
});


export const updatePatientProfile = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    const allowedUpdates = [
        "phoneNumber",
        "personalInfo",
        "emergencyInfo",
    ];


    const updateData = {};
    for (const key of allowedUpdates) {
        if (req.body[key] !== undefined) {
            updateData[key] = req.body[key];
        }
    }

    const validation = updatePatientProfileSchema.safeParse(updateData);
    if (!validation.success) {
        throw new ApiError(400, "Invalid data for profile update", validation.error.errors);
    }

    let profileImage = null;
    if (req.file?.path) {
        const cloudinaryResponse = await uploadOnCloudinary(req.file.path);
        if (!cloudinaryResponse) {
            throw new ApiError(500, "Failed to upload profile image");
        }
        profileImage = cloudinaryResponse.url;
    }

    if (profileImage) {
        updateData.profileImage = profileImage;
    }

    if (Object.keys(updateData).length === 0) {
        throw new ApiError(400, "No valid fields provided for update");
    }


    const updatedProfile = await Patient.findOneAndUpdate(
        { user: userId },
        { $set: updateData },
        { new: true, runValidators: true }
    ).populate("user", "username email role");

    if (!updatedProfile) {
        throw new ApiError(404, "Patient profile not found");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, updatedProfile, "Profile updated successfully"));
});


export const getPatientById = asyncHandler(async (req, res) => {
    const { patientId } = req.params;

    const profile = await Patient.findById(patientId).populate(
        "user",
        "username email role status isVerified"
    );

    if (!profile) {
        throw new ApiError(404, "Patient not found");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, profile, "Patient profile fetched successfully"));
});


export const deletePatientProfile = asyncHandler(async (req, res) => {
    const deleted = await Patient.findOneAndDelete({ user: req.user._id });

    if (!deleted) {
        throw new ApiError(404, "Patient profile not found");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, null, "Patient profile deleted successfully"));
});

