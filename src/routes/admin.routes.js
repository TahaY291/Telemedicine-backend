// dashboardRoutes.js
import { Router } from "express";
import { deleteDoctorProfile, getDoctorStatsForAdmin, getTotalModalData, listDoctors, updateDoctorStatus } from "../controllers/admin.controller.js";
import { getRecentActivity } from "../controllers/admin.controller.js";
import { getWeeklyAppointmentsChart } from "../controllers/admin.controller.js";
import { verifyUser } from "../middlewares/auth.middleware.js";

const router = Router()

router.use(verifyUser);

router.get("/doctors/:doctorId/stats", getDoctorStatsForAdmin);
router.get("/stats",        getTotalModalData);
router.get("/activity",     getRecentActivity);
router.get("/weekly-chart", getWeeklyAppointmentsChart);
router.get("/doctors", listDoctors);
router.delete("/doctors/:doctorId", deleteDoctorProfile);
router.patch("/doctors/:doctorId/status", updateDoctorStatus);


export default router