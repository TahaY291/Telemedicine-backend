import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const doctorSchema = new mongoose.Schema(
    {
        // ===== BASIC INFO =====
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
            match: [/\S+@\S+\.\S+/, "Email is invalid"],
        },
        password: {
            type: String,
            required: [true, "Password is required"],
            select: false,
            minlength: [6, "Password must be at least 6 characters"],
        },
        role: {
            type: String,
            enum: ["doctor"],
            default: "doctor",
        },
        gender: {
            type: String,
            enum: ["male", "female", "other"],
            required: [true, "Gender is required"],
        },

        // ===== PROFESSIONAL DETAILS =====
        specialization: {
            type: String,
            required: [true, "Specialization is required"],
            trim: true,
            index: true, // For search
        },
        qualifications: {
            type: String,
            required: [true, "Qualifications are required"],
            trim: true,
        },
        experience: {
            type: Number,
            required: [true, "Experience is required"],
            min: [0, "Experience cannot be negative"],
        },

        // ===== LOCATION =====
        location: {
            city: {
                type: String,
                required: [true, "City is required"],
                trim: true,
                index: true, // For location-based search
            },
            address: {
                type: String,
                trim: true,
            },
        },

        // ===== CONSULTATION DETAILS =====
        consultationFee: {
            type: Number,
            required: [true, "Consultation fee is required"],
            min: [0, "Fee cannot be negative"],
        },

        // ===== AVAILABILITY =====
        availabilitySlots: [
            {
                day: {
                    type: String,
                    enum: [
                        "Monday",
                        "Tuesday",
                        "Wednesday",
                        "Thursday",
                        "Friday",
                        "Saturday",
                        "Sunday",
                    ],
                },
                startTime: {
                    type: String, // e.g., "09:00"
                },
                endTime: {
                    type: String, // e.g., "17:00"
                },
                isAvailable: {
                    type: Boolean,
                    default: true,
                },
            },
        ],

        // ===== IMAGES =====
        doctorImage: {
            type: String,
            default: "default-doctor.png",
        },
        certificateImage: {
            type: String,
        },

        // ===== STATUS =====
        isVerified: {
            type: Boolean,
            default: false,
        },
        isActive: {
            type: Boolean,
            default: true,
        },

        // ===== CACHED STATS (Hybrid Approach) ⭐ =====
        numberOfConsultations: {
            type: Number,
            default: 0,
            min: 0,
        },
        rating: {
            type: Number,
            default: 0,
            min: 0,
            max: 5,
        },
        totalReviews: {
            type: Number,
            default: 0,
            min: 0,
        },

        // Track when stats were last updated
        statsLastUpdated: {
            type: Date,
            default: Date.now,
        },

        // ===== AUTHENTICATION =====
        refreshToken: {
            type: String,
            select: false,
        },
    },
    {
        timestamps: true,
    }
);

// ===== INDEXES FOR PERFORMANCE =====
doctorSchema.index({ specialization: 1, "location.city": 1 });
doctorSchema.index({ rating: -1 }); // For sorting by rating
doctorSchema.index({ isVerified: 1, isActive: 1 });

// ===== PASSWORD HASHING =====
doctorSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next();
    this.password = await bcrypt.hash(this.password, 10);
    next();
});

// ===== METHODS =====
doctorSchema.methods.isPasswordCorrect = async function (password) {
    return await bcrypt.compare(password, this.password);
};

doctorSchema.methods.generateAccessToken = function () {
    return jwt.sign(
        { _id: this._id, email: this.email, role: this.role },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: process.env.ACCESS_TOKEN_EXPIRY }
    );
};

doctorSchema.methods.generateRefreshToken = function () {
    return jwt.sign(
        { _id: this._id },
        process.env.REFRESH_TOKEN_SECRET,
        { expiresIn: process.env.REFRESH_TOKEN_EXPIRY }
    );
};

// Method to refresh stats from actual data
doctorSchema.methods.refreshStats = async function () {
    const Consultation = mongoose.model("Consultation");
    const Review = mongoose.model("Review");

    // Get consultation count
    const consultationCount = await Consultation.countDocuments({
        doctorId: this._id,
        status: "completed",
    });

    // Get rating stats
    const ratingStats = await Review.aggregate([
        { $match: { doctorId: this._id } },
        {
            $group: {
                _id: null,
                averageRating: { $avg: "$rating" },
                totalReviews: { $sum: 1 },
            },
        },
    ]);

    const { averageRating = 0, totalReviews = 0 } = ratingStats[0] || {};

    // Update cached values
    this.numberOfConsultations = consultationCount;
    this.rating = Math.round(averageRating * 10) / 10; // Round to 1 decimal
    this.totalReviews = totalReviews;
    this.statsLastUpdated = new Date();

    await this.save();
    return this;
};

export const Doctor = mongoose.model("Doctor", doctorSchema);