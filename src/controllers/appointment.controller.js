import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { Doctor } from "../models/doctor.model.js";
import { Appointment } from "../models/appointment.model.js";
import { cancelAppointmentSchema, createAppointmentSchema, updateAppointmentStatusSchema } from "../utils/validation/appointment.validation.js";
import { Patient } from "../models/patient.model.js";

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
        const startPart = timeSlot.split(" - ")[0].trim();        // "9:00 AM"
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
        status: "approved",
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
        payment: {
            amount: doctor.consultationFee || 0,
            method: "cash",
            status: "pending",
        },
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

    const { status, patientId } = req.query; // ✅ extract patientId

    const filter = { doctor: doctorProfile._id };
    if (status) filter.status = status;
    if (patientId) filter.patient = patientId; // ✅ add this line

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

    // ✅ 1. Get appointment
    const appointment = await Appointment.findById(req.params.appointmentId);
    if (!appointment) throw new ApiError(404, "Appointment not found");

    // ✅ 2. Detect role
    const doctorProfile = await Doctor.findOne({ userId: req.user._id });
    const patientProfile = await Patient.findOne({ user: req.user._id }); // ✅ FIXED: was Patient.findById(appointment.patient)

    const isDoctor = !!doctorProfile;
    const isPatient = !!patientProfile;

    // ✅ 3. AUTHORIZATION
    if (isDoctor) {
        if (appointment.doctor.toString() !== doctorProfile._id.toString()) {
            throw new ApiError(403, "Forbidden: This is not your appointment");
        }
    } else if (isPatient) {
        // ✅ FIXED: use 'user' field (not 'userId'), and query by logged-in user
        if (appointment.patient.toString() !== patientProfile._id.toString()) {
            throw new ApiError(403, "Forbidden: This is not your appointment");
        }
    } else {
        throw new ApiError(403, "Forbidden: Unrecognized role");
    }

    // ✅ 4. PATIENT LOGIC
    if (isPatient) {
        if (status === "approved") {
            // Patient can only approve a rescheduled appointment
            if (appointment.status !== "rescheduled") {
                throw new ApiError(400, "You can only accept rescheduled appointments");
            }
        } else if (status === "cancelled") {
            appointment.cancelledBy = "patient";
            appointment.cancellationReason = cancellationReason || "Cancelled by patient";
        } else {
            throw new ApiError(403, "Patients can only accept reschedules or cancel appointments");
        }
    }

    // ✅ 5. DOCTOR LOGIC
    if (isDoctor) {
        if (status === "approved") {
            appointment.meetingLink = meetingLink;
            if (!appointment.roomID && appointment.consultationType !== "chat") {
                appointment.roomID = `room_${appointment._id}_${Math.random().toString(36).substring(7)}`;
            }
        } else if (status === "rescheduled") {
            if (!newAppointmentDate || !newTimeSlot) {
                throw new ApiError(400, "New date and time slot are required for rescheduling");
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

    // ✅ 6. FINAL UPDATE
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
        throw new ApiError(403, "You are not authorized to end this call");
    }

    const now = new Date();
    appointment.meetingEndedAt = now;
    if (appointment.callLogs?.startedAt) {
        const durationMs = now - appointment.callLogs.startedAt;
        appointment.callLogs.endedAt          = now;
        appointment.callLogs.duration         = Math.floor(durationMs / 1000);
        appointment.callLogs.terminationReason = "normal";
    }
    await appointment.save();

    // ✅ Auto-create draft prescription if none exists
    if (isDoctor) {
        const { Prescription } = await import("../models/prescription.model.js");
        const existing = await Prescription.findOne({ appointmentId: appointment._id });
        if (!existing) {
            await Prescription.create({
                appointmentId: appointment._id,
                doctorId:      doctorProfile._id,
                patientId:     appointment.patient,
                diagnosis:     "Pending — to be updated by doctor",
                medicines:     [{
                    name:     "N/A",
                    dosage:   "N/A",
                    duration: "N/A",
                }],
                notes:   appointment.reasonForVisit || "",
                isDraft: true,
            });
        }
    }

    return res.status(200).json(new ApiResponse(200, appointment, "Call ended"));
});

export const getRoomId = asyncHandler(async (req, res) => {
    const patientProfile = await Patient.findOne({ user: req.user._id });
    const doctorProfile = await Doctor.findOne({ userId: req.user._id });

    const appointment = await Appointment.findById(req.params.appointmentId);
    if (!appointment) throw new ApiError(404, "Appointment not found");

    // Only the involved doctor or patient can get the room
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

    if (appointment.doctor.toString() !== doctorProfile._id.toString())
        throw new ApiError(403, "Not your appointment");

    const now = new Date();
    appointment.meetingEndedAt = now;
    if (appointment.callLogs?.startedAt) {
        appointment.callLogs.endedAt          = now;
        appointment.callLogs.duration         = Math.floor((now - appointment.callLogs.startedAt) / 1000);
        appointment.callLogs.terminationReason = "normal";
    }
    appointment.status = "completed";
    await appointment.save();

    // ✅ Auto-create draft prescription if none exists
    const { Prescription } = await import("../models/prescription.model.js");
    const existing = await Prescription.findOne({ appointmentId: appointment._id });
    if (!existing) {
        await Prescription.create({
            appointmentId: appointment._id,
            doctorId:      doctorProfile._id,
            patientId:     appointment.patient,
            diagnosis:     "Pending — to be updated by doctor",
            medicines:     [{
                name:     "N/A",
                dosage:   "N/A",
                duration: "N/A",
            }],
            notes:   appointment.reasonForVisit || "",
            isDraft: true,
        });
    }

    return res.status(200).json(new ApiResponse(200, appointment, "Call completed"));
});

export const markAsPaid = asyncHandler(async (req, res) => {
    const patientProfile = await Patient.findOne({ user: req.user._id });
    if (!patientProfile) throw new ApiError(404, "Patient profile not found");

    const appointment = await Appointment.findById(req.params.appointmentId);
    if (!appointment) throw new ApiError(404, "Appointment not found");

    if (appointment.patient.toString() !== patientProfile._id.toString())
        throw new ApiError(403, "Not your appointment");

    if (appointment.payment.status === "paid")
        throw new ApiError(400, "Already paid");

    appointment.payment.status      = "paid";
    appointment.payment.method      = "cash";
    appointment.payment.paidAt      = new Date();
    appointment.payment.paymentVerified = true;

    await appointment.save();

    return res.status(200).json(
        new ApiResponse(200, appointment, "Payment confirmed")
    );
});

export const expireAppointments = asyncHandler(async (req, res) => {
    const now = new Date();

    const parseSlotEnd = (appointmentDate, timeSlot) => {
        try {
            const endPart = timeSlot.split(" - ")[1]?.trim();
            if (!endPart) return null;
            const [timePart, meridiem] = endPart.split(" ");
            let [hours, minutes] = timePart.split(":").map(Number);
            if (meridiem === "PM" && hours !== 12) hours += 12;
            if (meridiem === "AM" && hours === 12) hours = 0;
            const base = new Date(appointmentDate);
            return new Date(base.getFullYear(), base.getMonth(), base.getDate(), hours, minutes, 0);
        } catch { return null; }
    };

    const candidates = await Appointment.find({
        status: { $in: ["pending", "approved", "rescheduled"] },
    });

    let expiredCount = 0;
    for (const appt of candidates) {
        const slotEnd = parseSlotEnd(appt.appointmentDate, appt.timeSlot);
        if (slotEnd && now > slotEnd) {
            // ✅ Use updateOne to bypass any Mongoose validation issues
            await Appointment.updateOne(
                { _id: appt._id },
                { $set: { status: "expired" } }
            );
            expiredCount++;
        }
    }

    return res.status(200).json(
        new ApiResponse(200, { expiredCount }, `${expiredCount} appointments marked as expired`)
    );
});