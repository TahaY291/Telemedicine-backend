import { Notification } from "../models/notification.model.js";
import { sseManager } from "./sseManager.js";



// notificationService.js

export const notifyAppointmentChange = async ({ appointment, status, doctorName, patientName }) => {



    const notifyPatient = ["approved", "rescheduled", "completed"].includes(status) ||
        (status === "cancelled" && appointment.cancelledBy === "doctor");

    const notifyDoctor = status === "pending" ||
        (status === "cancelled" && appointment.cancelledBy === "patient");

    // ── notify patient ─────────────────────────────────────────────────────
    if (notifyPatient && appointment.patientUserId) {
        const msg = {
            approved: `Your appointment with Dr. ${doctorName} has been approved.`,
            rescheduled: `Dr. ${doctorName} has requested to reschedule your appointment.`,
            completed: `Your appointment with Dr. ${doctorName} is marked as completed.`,
            cancelled: `Your appointment was cancelled by the doctor.`,
        }[status];

        const n = await Notification.create({
            recipient: appointment.patientUserId,
            recipientRole: "patient",
            type: `appointment_${status}`,
            message: msg,
            appointmentId: appointment._id,
        });
        sseManager.send(appointment.patientUserId.toString(), n);
    }

    // ── notify doctor ──────────────────────────────────────────────────────
    if (notifyDoctor && appointment.doctorUserId) {
        const msg = {
            pending: `New appointment request received from ${patientName}.`,
            cancelled: `${patientName} has cancelled their appointment.`,
        }[status];

        const n = await Notification.create({
            recipient: appointment.doctorUserId,
            recipientRole: "doctor",
            type: `appointment_${status}`,
            message: msg,
            appointmentId: appointment._id,
        });
        sseManager.send(appointment.doctorUserId.toString(), n);
    }
};