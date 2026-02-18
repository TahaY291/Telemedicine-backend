import mongoose from "mongoose";

const patientSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            unique: true,
        },
        phoneNumber: {
            type: String,
            trim: true,
        },
        personalInfo: {
            dob: { type: Date },
            gender: {
                type: String,
                enum: ["male", "female", "other", "prefer not to say"],
            },
            address: {
                city: { type: String, trim: true },
                street: { type: String, trim: true },
            },
            profileImage: { type: String },
        },
        medicalInfo: {
            bloodGroup: {
                type: String,
                enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
            },
            allergies: [{ type: String }],
            chronicDiseases: [{ type: String }],
            medications: [{ type: String }],
            medicalNotes: { type: String },
        },
        emergencyInfo: {
            contactName: { type: String },
            contactPhone: { type: String },
            relation: { type: String },
        },
    },
    {
        timestamps: true,
    }
);


export const Patient = mongoose.model("Patient", patientSchema);