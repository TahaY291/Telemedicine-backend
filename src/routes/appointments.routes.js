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
import { authorizeRole } from "../middlewares/authorizeRole.middleware.js";

const router = Router();

router.use(verifyUser);

// ── Named routes first ────────────────────────────────────────────────────────
router.post("/create-appointment",                    verifyJWT, authorizeRole("patient",'doctor'), createAppointment);
router.get("/patient-appointments",                   verifyJWT, authorizeRole("patient"), getPatientAppointments);
router.get("/doctor-appointments",                    verifyJWT, authorizeRole("doctor"),  getDoctorAppointments);
router.get("/booked-slots",                           verifyJWT,                        getBookedSlots);
router.put("/cancel-appointment/:appointmentId",      verifyJWT, authorizeRole("patient"), cancelAppointment);
router.put("/update-appointment/:appointmentId",      verifyJWT, authorizeRole("doctor"),  updateAppointmentStatus);

// ── Parameterized routes last ─────────────────────────────────────────────────
router.get( "/:appointmentId/room",                   verifyJWT,                        getRoomId);
router.post("/:appointmentId/start-call",             verifyJWT, authorizeRole("doctor"),  startCall);
router.post("/:appointmentId/end-call",               verifyJWT,                        endCall);
router.post("/:appointmentId/complete-call",          verifyJWT, authorizeRole("doctor"),  completeCall);
router.post("/:appointmentId/pay",                    verifyJWT, authorizeRole("patient"), markAsPaid);  // ← role guard added
router.get( "/:appointmentId",                        verifyJWT,                        getAppointmentById);

// ── Utility ───────────────────────────────────────────────────────────────────
// FIX: moved ABOVE /:appointmentId to prevent route conflict
router.post("/expire",                                verifyJWT,                        expireAppointments);

export default router;