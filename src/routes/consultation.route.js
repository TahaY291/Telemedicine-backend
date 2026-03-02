import { Router } from "express";
import {
    getConsultationById,
    getMyConsultations,
    getDoctorConsultations,
    updateConsultation,
    uploadTestResult,
    getConsultationStats,
} from "../controllers/consultation.controller.js";
import { verifyUser } from "../middlewares/auth.middleware.js";
import { authorizeRole } from "../middlewares/authorizeRole.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router();

router.use(verifyUser);

router.get(
    "/stats",
    authorizeRole("admin"),
    getConsultationStats
);

router.get(
    "/my-consultations",
    authorizeRole("patient"),
    getMyConsultations
);

router.get(
    "/doctor-consultations",
    authorizeRole("doctor"),
    getDoctorConsultations
);

router.patch(
    "/:consultationId",
    authorizeRole("doctor"),
    updateConsultation
);

router.post(
    "/:consultationId/test-results",
    authorizeRole("doctor", "patient"),
    upload.single("testFile"),   
    uploadTestResult
);

router.get(
    "/:consultationId",
    authorizeRole("doctor", "patient", "admin"),
    getConsultationById
);

export default router;