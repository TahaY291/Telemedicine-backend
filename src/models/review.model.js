import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
    {
        doctorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Doctor",
            required: true,
            index: true,
        },
        patientId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Patient",
            required: true,
        },
        appointmentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Appointment",
            required: true,
            unique: true,
        },
        rating: {
            type: Number,
            required: [true, "Rating is required"],
            min: [1, "Rating must be at least 1"],
            max: [5, "Rating cannot exceed 5"],
        },
        comment: {
            type: String,
            trim: true,
            maxlength: [500, "Comment cannot exceed 500 characters"],
        },

        // Optional: Detailed ratings
        punctuality: {
            type: Number,
            min: 1,
            max: 5,
        },
        communication: {
            type: Number,
            min: 1,
            max: 5,
        },
        treatment: {
            type: Number,
            min: 1,
            max: 5,
        },
    },
    {
        timestamps: true,
    }
);

// ===== INDEXES =====
reviewSchema.index({ doctorId: 1, createdAt: -1 });
reviewSchema.index({ patientId: 1 });
reviewSchema.index({ rating: -1 });

// ===== AUTO-UPDATE DOCTOR'S RATING =====
reviewSchema.post("save", async function (doc) {
    await updateDoctorRating(doc.doctorId);
});

reviewSchema.post("findOneAndUpdate", async function (doc) {
    if (doc) {
        await updateDoctorRating(doc.doctorId);
    }
});

reviewSchema.post("findOneAndDelete", async function (doc) {
    if (doc) {
        await updateDoctorRating(doc.doctorId);
    }
});

// Helper function to recalculate doctor's rating
async function updateDoctorRating(doctorId) {
    try {
        const Review = mongoose.model("Review");
        const Doctor = mongoose.model("Doctor");

        const stats = await Review.aggregate([
            { $match: { doctorId: doctorId } },
            {
                $group: {
                    _id: null,
                    averageRating: { $avg: "$rating" },
                    totalReviews: { $sum: 1 },
                },
            },
        ]);

        const { averageRating = 0, totalReviews = 0 } = stats[0] || {};

        await Doctor.findByIdAndUpdate(doctorId, {
            rating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
            totalReviews: totalReviews,
            statsLastUpdated: new Date(),
        });
    } catch (error) {
        console.error("Error updating doctor rating:", error);
    }
}

export const Review = mongoose.model("Review", reviewSchema);