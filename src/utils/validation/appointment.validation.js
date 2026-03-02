import { z } from "zod";

const objectId = z
    .string({ required_error: "ID is required" })
    .regex(/^[a-fA-F0-9]{24}$/, "Invalid ID format");

const futureDate = z
    .string({ required_error: "Appointment date is required" })
    .refine((val) => !isNaN(Date.parse(val)), { message: "Invalid date format" })
    .refine((val) => new Date(val) > new Date(), { message: "Appointment date must be in the future" });

const timeSlotRegex = /^(0?[1-9]|1[0-2]):[0-5]\d\s(AM|PM)\s-\s(0?[1-9]|1[0-2]):[0-5]\d\s(AM|PM)$/;

export const createAppointmentSchema = z.object({
    doctorId: objectId.describe("Doctor to book with"),

    appointmentDate: futureDate,

    timeSlot: z
        .string({ required_error: "Time slot is required" })
        .regex(timeSlotRegex, "Invalid time slot format. Expected format: '10:00 AM - 10:30 AM'"),

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
        status: z.enum(["approved", "rescheduled", "cancelled", "completed"], {
            required_error: "Status is required",
            errorMap: () => ({ message: "Invalid status value" }),
        }),

        doctorNotes: z
            .string()
            .trim()
            .max(1000, "Notes cannot exceed 1000 characters")
            .optional(),

        meetingLink: z
            .string()
            .url("Meeting link must be a valid URL")
            .optional(),

        newAppointmentDate: futureDate.optional(),

        newTimeSlot: z
            .string()
            .regex(timeSlotRegex, "Invalid time slot format. Expected: '10:00 AM - 10:30 AM'")
            .optional(),
    })
    .refine(
        (data) => {
            if (data.status === "rescheduled") {
                return !!data.newAppointmentDate && !!data.newTimeSlot;
            }
            return true;
        },
        {
            message: "newAppointmentDate and newTimeSlot are required when rescheduling",
            path: ["newAppointmentDate"],
        }
    )
    .refine(
        (data) => {
            if (data.status === "approved") {
                return !!data.meetingLink;
            }
            return true;
        },
        {
            message: "Meeting link is required when approving an appointment",
            path: ["meetingLink"],
        }
    );

export const cancelAppointmentSchema = z.object({
    cancellationReason: z
        .string()
        .trim()
        .min(5, "Please provide a brief reason for cancellation")
        .max(300, "Cancellation reason cannot exceed 300 characters")
        .optional(),
});