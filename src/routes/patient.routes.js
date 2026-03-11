import { Router } from "express";
import { createdPatientProfile, deletePatientProfile, getMyProfile, getPatientById, updatePatientProfile, uploadPatientProfileImage } from "../controllers/patient.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyUser } from "../middlewares/auth.middleware.js";
import verifyJWT from "../middlewares/verifyjwt.middleware.js";

const router = Router()

router.post(
    '/patient-profile',
    verifyUser,upload.single("profileImage"),
    verifyJWT,
    createdPatientProfile
)

router.patch(
    '/patient-profile',
    verifyUser,upload.single("profileImage"),
    verifyJWT,
    updatePatientProfile
)

router.delete('/patient-profile',verifyJWT,verifyUser, deletePatientProfile)

router.get('/patient-profile/me',verifyJWT, verifyUser, getMyProfile)

router.patch(
    '/patient-profile/avatar',
    verifyJWT,
    verifyUser,
    upload.single("profileImage"),
    uploadPatientProfileImage
)

router.get('/patient-profile/:patientId',verifyJWT, verifyUser, getPatientById)

export default router