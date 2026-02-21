import { Router } from "express";
import { createdPatientProfile, deletePatientProfile, getMyProfile, getPatientById, updatePatientProfile } from "../controllers/patient.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyUser } from "../middlewares/auth.middleware.js";

const router = Router()

router.post(
    '/patient-profile',
    verifyUser,upload.single("profileImage"),
    createdPatientProfile
)

router.patch(
    '/patient-profile',
    verifyUser,upload.single("profileImage"),
    updatePatientProfile
)

router.delete('/patient-profile',verifyUser, deletePatientProfile)

router.get('/patient-profile/me',verifyUser, getMyProfile)

router.get('/patient-profile/:patientId',verifyUser, getPatientById)

export default router