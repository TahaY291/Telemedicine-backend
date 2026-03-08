import { Router } from "express";
import { verifyUser } from "../middlewares/auth.middleware.js";
import { 
    cancelAppointment, 
    createAppointment, 
    getAppointmentById, 
    getDoctorAppointments, 
    getPatientAppointments, 
    updateAppointmentStatus 
} from "../controllers/appointment.controller.js";
import verifyJWT from "../middlewares/verifyjwt.middleware.js";

const router = Router();

router.use(verifyUser); 

router.post('/create-appointment',verifyJWT,  createAppointment);
router.get('/patient-appointments',verifyJWT, getPatientAppointments);
router.put('/cancel-appointment/:appointmentId',verifyJWT, cancelAppointment);

router.get('/doctor-appointments',verifyJWT, getDoctorAppointments);
router.put('/update-appointment/:appointmentId',verifyJWT, updateAppointmentStatus);

router.get('/my-appointments/:appointmentId',verifyJWT, getAppointmentById);

export default router;