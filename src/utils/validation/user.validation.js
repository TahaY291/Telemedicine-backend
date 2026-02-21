import { z } from "zod";

export const roleBasedRegisterSchema = z.object({
    username: z
        .string()
        .trim()
        .min(3, "Username must be at least 3 characters long"),
    email: z
        .string()
        .trim()
        .email("Invalid email address"),
    password: z
        .string()
        .min(6, "Password must be at least 6 characters long"),
    role: z.enum(["patient", "doctor", "admin"]).default("patient"),
});


export const loginSchema = z.object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(6, "Password must be at least 6 characters long"),
});

