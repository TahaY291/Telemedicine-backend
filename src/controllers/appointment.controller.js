import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { Doctor } from "../models/doctor.model.js";
import { Appointment } from "../models/appointment.model.js";
import { cancelAppointmentSchema, createAppointmentSchema, updateAppointmentStatusSchema } from "../utils/validation/appointment.validation.js";
import { Patient } from "../models/patient.model.js";
import { notifyAppointmentChange } from "../utils/notificatoinService.js";
import mongoose from "mongoose";


const VALID_TRANSITIONS = {
    pending: ["approved", "cancelled", "rescheduled"],
    approved: ["cancelled", "completed", "rescheduled"],
    rescheduled: ["approved", "cancelled"],
    cancelled: [],  // terminal
    completed: [],  // terminal
    expired: [],  // terminal
};

const populateForNotification = (appointmentId) =>
    Appointment.findById(appointmentId)
        .populate({ path: "patient", populate: { path: "user", select: "_id username" } })
        .populate({ path: "doctor", populate: { path: "userId", select: "_id username" } });

const sendNotification = async (appointmentId, status) => {
    try {
        const appt = await populateForNotification(appointmentId);
        if (!appt) return;
        await notifyAppointmentChange({
            appointment: {
                ...appt.toObject(),
                patientUserId: appt.patient?.user?._id,
                doctorUserId: appt.doctor?.userId?._id,
            },
            status,
            doctorName: appt.doctor?.userId?.username ?? "Doctor",
            patientName: appt.patient?.user?.username ?? "Patient",
        });
    } catch (err) {
        // Never let a notification failure break the actual API response
        console.error("Notification error:", err.message);
    }
};

export const createAppointment = asyncHandler(async (req, res) => {

    if (req.user.role !== "patient") {
        throw new ApiError(403, "Only patients can book appointments");
    }

    const validation = createAppointmentSchema.safeParse(req.body);
    if (!validation.success) {
        console.log("Validation errors:", JSON.stringify(validation.error.errors, null, 2));
        throw new ApiError(400, "Invalid appointment data", validation.error.errors);
    }
    const { doctorId, appointmentDate, timeSlot, consultationType, reasonForVisit } = validation.data;

    const selectedDate = new Date(appointmentDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (selectedDate < today) {
        throw new ApiError(400, "Cannot book appointments in the past");
    }

    const isToday = selectedDate.toDateString() === new Date().toDateString();
    if (isToday) {
        try {
            const startPart = timeSlot.split(" - ")[0].trim();
            const [timePart, meridiem] = startPart.split(" ");
            let [hours, minutes] = timePart.split(":").map(Number);
            if (meridiem === "PM" && hours !== 12) hours += 12;
            if (meridiem === "AM" && hours === 12) hours = 0;

            const slotStart = new Date();
            slotStart.setHours(hours, minutes, 0, 0);

            if (slotStart <= new Date()) {
                throw new ApiError(400, "This time slot has already passed. Please choose a future time.");
            }
        } catch (err) {
            if (err instanceof ApiError) throw err;
        }
    }

    const patientProfile = await Patient.findOne({ user: req.user._id });
    if (!patientProfile) throw new ApiError(404, "Patient profile not found");

    const doctor = await Doctor.findById(doctorId);
    if (!doctor) throw new ApiError(404, "Doctor not found");

    const isSlotTaken = await Appointment.findOne({
        doctor: doctorId,
        appointmentDate: selectedDate,
        timeSlot,
        status: { $in: ["approved", "rescheduled"] },
    });
    if (isSlotTaken) {
        throw new ApiError(409, "This time slot is already booked");
    }


    const appointment = await Appointment.create({
        patient: patientProfile._id,
        doctor: doctorId,
        appointmentDate: selectedDate,
        timeSlot,
        consultationType,
        reasonForVisit,
        status: "pending",
        payment: {
            amount: doctor.consultationFee || 0,
            method: "cash",
            status: "pending",
        },
    });

    // ── NOTIFY: tell the doctor a new booking request arrived ────────────────
    await sendNotification(appointment._id, "pending");

    return res.status(201).json(
        new ApiResponse(201, appointment, "Appointment request sent to doctor")
    );
});

export const getPatientAppointments = asyncHandler(async (req, res) => {
    const patientProfile = await Patient.findOne({ user: req.user._id });
    if (!patientProfile) throw new ApiError(404, "Patient profile not found");

    const { status } = req.query;

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

    const { status, patientId } = req.query;

    const filter = { doctor: doctorProfile._id };
    if (status) filter.status = status;
    if (patientId) filter.patient = patientId;

    const appointments = await Appointment.find(filter)
        .populate({
            path: "patient",
            select: "personalInfo phoneNumber user",
            populate: { path: "user", select: "username email" },
        })
        .sort({ appointmentDate: 1 });

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

    const appointment = await Appointment.findById(req.params.appointmentId);
    if (!appointment) throw new ApiError(404, "Appointment not found");

      const allowed = VALID_TRANSITIONS[appointment.status] || [];
    if (!allowed.includes(status)) {
        throw new ApiError(400,
            `Cannot change status from "${appointment.status}" to "${status}"`
        );
    }

    const doctorProfile = await Doctor.findOne({ userId: req.user._id });
    const patientProfile = await Patient.findOne({ user: req.user._id });

    const isDoctor = !!doctorProfile;
    const isPatient = !!patientProfile;

    if (isDoctor) {
        if (appointment.doctor.toString() !== doctorProfile._id.toString()) {
            throw new ApiError(403, "Forbidden: This is not your appointment");
        }
    } else if (isPatient) {
        if (appointment.patient.toString() !== patientProfile._id.toString()) {
            throw new ApiError(403, "Forbidden: This is not your appointment");
        }
    } else {
        throw new ApiError(403, "Forbidden: Unrecognized role");
    }

     if (isPatient) {
        if (status === "approved") {
            if (appointment.status !== "rescheduled") {
                throw new ApiError(400, "You can only accept rescheduled appointments");
            }
        } else if (status === "cancelled") {
            appointment.cancelledBy = "patient";
            appointment.cancellationReason = cancellationReason || "Cancelled by patient";
        } else {
            throw new ApiError(403, "Patients can only accept reschedules or cancel");
        }
    }

   if (isDoctor) {
        if (status === "approved") {
            appointment.meetingLink = meetingLink;
            if (!appointment.roomID && appointment.consultationType !== "chat") {
                appointment.roomID = `room_${appointment._id}_${Math.random().toString(36).substring(7)}`;
            }
        } else if (status === "rescheduled") {
            if (new Date(newAppointmentDate) <= new Date()) {
                throw new ApiError(400, "Reschedule date must be in the future");
            }

            const isSlotTaken = await Appointment.findOne({
                doctor: doctorProfile._id,
                appointmentDate: new Date(newAppointmentDate),
                timeSlot: newTimeSlot,
                status: { $in: ["approved", "rescheduled"] },
                _id: { $ne: appointment._id }, 
            });
            if (isSlotTaken) {
                throw new ApiError(409, "This new time slot is already booked");
            }

            appointment.appointmentDate = newAppointmentDate;
            appointment.timeSlot = newTimeSlot;

        } else if (status === "cancelled") {
            appointment.cancelledBy = "doctor";
            appointment.cancellationReason = cancellationReason || "Cancelled by doctor";
            if (appointment.payment?.status === "paid") {
                appointment.payment.status = "refunded";
                appointment.payment.refundedAt = new Date();
                appointment.payment.refundAmount = appointment.payment.amount;
            }
        } else if (status === "completed") {
            appointment.meetingEndedAt = new Date();
        } else {
            throw new ApiError(400, "Invalid status for doctor");
        }
    }


    appointment.status = status;
    if (doctorNotes) appointment.doctorNotes = doctorNotes;

    await appointment.save();

    // ── NOTIFY: tell the right person about the status change ────────────────
    await sendNotification(appointment._id, status);

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

    // FIX 1: use transition map
    const allowed = VALID_TRANSITIONS[appointment.status] || [];
    if (!allowed.includes("cancelled")) {
        throw new ApiError(400, `Cannot cancel an appointment that is already ${appointment.status}`);
    }

    appointment.status = "cancelled";
    appointment.cancelledBy = "patient";
    appointment.cancellationReason = cancellationReason || "Cancelled by patient";

    if (appointment.payment?.status === "paid") {
        appointment.payment.status = "refunded";
        appointment.payment.refundedAt = new Date();
    }

    await appointment.save();
    await sendNotification(appointment._id, "cancelled");

    return res.status(200).json(
        new ApiResponse(200, appointment, "Appointment cancelled successfully")
    );
});


export const startCall = asyncHandler(async (req, res) => {
    const doctorProfile = await Doctor.findOne({ userId: req.user._id });
    if (!doctorProfile) throw new ApiError(404, "Doctor profile not found");

    const appointment = await Appointment.findById(req.params.appointmentId);
    if (!appointment) throw new ApiError(404, "Appointment not found");

    if (appointment.doctor.toString() !== doctorProfile._id.toString()) {
        throw new ApiError(403, "Not your appointment");
    }

    if (appointment.status !== "approved") {
        throw new ApiError(400, "Appointment must be approved before starting a call");
    }

    if (appointment.meetingEndedAt) {
        throw new ApiError(400, "This call has already ended");
    }

    if (!appointment.roomID) {
        appointment.roomID = `room_${appointment._id}_${Date.now()}`;
    }

    appointment.meetingStartedAt = new Date();
    appointment.callLogs = {
        startedAt: new Date(),
        terminationReason: null,
    };

    await appointment.save();

    return res.status(200).json(
        new ApiResponse(200, {
            roomID: appointment.roomID,
            appointmentId: appointment._id,
            consultationType: appointment.consultationType,
        }, "Call started")
    );
});

export const endCall = asyncHandler(async (req, res) => {
    const appointment = await Appointment.findById(req.params.appointmentId);
    if (!appointment) throw new ApiError(404, "Appointment not found");

    const doctorProfile  = await Doctor.findOne({ userId: req.user._id });
    const patientProfile = await Patient.findOne({ user: req.user._id });

    const isDoctor  = doctorProfile  && appointment.doctor.toString()  === doctorProfile._id.toString();
    const isPatient = patientProfile && appointment.patient.toString() === patientProfile._id.toString();

    if (!isDoctor && !isPatient) {
        throw new ApiError(403, "Not authorized to end this call");
    }

    const now = new Date();
    appointment.meetingEndedAt = now;

    if (appointment.callLogs?.startedAt) {
        const durationMs = now - appointment.callLogs.startedAt;
        appointment.callLogs.endedAt           = now;
        appointment.callLogs.duration          = Math.floor(durationMs / 1000);
        appointment.callLogs.terminationReason = "normal";
    }

    await appointment.save();

    return res.status(200).json(
        new ApiResponse(200, appointment, "Call ended")
    );
});


export const getRoomId = asyncHandler(async (req, res) => {
    const patientProfile = await Patient.findOne({ user: req.user._id });
    const doctorProfile = await Doctor.findOne({ userId: req.user._id });

    const appointment = await Appointment.findById(req.params.appointmentId);
    if (!appointment) throw new ApiError(404, "Appointment not found");

    const isPatient = patientProfile && appointment.patient.toString() === patientProfile._id.toString();
    const isDoctor = doctorProfile && appointment.doctor.toString() === doctorProfile._id.toString();

    if (!isPatient && !isDoctor) throw new ApiError(403, "Unauthorized");
    if (!appointment.roomID) throw new ApiError(404, "Call has not been started yet");

    return res.status(200).json(
        new ApiResponse(200, {
            roomID: appointment.roomID,
            consultationType: appointment.consultationType,
        }, "Room fetched")
    );
});

export const completeCall = asyncHandler(async (req, res) => {
    const doctorProfile = await Doctor.findOne({ userId: req.user._id });
    if (!doctorProfile) throw new ApiError(404, "Doctor profile not found");

    const appointment = await Appointment.findById(req.params.appointmentId);
    if (!appointment) throw new ApiError(404, "Appointment not found");

    if (appointment.doctor.toString() !== doctorProfile._id.toString()) {
        throw new ApiError(403, "Not your appointment");
    }

    // FIX 1: use transition map
    const allowed = VALID_TRANSITIONS[appointment.status] || [];
    if (!allowed.includes("completed")) {
        throw new ApiError(400,
            `Cannot complete an appointment with status "${appointment.status}"`
        );
    }

    const now = new Date();
    appointment.meetingEndedAt = now;
    appointment.status = "completed";

    if (appointment.callLogs?.startedAt) {
        appointment.callLogs.endedAt           = now;
        appointment.callLogs.duration          = Math.floor((now - appointment.callLogs.startedAt) / 1000);
        appointment.callLogs.terminationReason = "normal";
    }

    await appointment.save();

    const { Prescription } = await import("../models/prescription.model.js");
    const existing = await Prescription.findOne({ appointmentId: appointment._id });
    if (!existing) {
        await Prescription.create({
            appointmentId: appointment._id,
            doctorId:      doctorProfile._id,
            patientId:     appointment.patient,
            diagnosis:     "Pending — to be updated by doctor",
            medicines:     [{ name: "N/A", dosage: "N/A", duration: "N/A" }],
            notes:         appointment.reasonForVisit || "",
            isDraft:       true,
        });
    }

    await sendNotification(appointment._id, "completed");

    return res.status(200).json(
        new ApiResponse(200, appointment, "Appointment completed")
    );
});

export const markAsPaid = asyncHandler(async (req, res) => {
    const patientProfile = await Patient.findOne({ user: req.user._id });
    if (!patientProfile) throw new ApiError(404, "Patient profile not found");

    const appointment = await Appointment.findById(req.params.appointmentId);
    if (!appointment) throw new ApiError(404, "Appointment not found");

    if (appointment.patient.toString() !== patientProfile._id.toString()) {
        throw new ApiError(403, "Not your appointment");
    }

    if (appointment.payment.status === "paid") {
        throw new ApiError(400, "Already paid");
    }

    // FIX: only allow payment on approved appointments
    if (appointment.status !== "approved") {
        throw new ApiError(400, "Can only pay for approved appointments");
    }

    appointment.payment.status          = "paid";
    appointment.payment.method          = "cash";
    appointment.payment.paidAt          = new Date();
    appointment.payment.paymentVerified = true;

    await appointment.save();

    return res.status(200).json(
        new ApiResponse(200, appointment, "Payment confirmed")
    );
});

// ─── expireAppointments ───────────────────────────────────────────────────────
// FIX 4: DB-level update instead of loading all in memory
export const expireAppointments = asyncHandler(async (req, res) => {
    const now = new Date();

    // FIX: let MongoDB do the work — no more JS loops over all appointments
    const result = await Appointment.updateMany(
        {
            status: { $in: ["pending", "approved", "rescheduled"] },
            appointmentDate: { $lt: now },
        },
        { $set: { status: "expired" } }
    );

    return res.status(200).json(
        new ApiResponse(200,
            { expiredCount: result.modifiedCount },
            `${result.modifiedCount} appointments marked as expired`
        )
    );
});

export const getBookedSlots = asyncHandler(async (req, res) => {
    const { doctorId, date } = req.query;

    if (!doctorId || !date) {
        throw new ApiError(400, "doctorId and date are required");
    }

    // Validate that doctorId is a valid ObjectId before querying
    if (!mongoose.Types.ObjectId.isValid(doctorId)) {
        throw new ApiError(400, "Invalid doctorId format");
    }

    // Validate date string is a real date
    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
        throw new ApiError(400, "Invalid date format. Use YYYY-MM-DD");
    }

    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const appointments = await Appointment.find({
        doctor: new mongoose.Types.ObjectId(doctorId),  // explicit cast
        appointmentDate: { $gte: dayStart, $lte: dayEnd },
        status: { $in: ["pending", "approved", "rescheduled"] },
        // isDraft: false  ← REMOVED: old appointments don't have this field
        //                   so { isDraft: false } excludes them from results
    }).select("timeSlot -_id");

    const bookedSlots = appointments.map((a) => a.timeSlot);

    return res.status(200).json(
        new ApiResponse(200, bookedSlots, "Booked slots fetched successfully")
    );
});