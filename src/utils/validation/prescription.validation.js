import { z } from "zod";

const objectId = z
    .string({ required_error: "ID is required" })
    .regex(/^[a-fA-F0-9]{24}$/, "Invalid ID format");

const medicineSchema = z.object({
    name: z
        .string({ required_error: "Medicine name is required" })
        .trim()
        .min(2, "Medicine name must be at least 2 characters"),

    dosage: z
        .string({ required_error: "Dosage is required" })
        .trim()
        .min(1, "Dosage is required")
        .max(100, "Dosage description too long"),

    duration: z
        .string({ required_error: "Duration is required" })
        .trim()
        .min(1, "Duration is required")
        .max(100, "Duration description too long"),

    instructions: z
        .string()
        .trim()
        .max(300, "Instructions cannot exceed 300 characters")
        .optional(),
});

export const createPrescriptionSchema = z.object({
    appointmentId: objectId.describe("Appointment this prescription belongs to"),

    medicines: z
        .array(medicineSchema, { required_error: "At least one medicine is required" })
        .min(1, "At least one medicine must be prescribed"),

    diagnosis: z
        .string({ required_error: "Diagnosis is required" })
        .trim()
        .min(5, "Diagnosis must be at least 5 characters")
        .max(1000, "Diagnosis cannot exceed 1000 characters"),

    notes: z
        .string()
        .trim()
        .max(1000, "Notes cannot exceed 1000 characters")
        .optional(),

    labTests: z
        .array(
            z.string().trim().min(2, "Lab test name must be at least 2 characters")
        )
        .optional(),

    followUpDate: z
        .string()
        .refine((val) => !isNaN(Date.parse(val)), { message: "Invalid date format" })
        .refine((val) => new Date(val) > new Date(), { message: "Follow-up date must be in the future" })
        .optional(),
});

export const updatePrescriptionSchema = z
    .object({
        medicines: z
            .array(medicineSchema)
            .min(1, "At least one medicine must be prescribed")
            .optional(),

        diagnosis: z
            .string()
            .trim()
            .min(5, "Diagnosis must be at least 5 characters")
            .max(1000, "Diagnosis cannot exceed 1000 characters")
            .optional(),

        notes: z
            .string()
            .trim()
            .max(1000, "Notes cannot exceed 1000 characters")
            .optional(),

        labTests: z
            .array(
                z.string().trim().min(2, "Lab test name must be at least 2 characters")
            )
            .optional(),

        followUpDate: z
            .string()
            .refine((val) => !isNaN(Date.parse(val)), { message: "Invalid date format" })
            .refine((val) => new Date(val) > new Date(), { message: "Follow-up date must be in the future" })
            .optional(),
    })
    .refine(
        (data) => Object.values(data).some((val) => val !== undefined),
        { message: "At least one field must be provided for update" }
    );