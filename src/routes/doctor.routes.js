import { Router } from "express";
import {
  createDoctorProfile, deleteDoctorProfile, getDoctorById,
  getMyProfile, updateDoctorProfile, listDoctors,
  getDoctorStats, getMyPatients, getPatientRecords
} from "../controllers/doctor.controller.js";
import verifyJWT from "../middlewares/verifyjwt.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyUser } from "../middlewares/auth.middleware.js";
import { authorizeRole } from "../middlewares/authorizeRole.middleware.js";
const router = Router();


// ── Public ──────────────────────────────────────────────
router.get("/doctors", listDoctors);

// ── Specific routes FIRST (before :doctorId wildcard) ──
router.get("/doctor-profile/me",        verifyUser, verifyJWT, authorizeRole('doctor'), getMyProfile);
router.get("/doctor-stats",             verifyUser, verifyJWT,authorizeRole('doctor', 'admin'), getDoctorStats);
router.get("/my-patients",              verifyUser, verifyJWT, authorizeRole('doctor'),getMyPatients);
router.get("/patient/:patientId/records", verifyUser, verifyJWT,authorizeRole('doctor'), getPatientRecords);

// ── Parameterized route LAST ─────────────────────────────
router.get("/doctor-profile/:doctorId", verifyUser, verifyJWT, getDoctorById);




// ── Mutations ────────────────────────────────────────────
router.post(
  "/doctor-detail",
  verifyUser,
  upload.fields([
    { name: "doctorImage",      maxCount: 1 },
    { name: "certificateImage", maxCount: 1 },
  ]),
  verifyJWT,
  createDoctorProfile
);

router.patch(
  "/doctor-profile",
  verifyUser,
  upload.fields([
    { name: "doctorImage",      maxCount: 1 },
    { name: "certificateImage", maxCount: 1 },
  ]),
  verifyJWT,
  updateDoctorProfile
);

router.delete("/doctor-profile", verifyUser, verifyJWT, deleteDoctorProfile);

export default router;