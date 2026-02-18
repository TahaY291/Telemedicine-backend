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

export const updatePatientSchema = z.object({
  username: z.string().min(3).optional(),
  email: z.string().email().optional(),
  phoneNumber: z.string().optional(),
  password: z.string().min(6).optional(),
  role: z.enum(["patient"]).optional(),
  personalInfo: z.object({
    dob: z.string().optional(),
    gender: z.enum(["male", "female", "other", "prefer not to say"]).optional(),
    address: z.object({
      city: z.string().optional(),
      street: z.string().optional(),
    }).optional(),
    profileImage: z.string().url().optional(),
  }).optional(),
  medicalInfo: z.object({
    bloodGroup: z.enum(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]).optional(),
    allergies: z.array(z.string()).optional(),
    chronicDiseases: z.array(z.string()).optional(),
    medications: z.array(z.string()).optional(),
    medicalNotes: z.string().optional(),
  }).optional(),
  emergencyInfo: z.object({
    contactName: z.string().optional(),
    contactPhone: z.string().optional(),
    relation: z.string().optional(),
  }).optional(),
  isVerified: z.boolean().optional(),
  verificationToken: z.string().optional(),
  status: z.enum(["active", "blocked", "pending"]).optional(),
  refreshToken: z.string().optional(),
});
