import { z } from "zod";


const vitalSignsSchema = z.object({
    bloodPressure: z
        .string()
        .trim()
        .regex(
            /^\d{2,3}\/\d{2,3}(\s?mmHg)?$/,
            "Invalid blood pressure format. Expected: '120/80' or '120/80 mmHg'"
        )
        .optional(),

    heartRate: z
        .number({ invalid_type_error: "Heart rate must be a number" })
        .min(30, "Heart rate seems too low")
        .max(250, "Heart rate seems too high")
        .optional(),

    temperature: z
        .number({ invalid_type_error: "Temperature must be a number" })
        .min(30, "Temperature seems too low (celsius)")
        .max(45, "Temperature seems too high (celsius)")
        .optional(),

    weight: z
        .number({ invalid_type_error: "Weight must be a number" })
        .min(1, "Weight must be greater than 0")
        .max(500, "Weight value seems incorrect")
        .optional(),

    height: z
        .number({ invalid_type_error: "Height must be a number" })
        .min(30, "Height must be greater than 30cm")
        .max(300, "Height value seems incorrect")
        .optional(),

    oxygenLevel: z
        .number({ invalid_type_error: "Oxygen level must be a number" })
        .min(50, "Oxygen level seems dangerously low")
        .max(100, "Oxygen level cannot exceed 100%")
        .optional(),
});

const testResultSchema = z.object({
    name: z
        .string({ required_error: "Test name is required" })
        .trim()
        .min(2, "Test name must be at least 2 characters")
        .max(100, "Test name too long"),

    fileUrl: z
        .string({ required_error: "File URL is required" })
        .url("File URL must be a valid URL"),

    uploadedBy: z.enum(["patient", "doctor"], {
        required_error: "uploadedBy is required",
        errorMap: () => ({ message: "uploadedBy must be 'patient' or 'doctor'" }),
    }),
});


export const updateConsultationSchema = z
    .object({
        status: z
            .enum(["completed", "cancelled", "no-show"], {
                errorMap: () => ({ message: "Status must be completed, cancelled, or no-show" }),
            })
            .optional(),

        duration: z
            .number({ invalid_type_error: "Duration must be a number" })
            .min(1, "Duration must be at least 1 minute")
            .max(480, "Duration cannot exceed 8 hours")
            .optional(),

        notes: z
            .string()
            .trim()
            .max(2000, "Notes cannot exceed 2000 characters")
            .optional(),

        symptoms: z
            .array(z.string().trim().min(2, "Symptom must be at least 2 characters"))
            .optional(),

        vitalSigns: vitalSignsSchema.optional(),

        // For adding new test results — use $push in controller
        testResults: z
            .array(testResultSchema)
            .optional(),
    })
    .refine(
        (data) => Object.values(data).some((val) => val !== undefined),
        { message: "At least one field must be provided for update" }
    );


export const consultationQuerySchema = z.object({
    status: z
        .enum(["completed", "cancelled", "no-show"])
        .optional(),

    from: z
        .string()
        .refine((val) => !isNaN(Date.parse(val)), { message: "Invalid 'from' date format" })
        .optional(),

    to: z
        .string()
        .refine((val) => !isNaN(Date.parse(val)), { message: "Invalid 'to' date format" })
        .optional(),

    page: z
        .string()
        .regex(/^\d+$/, "Page must be a positive number")
        .transform(Number)
        .optional(),

    limit: z
        .string()
        .regex(/^\d+$/, "Limit must be a positive number")
        .transform(Number)
        .optional(),
})
.refine(
    (data) => {
        if (data.from && data.to) {
            return new Date(data.from) <= new Date(data.to);
        }
        return true;
    },
    { message: "'from' date cannot be after 'to' date", path: ["from"] }
);