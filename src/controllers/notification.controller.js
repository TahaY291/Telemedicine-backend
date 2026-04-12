import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Notification } from "../models/notification.model.js";
import { sseManager } from "../utils/sseManager.js";

export const streamNotifications = (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    const userId = req.user._id.toString();
    sseManager.add(userId, res);

    const heartbeat = setInterval(() => res.write(": ping\n\n"), 30000);

    req.on("close", () => {
        clearInterval(heartbeat);
        sseManager.remove(userId);
    });
};

export const getNotifications = asyncHandler(async (req, res) => {
    const notifs = await Notification.find({ recipient: req.user._id })
        .sort({ createdAt: -1 })
        .limit(30);

    res.json(new ApiResponse(200, notifs, "Notifications fetched successfully"));
});

export const getUnreadCount = asyncHandler(async (req, res) => {
    const count = await Notification.countDocuments({
        recipient: req.user._id,
        isRead: false,
    });

    res.json(new ApiResponse(200, { count }, "Unread count fetched"));
});

export const markRead = asyncHandler(async (req, res) => {
    await Notification.findByIdAndUpdate(req.params.id, { isRead: true });

    res.json(new ApiResponse(200, null, "Notification marked as read"));
});

export const markAllRead = asyncHandler(async (req, res) => {
    await Notification.updateMany(
        { recipient: req.user._id, isRead: false },
        { isRead: true }
    );

    res.json(new ApiResponse(200, null, "All notifications marked as read"));
});

export const deleteNotification = asyncHandler(async (req, res) => {
    await Notification.findByIdAndDelete(req.params.id);

    res.json(new ApiResponse(200, null, "Notification deleted"));
});

export const clearAllNotifications = asyncHandler(async (req, res) => {
    await Notification.deleteMany({ recipient: req.user._id });

    res.json(new ApiResponse(200, null, "All notifications cleared"));
});