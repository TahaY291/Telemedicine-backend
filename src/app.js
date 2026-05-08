import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import { createServer } from "http";
import { Server } from "socket.io";

const app = express();
const httpServer = createServer(app);

// ── Middleware FIRST ──────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(",") || ["http://localhost:5174"],
  credentials: true,
}));
app.use(express.json({ limit: '16kb' }));           // ← must be before routes
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());

// ── Socket.io ─────────────────────────────────────────────────────────────────
const io = new Server(httpServer, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(",") || ["http://localhost:5174"],
    credentials: true,
  },
});

const activeRooms = new Map();

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  socket.on("join-room", ({ roomId, userId, role }) => {
    socket.join(roomId);
    socket.data = { roomId, userId, role };
    if (!activeRooms.has(roomId)) activeRooms.set(roomId, {});
    activeRooms.get(roomId)[role] = socket.id;
    socket.to(roomId).emit("user-joined", { role, socketId: socket.id });
  });

  socket.on("webrtc-offer",  ({ roomId, offer })      => socket.to(roomId).emit("webrtc-offer",      { offer, from: socket.id }));
  socket.on("webrtc-answer", ({ roomId, answer })     => socket.to(roomId).emit("webrtc-answer",     { answer, from: socket.id }));
  socket.on("ice-candidate", ({ roomId, candidate })  => socket.to(roomId).emit("ice-candidate",     { candidate, from: socket.id }));
  socket.on("media-toggle",  ({ roomId, type, enabled }) => socket.to(roomId).emit("peer-media-toggle", { type, enabled }));

  socket.on("end-call", ({ roomId }) => {
    socket.to(roomId).emit("call-ended");
    activeRooms.delete(roomId);
  });

  socket.on("disconnect", () => {
    const { roomId, role } = socket.data || {};
    if (roomId) {
      socket.to(roomId).emit("peer-disconnected", { role });
      const room = activeRooms.get(roomId);
      if (room) delete room[role];
    }
  });
});

// ── Routes ────────────────────────────────────────────────────────────────────
import userRouter         from './routes/user.routes.js';
import patientRouter      from './routes/patient.routes.js';
import doctorRouter       from './routes/doctor.routes.js';
import appointmentRouter  from './routes/appointments.routes.js';
import consultationRouter from './routes/consultation.route.js';
import prescriptionRouter from './routes/prescription.route.js';
import reviewRouter       from './routes/review.route.js';
import notificationRouter    from './routes/notification.routes.js';
import adminRouter    from './routes/admin.routes.js';
import { errorHandler } from './middlewares/error.middleware.js';

app.use('/api/v1/users',         userRouter);
app.use('/api/v1/patients',      patientRouter);
app.use('/api/v1/doctors',       doctorRouter);
app.use('/api/v1/appointments',  appointmentRouter);
app.use('/api/v1/consultations', consultationRouter);
app.use('/api/v1/prescriptions', prescriptionRouter);
app.use('/api/v1/reviews',       reviewRouter);
app.use('/api/v1/notifications', notificationRouter);
app.use('/api/v1/admin', adminRouter);

app.use(errorHandler)

// ── Export — never call listen here ──────────────────────────────────────────
export { app, httpServer };