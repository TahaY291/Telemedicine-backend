import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { Prescription } from "../models/prescription.model.js";
import { Appointment } from "../models/appointment.model.js";
import { Doctor } from "../models/doctor.model.js";
import { Patient } from "../models/patient.model.js";
import { createPrescriptionSchema, updatePrescriptionSchema } from "../utils/validation/prescription.validation.js";

export const createPrescription = asyncHandler(async (req, res) => {
    const validation = createPrescriptionSchema.safeParse(req.body);
    if (!validation.success) {
        throw new ApiError(400, "Invalid prescription data", validation.error.errors);
    }

    const { appointmentId, medicines, diagnosis, notes, labTests, followUpDate } = validation.data;

    const doctorProfile = await Doctor.findOne({ userId: req.user._id });
    if (!doctorProfile) throw new ApiError(404, "Doctor profile not found");

    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) throw new ApiError(404, "Appointment not found");

    if (appointment.doctor.toString() !== doctorProfile._id.toString()) {
        throw new ApiError(403, "You can only create prescriptions for your own appointments");
    }


    if (appointment.status !== "completed") {
        throw new ApiError(400, "Prescription can only be created for completed appointments");
    }


    const existing = await Prescription.findOne({ appointmentId });
    if (existing) {
        throw new ApiError(400, "A prescription already exists for this appointment");
    }


    const prescription = await Prescription.create({
        appointmentId,
        doctorId: doctorProfile._id,
        patientId: appointment.patient,
        medicines,
        diagnosis,
        notes,
        labTests,
        followUpDate,
    });

    return res
        .status(201)
        .json(new ApiResponse(201, prescription, "Prescription created successfully"));
});

export const updatePrescription = asyncHandler(async (req, res) => {
    const validation = updatePrescriptionSchema.safeParse(req.body);
    if (!validation.success) {
        throw new ApiError(400, "Invalid update data", validation.error.errors);
    }

    const doctorProfile = await Doctor.findOne({ userId: req.user._id });
    if (!doctorProfile) throw new ApiError(404, "Doctor profile not found");

    const prescription = await Prescription.findById(req.params.prescriptionId);
    if (!prescription) throw new ApiError(404, "Prescription not found");


    if (prescription.doctorId.toString() !== doctorProfile._id.toString()) {
        throw new ApiError(403, "You can only update your own prescriptions");
    }

    const updated = await Prescription.findByIdAndUpdate(
        req.params.prescriptionId,
        { $set: validation.data },
        { new: true, runValidators: true }
    );

    return res
        .status(200)
        .json(new ApiResponse(200, updated, "Prescription updated successfully"));
});


export const getPrescriptionByAppointment = asyncHandler(async (req, res) => {
    const prescription = await Prescription.findOne({
        appointmentId: req.params.appointmentId,
    })
        .populate("doctorId", "userId specialization")
        .populate("patientId", "personalInfo");

    if (!prescription) throw new ApiError(404, "Prescription not found for this appointment");


    const doctorProfile = await Doctor.findOne({ userId: req.user._id });
    const patientProfile = await Patient.findOne({ user: req.user._id });

    const isDoctor = doctorProfile && prescription.doctorId._id.toString() === doctorProfile._id.toString();
    const isPatient = patientProfile && prescription.patientId._id.toString() === patientProfile._id.toString();
    const isAdmin = req.user.role === "admin";

    if (!isDoctor && !isPatient && !isAdmin) {
        throw new ApiError(403, "You are not authorized to view this prescription");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, prescription, "Prescription fetched successfully"));
});

export const getMyPrescriptions = asyncHandler(async (req, res) => {
    const patientProfile = await Patient.findOne({ user: req.user._id });
    if (!patientProfile) throw new ApiError(404, "Patient profile not found");

    const prescriptions = await Prescription.find({ patientId: patientProfile._id })
        .populate("doctorId", "userId specialization doctorImage")
        .populate("appointmentId", "appointmentDate consultationType")
        .sort({ createdAt: -1 });

    return res
        .status(200)
        .json(new ApiResponse(200, prescriptions, "Prescriptions fetched successfully"));
});

export const getMyWrittenPrescriptions = asyncHandler(async (req, res) => {
    const doctorProfile = await Doctor.findOne({ userId: req.user._id });
    if (!doctorProfile) throw new ApiError(404, "Doctor profile not found");

    const prescriptions = await Prescription.find({ doctorId: doctorProfile._id })
        .populate("patientId", "personalInfo phoneNumber")
        .populate("appointmentId", "appointmentDate consultationType")
        .sort({ createdAt: -1 });

    return res
        .status(200)
        .json(new ApiResponse(200, prescriptions, "Prescriptions fetched successfully"));
});