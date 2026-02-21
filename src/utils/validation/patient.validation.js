import { z } from "zod"

const genderEnum = z.enum([
  "male",
  "female",
  "other",
  "prefer not to say"
])

const bloodGroupEnum = z.enum([
  "A+","A-","B+","B-","AB+","AB-","O+","O-"
])

const addressSchema = z.object({
  city: z.string().trim().min(2).optional(),
  street: z.string().trim().min(2).optional()
}).optional()


const personalInfoSchema = z.object({
  dob: z.string().datetime().optional(),
  gender: genderEnum.optional(),
  address: addressSchema,
  profileImage: z.string().url().optional()
}).optional()

const medicalInfoSchema = z.object({
  bloodGroup: bloodGroupEnum.optional(),
  allergies: z.array(z.string()).optional(),
  chronicDiseases: z.array(z.string()).optional(),
  medications: z.array(z.string()).optional(),
  medicalNotes: z.string().optional()
}).optional()

const emergencyInfoSchema = z.object({
  contactName: z.string().min(2).optional(),
  contactPhone: z.string().min(10).optional(),
  relation: z.string().min(2).optional()
}).optional()

export const createPatientProfileSchema = z.object({
  phoneNumber: z
    .string()
    .regex(/^[0-9]{10,15}$/, "Invalid phone number")
    .optional(),

  personalInfo: personalInfoSchema,
  medicalInfo: medicalInfoSchema,
  emergencyInfo: emergencyInfoSchema,
  profileImage: z.string().url().optional()
})

export const updatePatientProfileSchema = z.object({
    phoneNumber: z
        .string()
        .regex(/^[0-9]{10,15}$/, "Invalid phone number")
        .optional(),    
    personalInfo: personalInfoSchema,
    emergencyInfo: emergencyInfoSchema, 
    profileImage: z.string().url().optional()
})