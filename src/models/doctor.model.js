import mongoose from "mongoose";

const doctorSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            unique: true,
        },
        gender: {
            type: String,
            enum: ["male", "female", "other"],
            required: [true, "Gender is required"],
        },


        specialization: {
            type: String,
            required: [true, "Specialization is required"],
            trim: true,
            index: true, 
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
        location: {
            city: {
                type: String,
                required: [true, "City is required"],
                trim: true,
                index: true, 
            },
            address: {
                type: String,
                trim: true,
            },
        },

        consultationFee: {
            type: Number,
            required: [true, "Consultation fee is required"],
            min: [0, "Fee cannot be negative"],
        },

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
                    type: String,
                },
                endTime: {
                    type: String,
                },
                isAvailable: {
                    type: Boolean,
                    default: true,
                },
            },
        ],

        doctorImage: {
            type: String,
            default: "default-doctor.png",
        },
        certificateImage: {
            type: String,
        },

        isVerified: {
            type: Boolean,
            default: false,
        },
        isActive: {
            type: Boolean,
            default: true,
        },

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

        statsLastUpdated: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: true,
    }
);


doctorSchema.index({ specialization: 1, "location.city": 1 });
doctorSchema.index({ rating: -1 }); 
doctorSchema.index({ isVerified: 1, isActive: 1 });

doctorSchema.methods.refreshStats = async function () {
    const Consultation = mongoose.model("Consultation");
    const Review = mongoose.model("Review");

    const consultationCount = await Consultation.countDocuments({
        doctorId: this._id,
        status: "completed",
    });

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

    this.numberOfConsultations = consultationCount;
    this.rating = Math.round(averageRating * 10) / 10; 
    this.totalReviews = totalReviews;
    this.statsLastUpdated = new Date();

    await this.save();
    return this;
};

export const Doctor = mongoose.model("Doctor", doctorSchema);