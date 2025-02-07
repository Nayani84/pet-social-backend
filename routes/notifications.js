"use strict";

const express = require("express");
const Notification = require("../models/notification");
const router = express.Router();


/** GET /notifications/:userId */

router.get("/:userId", async (req, res, next) => {
    const { userId } = req.params;
    if (!userId || userId === 'undefined') {
        return res.status(400).json({ error: "Invalid user ID provided" });
    }
    try {
        const notifications = await Notification.getByUserId(req.params.userId);
        return res.json({ notifications });
    } catch (err) {
        return next(err);
    }
});


/** POST /notifications/read/:id */

router.post("/read/:id", async (req, res, next) => {
    try {
        const updatedNotification = await Notification.markAsRead(req.params.id);
        return res.json({ message: "Notification marked as read", notification: updatedNotification });
    } catch (err) {
        if (err.message === "Notification not found") {
            return res.status(404).json({ message: "Notification not found" });
        }
        return next(err);
    }
});


module.exports = router;