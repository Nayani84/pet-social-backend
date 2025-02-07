const db = require("../db");

class Notification {
    /** 
      * Create a new notification.
      * Data: { userId, type, content }
      * Returns: { id, userId, type, content, read, createdAt }
      */

    static async create({ userId, type, content }) {
        const result = await db.query(
            `INSERT INTO notifications (user_id, type, content, is_read, created_at)
             VALUES ($1, $2, $3, false, NOW())
             RETURNING id, user_id, type, content, is_read, created_at`,
            [userId, type, content]
        );
        return result.rows[0];
    }


    /**
   * Get notifications for a user.
   * Returns an array of notifications.
   */

    static async getByUserId(userId) {
        const result = await db.query(
            `SELECT id, type, content, is_read, created_at
             FROM notifications
             WHERE user_id = $1
             ORDER BY created_at DESC`,
            [userId]
        );
        return result.rows;
    }


    /**
       * Mark a notification as read.
       * Returns the updated notification.
       */

    static async markAsRead(notificationId) {
        const result = await db.query(
            `UPDATE notifications 
            SET is_read = true 
            WHERE id = $1 
            RETURNING id, user_id, type, content, is_read, created_at`,
            [notificationId]
        );
        if (!result.rows[0]) {
            throw new Error("Notification not found");
        }
        return result.rows[0];
    }
}


module.exports = Notification;
