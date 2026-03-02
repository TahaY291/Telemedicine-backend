import { Router } from "express";
import {
    createPrescription,
    updatePrescription,
    getPrescriptionByAppointment,
    getMyPrescriptions,
    getMyWrittenPrescriptions,
} from "../controllers/prescription.controller.js";
import { verifyUser } from "../middlewares/auth.middleware.js";
import { authorizeRole } from "../middlewares/authorizeRole.middleware.js";

const router = Router();

router.use(verifyUser);

router.post(
    "/",
    authorizeRole("doctor"),
    createPrescription
);

router.patch(
    "/:prescriptionId",
    authorizeRole("doctor"),
    updatePrescription
);

router.get(
    "/my-written",
    authorizeRole("doctor"),
    getMyWrittenPrescriptions
);

router.get(
    "/my-prescriptions",
    authorizeRole("patient"),
    getMyPrescriptions
);

router.get(
    "/appointment/:appointmentId",
    authorizeRole("doctor", "patient", "admin"),
    getPrescriptionByAppointment
);

export default router;