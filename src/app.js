import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
const app = express()


app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

app.use (express.json({limit: '16kb'}))
app.use(express.urlencoded({extended: true, limit:"16kb"}))
app.use(express.static("public"))
app.use(cookieParser())

//route import
import userRouter from './routes/user.routes.js'
import patientRouter from './routes/patient.routes.js'
import doctorRouter from './routes/doctor.routes.js'
import appointmentRouter from './routes/appointments.routes.js'
import consultationRouter from './routes/consultation.route.js'
import prescriptionRouter from './routes/prescription.route.js'
import reviewRouter from './routes/review.route.js'

app.use('/api/v1/users' , userRouter)
app.use('/api/v1/patients' , patientRouter)
app.use('/api/v1/doctors' , doctorRouter)
app.use('/api/v1/appointments' , appointmentRouter)
app.use('/api/v1/consultations' , consultationRouter)
app.use('/api/v1/prescriptions' , prescriptionRouter)
app.use('/api/v1/reviews' , reviewRouter)

export { app }