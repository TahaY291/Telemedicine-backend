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
import verifyJWT from "../middlewares/verifyjwt.middleware.js";

const router = Router();

router.use(verifyUser);

router.get(
    "/stats",
    authorizeRole("admin"),
    verifyJWT,
    getConsultationStats
);

router.get(
    "/my-consultations",
    authorizeRole("patient"),
    verifyJWT,
    getMyConsultations
);

router.get(
    "/doctor-consultations",
    authorizeRole("doctor"),
    verifyJWT,
    getDoctorConsultations
);

router.patch(
    "/:consultationId",
    authorizeRole("doctor"),
    verifyJWT,
    updateConsultation
);

router.post(
    "/:consultationId/test-results",
    authorizeRole("doctor", "patient"),
    upload.single("testFile"),   
    verifyJWT,
    uploadTestResult
);

router.get(
    "/:consultationId",
    authorizeRole("doctor", "patient", "admin"),
    verifyJWT,
    getConsultationById
);

export default router;