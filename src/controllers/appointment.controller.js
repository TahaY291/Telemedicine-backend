import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { Doctor } from "../models/doctor.model.js";
import { Appointment } from "../models/appointment.model.js";
import { cancelAppointmentSchema, createAppointmentSchema, updateAppointmentStatusSchema } from "../utils/validation/appointment.validation.js";

export const createAppointment = asyncHandler(async (req, res) => {
    const { doctorId, appointmentDate, timeSlot, consultationType, reasonForVisit } = req.body;

    if (req.user.role !== "patient") {
        throw new ApiError(403, "Only patients can book appointments");
    }

    const validation = createAppointmentSchema.safeParse(req.body);
    if (!validation.success) {
        throw new ApiError(400, "Invalid appointment data", validation.error.errors);
    }

    const selectedDate = new Date(appointmentDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (selectedDate < today) {
        throw new ApiError(400, "Cannot book appointments in the past");
    }

    const patientProfile = await Patient.findOne({ user: req.user._id });
    if (!patientProfile) throw new ApiError(404, "Patient profile not found");

    const doctor = await Doctor.findById(doctorId);
    if (!doctor) throw new ApiError(404, "Doctor not found");

    const isSlotTaken = await Appointment.findOne({
        doctor: doctorId,
        appointmentDate: selectedDate,
        timeSlot,
        status: "approved"
    });

    if (isSlotTaken) {
        throw new ApiError(409, "This time slot has already been booked by another patient");
    }

    const appointment = await Appointment.create({
        patient: patientProfile._id,
        doctor: doctorId,
        appointmentDate: selectedDate,
        timeSlot,
        consultationType,
        reasonForVisit,
        status: "pending",
    });

    return res.status(201).json(
        new ApiResponse(201, appointment, "Appointment request sent to doctor")
    );
});

export const getPatientAppointments = asyncHandler(async (req, res) => {
    const patientProfile = await Patient.findOne({ user: req.user._id });
    if (!patientProfile) throw new ApiError(404, "Patient profile not found");

    const { status } = req.query; // optional filter by status

    const filter = { patient: patientProfile._id };
    if (status) filter.status = status;

    const appointments = await Appointment.find(filter)
        .populate("doctor", "userId specialization consultationFee doctorImage")
        .sort({ appointmentDate: -1 });

    return res
        .status(200)
        .json(new ApiResponse(200, appointments, "Appointments fetched successfully"));
});

export const getDoctorAppointments = asyncHandler(async (req, res) => {
    const doctorProfile = await Doctor.findOne({ userId: req.user._id });
    if (!doctorProfile) throw new ApiError(404, "Doctor profile not found");

    const { status } = req.query;

    const filter = { doctor: doctorProfile._id };
    if (status) filter.status = status;

    const appointments = await Appointment.find(filter)
        .populate("patient", "personalInfo phoneNumber")
        .sort({ appointmentDate: 1 }); // ascending — upcoming first for doctors

    return res
        .status(200)
        .json(new ApiResponse(200, appointments, "Appointments fetched successfully"));
});

export const getAppointmentById = asyncHandler(async (req, res) => {
    const appointment = await Appointment.findById(req.params.appointmentId)
        .populate("doctor", "userId specialization consultationFee doctorImage")
        .populate("patient", "personalInfo phoneNumber medicalInfo");

    if (!appointment) throw new ApiError(404, "Appointment not found");

    const patientProfile = await Patient.findOne({ user: req.user._id });
    const doctorProfile = await Doctor.findOne({ userId: req.user._id });

    const isPatient = patientProfile && appointment.patient._id.toString() === patientProfile._id.toString();
    const isDoctor = doctorProfile && appointment.doctor._id.toString() === doctorProfile._id.toString();
    const isAdmin = req.user.role === "admin";

    if (!isPatient && !isDoctor && !isAdmin) {
        throw new ApiError(403, "You are not authorized to view this appointment");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, appointment, "Appointment fetched successfully"));
});

export const updateAppointmentStatus = asyncHandler(async (req, res) => {
    
    const validation = updateAppointmentStatusSchema.safeParse(req.body);
    if (!validation.success) {
        throw new ApiError(400, "Invalid status update data", validation.error.errors);
    }

    const { 
        status, 
        doctorNotes, 
        meetingLink, 
        newAppointmentDate, 
        newTimeSlot, 
        cancellationReason 
    } = validation.data;

    const doctorProfile = await Doctor.findOne({ user: req.user._id });
    if (!doctorProfile) throw new ApiError(404, "Doctor profile not found");

    const appointment = await Appointment.findById(req.params.appointmentId);
    if (!appointment) throw new ApiError(404, "Appointment not found");

    if (appointment.doctor.toString() !== doctorProfile._id.toString()) {
        throw new ApiError(403, "Forbidden: This is not your appointment");
    }

    if (status === "approved" && appointment.payment.status !== "paid") {
        throw new ApiError(400, "Cannot approve: Payment has not been verified yet.");
    }

    if (status === "approved") {
        appointment.meetingLink = meetingLink; 
        
        if (!appointment.roomID && appointment.consultationType !== "chat") {
            appointment.roomID = `room_${appointment._id}_${Math.random().toString(36).substring(7)}`;
        }
    } 
    
    else if (status === "rescheduled") {
        appointment.appointmentDate = newAppointmentDate;
        appointment.timeSlot = newTimeSlot;
    } 
    
    else if (status === "cancelled") {
        appointment.cancelledBy = "doctor";
        appointment.cancellationReason = cancellationReason || "Cancelled by doctor";
        
        if (appointment.payment.status === "paid") {
            appointment.payment.status = "refunded";
            appointment.payment.refundedAt = new Date();
            appointment.payment.refundAmount = appointment.payment.amount; 
        }
    } 
    
    else if (status === "completed") {
        appointment.meetingEndedAt = new Date();
    }

    appointment.status = status;
    if (doctorNotes) appointment.doctorNotes = doctorNotes;

    await appointment.save();

    return res.status(200).json(
        new ApiResponse(200, appointment, `Appointment ${status} successfully`)
    );
});

export const cancelAppointment = asyncHandler(async (req, res) => {

    const validation = cancelAppointmentSchema.safeParse(req.body);
    if (!validation.success) {
        throw new ApiError(400, "Invalid cancellation data", validation.error.errors);
    }

    const { cancellationReason } = validation.data;

    const patientProfile = await Patient.findOne({ user: req.user._id });
    if (!patientProfile) throw new ApiError(404, "Patient profile not found");

    const appointment = await Appointment.findById(req.params.appointmentId);
    if (!appointment) throw new ApiError(404, "Appointment not found");

    if (appointment.patient.toString() !== patientProfile._id.toString()) {
        throw new ApiError(403, "You can only cancel your own appointments");
    }

    if (["cancelled", "completed"].includes(appointment.status)) {
        throw new ApiError(400, `Appointment is already ${appointment.status}`);
    }

    appointment.status = "cancelled";
    appointment.cancelledBy = "patient";
    appointment.cancellationReason = cancellationReason || "Cancelled by patient";

    if (appointment.payment.status === "paid") {
        appointment.payment.status = "refunded";
        appointment.payment.refundedAt = new Date();
    }

    await appointment.save();

    return res.status(200).json(
        new ApiResponse(200, appointment, "Appointment cancelled successfully")
    );
});