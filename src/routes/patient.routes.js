import { Router } from "express";
import { createdPatientProfile, deletePatientProfile, getMyProfile, getPatientById, updatePatientProfile, uploadPatientProfileImage } from "../controllers/patient.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyUser } from "../middlewares/auth.middleware.js";
import verifyJWT from "../middlewares/verifyjwt.middleware.js";
import { authorizeRole } from "../middlewares/authorizeRole.middleware.js";

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


router.get('/patient-profile/me',verifyJWT, verifyUser,authorizeRole("patient"), getMyProfile)
router.get('/patient-profile/:patientId',verifyJWT, verifyUser, getPatientById)


router.patch(
    '/patient-profile/avatar',
    verifyJWT,
    verifyUser,
    upload.single("profileImage"),
    uploadPatientProfileImage,
    authorizeRole("patient"),
)

router.delete('/patient-profile',verifyJWT,verifyUser,authorizeRole("patient"),  deletePatientProfile)

export default router