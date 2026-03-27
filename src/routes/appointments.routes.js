import { Router } from "express";
import { verifyUser } from "../middlewares/auth.middleware.js";
import verifyJWT from "../middlewares/verifyjwt.middleware.js";
import {
    cancelAppointment,
    completeCall,
    createAppointment,
    endCall,
    getAppointmentById,
    getDoctorAppointments,
    getPatientAppointments,
    getRoomId,
    startCall,
    updateAppointmentStatus
} from "../controllers/appointment.controller.js";

const router = Router();

router.use(verifyUser); // applies to all routes

// ── Named routes first ────────────────────────────────────────────────────────
router.post('/create-appointment', verifyJWT, createAppointment);
router.get('/patient-appointments', verifyJWT, getPatientAppointments);
router.get('/doctor-appointments', verifyJWT, getDoctorAppointments);
router.put('/cancel-appointment/:appointmentId', verifyJWT, cancelAppointment);
router.put('/update-appointment/:appointmentId', verifyJWT, updateAppointmentStatus);

// ── Parameterized routes last ─────────────────────────────────────────────────
router.get('/:appointmentId/room', verifyJWT, getRoomId);
router.post('/:appointmentId/start-call', verifyJWT, startCall);
router.post('/:appointmentId/end-call', verifyJWT, endCall);
router.get('/:appointmentId', verifyJWT, getAppointmentById);
router.post("/:appointmentId/complete-call",  verifyJWT, completeCall);

export default router;