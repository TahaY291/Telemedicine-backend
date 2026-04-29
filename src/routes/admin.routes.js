import { Router } from "express";
import {
    deleteDoctorProfile,
    getDoctorStatsForAdmin,
    getTotalModalData,
    listDoctors,
    listPatients,
    updateDoctorStatus,
    updatePatientStatus,
    deletePatientByAdmin,
    getRecentActivity,
    getWeeklyAppointmentsChart,
    getAllAppointmentsForAdmin,
    getAllReviewsForAdmin,
    deleteReviewByAdmin,
} from "../controllers/admin.controller.js";
import { verifyUser } from "../middlewares/auth.middleware.js";
import { getAdminReports } from "../controllers/reports.controller.js";

const router = Router();
router.use(verifyUser);

router.get("/doctors/:doctorId/stats",      getDoctorStatsForAdmin);
router.get("/stats",                        getTotalModalData);
router.get("/activity",                     getRecentActivity);
router.get("/weekly-chart",                 getWeeklyAppointmentsChart);
router.get("/doctors",                      listDoctors);
router.get("/patients",                     listPatients);
router.delete("/doctors/:doctorId",         deleteDoctorProfile);
router.delete("/patients/:patientId",       deletePatientByAdmin);
router.patch("/doctors/:doctorId/status",   updateDoctorStatus);
router.patch("/patients/:patientId/status", updatePatientStatus);
router.get("/appointments", getAllAppointmentsForAdmin);
router.get("/reviews",        getAllReviewsForAdmin);
router.delete("/reviews/:reviewId", deleteReviewByAdmin);
router.get("/reports", getAdminReports);

export default router;