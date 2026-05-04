import { Router } from "express";
import { verifyUser } from "../middlewares/auth.middleware.js";
import verifyJWT from "../middlewares/verifyjwt.middleware.js";
import {
    cancelAppointment,
    completeCall,
    createAppointment,
    endCall,
    expireAppointments,
    getAppointmentById,
    getBookedSlots,
    getDoctorAppointments,
    getPatientAppointments,
    getRoomId,
    markAsPaid,
    startCall,
    updateAppointmentStatus
} from "../controllers/appointment.controller.js";

const router = Router();

router.use(verifyUser);

// ── Role restriction helper ───────────────────────────────────────────────────
const restrictTo = (...roles) => (req, res, next) => {
    if (!roles.includes(req.user.role)) {
        return res.status(403).json({ message: `Access denied for role: ${req.user.role}` });
    }
    next();
};

// ── Named routes first ────────────────────────────────────────────────────────
router.post("/create-appointment",                    verifyJWT, restrictTo("patient"), createAppointment);
router.get("/patient-appointments",                   verifyJWT, restrictTo("patient"), getPatientAppointments);
router.get("/doctor-appointments",                    verifyJWT, restrictTo("doctor"),  getDoctorAppointments);
router.get("/booked-slots",                           verifyJWT,                        getBookedSlots);
router.put("/cancel-appointment/:appointmentId",      verifyJWT, restrictTo("patient"), cancelAppointment);
router.put("/update-appointment/:appointmentId",      verifyJWT, restrictTo("doctor"),  updateAppointmentStatus);

// ── Parameterized routes last ─────────────────────────────────────────────────
router.get( "/:appointmentId/room",                   verifyJWT,                        getRoomId);
router.post("/:appointmentId/start-call",             verifyJWT, restrictTo("doctor"),  startCall);
router.post("/:appointmentId/end-call",               verifyJWT,                        endCall);
router.post("/:appointmentId/complete-call",          verifyJWT, restrictTo("doctor"),  completeCall);
router.post("/:appointmentId/pay",                    verifyJWT, restrictTo("patient"), markAsPaid);  // ← role guard added
router.get( "/:appointmentId",                        verifyJWT,                        getAppointmentById);

// ── Utility ───────────────────────────────────────────────────────────────────
// FIX: moved ABOVE /:appointmentId to prevent route conflict
router.post("/expire",                                verifyJWT,                        expireAppointments);

export default router;