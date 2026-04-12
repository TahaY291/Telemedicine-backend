import express from "express";

import {
    streamNotifications,
    getNotifications,
    getUnreadCount,
    markRead,
    markAllRead,
    deleteNotification,
    clearAllNotifications,
} from "../controllers/notification.controller.js";
import verifyJWT from "../middlewares/verifyjwt.middleware.js";

const router = express.Router();

router.use(verifyJWT);

router.get("/stream", streamNotifications);

router.get("/",             getNotifications);
router.get("/unread-count", getUnreadCount);

router.patch("/read-all", markAllRead);
router.patch("/:id",      markRead);

router.delete("/",    clearAllNotifications);
router.delete("/:id", deleteNotification);

export default router;