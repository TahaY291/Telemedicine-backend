import { Router } from "express";
import { createDoctorProfile, deleteDoctorProfile, getDoctorById, getMyProfile, updateDoctorProfile } from "../controllers/doctor.controller.js";
import verifyJWT from "../middlewares/verifyjwt.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyUser } from "../middlewares/auth.middleware.js";
const router = Router()

router.post(
    '/doctor-detail',
    verifyUser,upload.fields([
        { name: "doctorImage", maxCount: 1 },
        { name: "certificateImage", maxCount: 1 }
    ]),
    verifyJWT,
    createDoctorProfile
)

router.patch(
    '/doctor-profile',
    verifyUser,upload.fields([
        { name: "doctorImage", maxCount: 1 },
        { name: "certificateImage", maxCount: 1 }
    ]),
    verifyJWT,
    updateDoctorProfile
)

router.delete('/doctor-profile',verifyJWT, verifyUser, deleteDoctorProfile)

router.get('/doctor-profile/me',verifyJWT,  verifyUser, getMyProfile)

router.get('/doctor-profile/:doctorId',verifyJWT, verifyUser, getDoctorById)

export default router