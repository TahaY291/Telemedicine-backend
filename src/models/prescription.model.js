import mongoose from "mongoose";

const prescriptionSchema = new mongoose.Schema(
    {
        appointmentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Appointment",
            required: true,
            unique: true, // One prescription per appointment
        },
        doctorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Doctor",
            required: true,
        },
        patientId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Patient",
            required: true,
        },
        medicines: [
            {
                name: { type: String, required: true },
                dosage: { type: String, required: true },
                duration: { type: String, required: true },
                instructions: String,
            },
        ],
        diagnosis: {
            type: String,
            required: true,
        },
        notes: String,
        labTests: [String],
        followUpDate: Date,
    },
    {
        timestamps: true,
    }
);

// ===== AUTO-CREATE CONSULTATION WHEN PRESCRIPTION IS SAVED =====
prescriptionSchema.post("save", async function (doc) {
    try {
        const Consultation = mongoose.model("Consultation");
        const Appointment = mongoose.model("Appointment");

        // Check if consultation already exists
        const existingConsultation = await Consultation.findOne({
            appointmentId: doc.appointmentId,
        });

        if (!existingConsultation) {
            // Get appointment details for fees
            const appointment = await Appointment.findById(doc.appointmentId);

            // Create consultation record
            await Consultation.create({
                doctorId: doc.doctorId,
                patientId: doc.patientId,
                appointmentId: doc.appointmentId,
                prescriptionId: doc._id,
                status: "completed",
                fees: appointment?.consultationFee || 0,
            });
        }
    } catch (error) {
        console.error("Error creating consultation:", error);
    }
});

export const Prescription = mongoose.model("Prescription", prescriptionSchema);