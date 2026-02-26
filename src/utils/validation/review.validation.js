import zod from "zod";

const detailedRating = zod
    .number({ invalid_type_error: "Rating must be a number" })
    .min(1, "Rating must be at least 1")
    .max(5, "Rating cannot exceed 5")
    .optional();

export const createReviewSchema = zod.object({
    appointmentId: zod
        .string({ required_error: "Appointment ID is required" })
        .regex(/^[a-fA-F0-9]{24}$/, "Invalid appointment ID format"), // valid MongoDB ObjectId

    rating: zod
        .number({ required_error: "Rating is required", invalid_type_error: "Rating must be a number" })
        .min(1, "Rating must be at least 1")
        .max(5, "Rating cannot exceed 5"),

    comment: zod
        .string()
        .trim()
        .max(500, "Comment cannot exceed 500 characters")
        .optional(),

    punctuality:   detailedRating,
    communication: detailedRating,
    treatment:     detailedRating,
});

export const updateReviewSchema = zod
    .object({
        rating: zod
            .number({ invalid_type_error: "Rating must be a number" })
            .min(1, "Rating must be at least 1")
            .max(5, "Rating cannot exceed 5")
            .optional(),

        comment: zod
            .string()
            .trim()
            .max(500, "Comment cannot exceed 500 characters")
            .optional(),

        punctuality:   detailedRating,
        communication: detailedRating,
        treatment:     detailedRating,
    })
    .refine(
        (data) => Object.keys(data).some((key) => data[key] !== undefined),
        { message: "At least one field must be provided for update" }
    );