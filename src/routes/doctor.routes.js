import { Router } from "express";
import { createDoctorProfile, deleteDoctorProfile, getDoctorById, getMyProfile, updateDoctorProfile } from "../controllers/doctor.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyUser } from "../middlewares/auth.middleware.js";
const router = Router()

router.post(
    '/doctor-detail',
    verifyUser,upload.fields([
        { name: "doctorImage", maxCount: 1 },
        { name: "certificateImage", maxCount: 1 }
    ]),
    createDoctorProfile
)

router.patch(
    '/doctor-profile',
    verifyUser,upload.fields([
        { name: "doctorImage", maxCount: 1 },
        { name: "certificateImage", maxCount: 1 }
    ]),
    updateDoctorProfile
)

router.delete('/doctor-profile', verifyUser, deleteDoctorProfile)

router.get('/doctor-profile/me', verifyUser, getMyProfile)

router.get('/doctor-profile/:doctorId',verifyUser, getDoctorById)

export default router