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

const router = Router();

router.use(verifyUser); 

router.post('/create-appointment', createAppointment);
router.get('/patient-appointments', getPatientAppointments);
router.put('/cancel-appointment/:appointmentId', cancelAppointment);

router.get('/doctor-appointments', getDoctorAppointments);
router.put('/update-appointment/:appointmentId', updateAppointmentStatus);

router.get('/my-appointments/:appointmentId', getAppointmentById);

export default router;