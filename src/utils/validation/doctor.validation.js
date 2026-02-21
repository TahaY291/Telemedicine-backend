import { z } from "zod";

const genderEnum = z.enum(["male", "female", "other"]);

const dayEnum = z.enum([
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday"
]);

const locationSchema = z.object({
  city: z.string().trim().min(2, "City is required"),
  address: z.string().trim().optional()
});

const availabilitySlotSchema = z.object({
  day: dayEnum,
  startTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid time format HH:mm"),

  endTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid time format HH:mm"),

  isAvailable: z.boolean().optional()
}).refine(
    (slot) => slot.startTime < slot.endTime,
    { message: "End time must be after start time" }
);

export const createDoctorSchema = z.object({
  gender: genderEnum,

  specialization: z
    .string()
    .trim()
    .min(2, "Specialization required"),

  qualifications: z
    .string()
    .trim()
    .min(2, "Qualifications required"),

  experience: z
    .number()
    .min(0, "Experience cannot be negative"),

  location: locationSchema,

  consultationFee: z
    .number()
    .min(0, "Fee cannot be negative"),

  availabilitySlots: z
    .array(availabilitySlotSchema)
    .min(1, "At least one slot required")
    .optional(),

  doctorImage: z.string().url().optional(),
  certificateImage: z.string().url().optional()
});


export const updateDoctorSchema = z.object({
  gender: genderEnum.optional(),

  specialization: z
    .string()
    .trim()
    .min(2)
    .optional(),

  qualifications: z
    .string()
    .trim()
    .min(2)
    .optional(),

  experience: z
    .number()
    .min(0)
    .optional(),

  location: locationSchema.partial().optional(),

  consultationFee: z
    .number()
    .min(0)
    .optional(),

  availabilitySlots: z
    .array(availabilitySlotSchema)
    .optional(),

  doctorImage: z.string().url().optional(),
  certificateImage: z.string().url().optional()
});