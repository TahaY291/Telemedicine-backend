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
import verifyJWT from "../middlewares/verifyjwt.middleware.js";

const router = Router();

router.use(verifyUser);

router.post(
    "/",
    authorizeRole("doctor"),
    verifyJWT,
    createPrescription
);

router.patch(
    "/:prescriptionId",
    authorizeRole("doctor"),
    verifyJWT,
    updatePrescription
);

router.get(
    "/my-written",
    authorizeRole("doctor"),
    verifyJWT,
    getMyWrittenPrescriptions
);

router.get(
    "/my-prescriptions",
    authorizeRole("patient"),
    verifyJWT,
    getMyPrescriptions
);

router.get(
    "/appointment/:appointmentId",
    authorizeRole("doctor", "patient", "admin"),
    verifyJWT,
    getPrescriptionByAppointment
);

export default router;