import { z } from "zod";

const objectId = z
    .string({ required_error: "ID is required" })
    .regex(/^[a-fA-F0-9]{24}$/, "Invalid ID format");

const futureDate = z
    .string({ required_error: "Appointment date is required" })
    .refine((val) => {
        const d = new Date(val);
        return !isNaN(d.getTime());
    }, { message: "Invalid date format" })
    .refine((val) => {
        const submitted = new Date(val);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return submitted >= today;
    }, { message: "Appointment date must be today or in the future" });

// ── FIX: added futureDateOrToday for reschedule validation ───────────────────
const futureDateStrict = z
    .string({ required_error: "Date is required" })
    .refine((val) => !isNaN(new Date(val).getTime()), { 
        message: "Invalid date format" 
    })
    .refine((val) => {
        const submitted = new Date(val);
        const now = new Date(); // strict — must be AFTER now, not just today
        return submitted > now;
    }, { message: "Reschedule date must be in the future" });

const timeSlotRegex = /^(0?[1-9]|1[0-2]):[0-5]\d\s(AM|PM)\s-\s(0?[1-9]|1[0-2]):[0-5]\d\s(AM|PM)$/;

export const createAppointmentSchema = z.object({
    doctorId: objectId.describe("Doctor to book with"),
    appointmentDate: futureDate,
    timeSlot: z
        .string({ required_error: "Time slot is required" })
        .regex(timeSlotRegex, "Invalid time slot format. Expected: '10:00 AM - 10:30 AM'"),
    consultationType: z
        .enum(["video", "audio", "chat"], {
            errorMap: () => ({ message: "Consultation type must be video, audio, or chat" }),
        })
        .default("video"),
    reasonForVisit: z
        .string({ required_error: "Reason for visit is required" })
        .trim()
        .min(10, "Please describe your reason in at least 10 characters")
        .max(500, "Reason cannot exceed 500 characters"),
});

export const updateAppointmentStatusSchema = z
    .object({
        status: z.enum(["approved", "rescheduled", "cancelled", "completed"]),
        doctorNotes: z.string().trim().max(1000).optional(),
        meetingLink: z.string().url().optional(),

        // FIX: use strict future date for reschedule
        newAppointmentDate: futureDateStrict.optional(),
        newTimeSlot: z.string().regex(timeSlotRegex).optional(),
        cancellationReason: z.string().trim().min(5).max(300).optional(),
    })
    .refine((data) => {
        if (data.status === "rescheduled") {
            return !!data.newAppointmentDate && !!data.newTimeSlot;
        }
        return true;
    }, {
        message: "New date and time slot are required for rescheduling",
        path: ["newAppointmentDate"],
    })
    .refine((data) => {
        if (data.status === "cancelled") {
            return !!data.cancellationReason;
        }
        return true;
    }, {
        message: "Cancellation reason is required",
        path: ["cancellationReason"],
    });

export const cancelAppointmentSchema = z.object({
    cancellationReason: z
        .string()
        .trim()
        .min(5, "Please provide a brief reason for cancellation")
        .max(300, "Cancellation reason cannot exceed 300 characters")
        .optional(),
});