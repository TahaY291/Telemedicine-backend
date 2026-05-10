import { Notification } from "../models/notification.model.js";
import { sseManager } from "./sseManager.js";
import transporter from "./nodemailer.js";

export const notifyAppointmentChange = async ({
    appointment, status, doctorName, patientName
}) => {

    const notifyPatient =
        ["approved", "rescheduled", "completed"].includes(status) ||
        (status === "cancelled" && appointment.cancelledBy === "doctor") ||
        status === "expired"; // ✅ expired notifies patient

    const notifyDoctor =
        status === "pending" ||
        (status === "cancelled" && appointment.cancelledBy === "patient");

    const apptDate = appointment.appointmentDate
        ? new Date(appointment.appointmentDate).toDateString()
        : "N/A";
    const timeSlot = appointment.timeSlot || "N/A";

    const refundLine = appointment.payment?.status === "refunded"
        ? `\n\nYour payment of Rs. ${appointment.payment.amount} has been refunded.`
        : "";

    // ── Notify Patient ────────────────────────────────────────────────────
    if (notifyPatient && appointment.patientUserId) {

        // Portal message
        const portalMsg = {
            approved: `Your appointment with Dr. ${doctorName} has been approved.`,
            rescheduled: `Dr. ${doctorName} has requested to reschedule your appointment.`,
            completed: `Your appointment with Dr. ${doctorName} is marked as completed.`,
            cancelled: `Your appointment was cancelled by the doctor.`,
            expired: `Your appointment on ${apptDate} at ${timeSlot} has expired.`,
        }[status];

        // ── SSE portal notification ──
        const n = await Notification.create({
            recipient: appointment.patientUserId,
            recipientRole: "patient",
            type: `appointment_${status}`,
            message: portalMsg,
            appointmentId: appointment._id,
        });
        sseManager.send(appointment.patientUserId.toString(), n);

        // ── Email to patient ──
        if (appointment.patientEmail) {
            const subjects = {
                approved: `Appointment Confirmed — Dr. ${doctorName}`,
                rescheduled: `Appointment Rescheduled — Dr. ${doctorName}`,
                completed: `Consultation Completed — Dr. ${doctorName}`,
                cancelled: `Appointment Cancelled — Dr. ${doctorName}`,
                expired: `Appointment Expired`,
            };

            const bodies = {
                approved: `Dear ${patientName},\n\nYour appointment with Dr. ${doctorName} has been confirmed.\n\nDate: ${apptDate}\nTime: ${timeSlot}\n\nPlease be ready a few minutes before your consultation.\n\nBest regards,\nSmart Telemedicine Team`,

                rescheduled: `Dear ${patientName},\n\nDr. ${doctorName} has requested to reschedule your appointment.\n\nNew Date: ${apptDate}\nNew Time: ${timeSlot}\n\nPlease log in to accept or cancel the reschedule.\n\nBest regards,\nSmart Telemedicine Team`,

                completed: `Dear ${patientName},\n\nYour consultation with Dr. ${doctorName} has been completed.\n\nYour prescription is now available in your portal. Please log in to view and download it.\n\nBest regards,\nSmart Telemedicine Team`,

                cancelled: `Dear ${patientName},\n\nYour appointment with Dr. ${doctorName} on ${apptDate} at ${timeSlot} has been cancelled by the doctor.${refundLine}\n\nYou can book a new appointment at your convenience.\n\nBest regards,\nSmart Telemedicine Team`,

                expired: `Dear ${patientName},\n\nYour appointment scheduled for ${apptDate} at ${timeSlot} has expired as it was not completed.${refundLine}\n\nPlease book a new appointment if you still need a consultation.\n\nBest regards,\nSmart Telemedicine Team`,
            };

            const mailOptions = {
                from: process.env.SENDER_EMAIL,
                to: appointment.patientEmail,
                subject: subjects[status],
                text: bodies[status],
            };

            transporter.sendMail(mailOptions).catch(err =>
                console.error("Patient email failed:", err.message)
            );
        }
    }

    // ── Notify Doctor ─────────────────────────────────────────────────────
    if (notifyDoctor && appointment.doctorUserId) {

        // Portal message
        const portalMsg = {
            pending: `New appointment request received from ${patientName}.`,
            cancelled: `${patientName} has cancelled their appointment.`,
        }[status];

        // ── SSE portal notification ──
        const n = await Notification.create({
            recipient: appointment.doctorUserId,
            recipientRole: "doctor",
            type: `appointment_${status}`,
            message: portalMsg,
            appointmentId: appointment._id,
        });
        sseManager.send(appointment.doctorUserId.toString(), n);

        // ── Email to doctor ──
        if (appointment.doctorEmail) {
            const subjects = {
                pending: `New Appointment Request — ${patientName}`,
                cancelled: `Appointment Cancelled — ${patientName}`,
            };

            const bodies = {
                pending: `Dear Dr. ${doctorName},\n\nYou have received a new appointment request from ${patientName}.\n\nDate: ${apptDate}\nTime: ${timeSlot}\nReason: ${appointment.reasonForVisit || "Not specified"}\n\nPlease log in to approve or reschedule the appointment.\n\nBest regards,\nSmart Telemedicine Team`,

                cancelled: `Dear Dr. ${doctorName},\n\n${patientName} has cancelled their appointment.\n\nDate: ${apptDate}\nTime: ${timeSlot}\nReason: ${appointment.cancellationReason || "Not specified"}\n\nBest regards,\nSmart Telemedicine Team`,
            };

            const mailOptions = {
                from: process.env.SENDER_EMAIL,
                to: appointment.doctorEmail,
                subject: subjects[status],
                text: bodies[status],
            };

            transporter.sendMail(mailOptions).catch(err =>
                console.error("Patient email failed:", err.message)
            );
        }
    }
};