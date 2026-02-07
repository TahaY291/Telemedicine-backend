import mongoose from "mongoose";
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const patientSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "Name is required"],
            trim: true,
            index: true,
        },
        email: {
            type: String,
            required: [true, "Email is required"],
            unique: true,
            lowercase: true,
            trim: true,
            match: [/\S+@\S+\.\S+/, 'is invalid']
        },
        phoneNumber: {
            type: String,
            trim: true,
        },
        password: {
            type: String,
            required: true,
            select: false,
        },
        role: {
            type: String,
            enum: ["patient"],
            default: "patient",
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
        isVerified: { type: Boolean, default: false },
        verificationToken: String, 
        status: {
            type: String,
            enum: ["active", "blocked", "pending"],
            default: "active",
        },
        refreshToken: {
            type: String
        }
    },
    {
        timestamps: true,
    }
);

patientSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next();
    this.password = await bcrypt.hash(this.password, 10);
    next();
});

patientSchema.methods.isPasswordCorrect = async function (password) {
    return await bcrypt.compare(password, this.password);
};

patientSchema.methods.generateAccessToken = function () {
    return jwt.sign(
        { _id: this._id, email: this.email, role: this.role },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: process.env.ACCESS_TOKEN_EXPIRY }
    );
};

patientSchema.methods.generateRefreshToken = function () {
    return jwt.sign(
        { _id: this._id },
        process.env.REFRESH_TOKEN_SECRET,
        { expiresIn: process.env.REFRESH_TOKEN_EXPIRY }
    );
};

export const Patient = mongoose.model("Patient", patientSchema);