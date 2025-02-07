"use strict";

const express = require("express");
const Comment = require("../models/comment");
const Notification = require("../models/notification");
const { ensureLoggedIn } = require("../middleware/auth");
const { NotFoundError, ForbiddenError } = require("../expressError");
const { getIO } = require("../socket");
const db = require("../db");
const router = express.Router();


/** GET /comments/:postId
 * Get all comments for a specific post.
 * Response: [{ id, postId, ownerId, content, createdAt }, ...]
 */

router.get("/:postId", async (req, res, next) => {
    try {
        const postId = req.params.postId;
        const comments = await Comment.getCommentsForPost(postId);
        return res.json({ comments });
    } catch (err) {
        return next(err);
    }
});


/** POST /comments/:postId
 * Add a new comment to a specific post.
 * Expects a JSON body with `content`.
 * Returns the created comment: { id, postId, ownerId, content, createdAt }
 */

router.post("/:postId", ensureLoggedIn, async (req, res, next) => {
    try {
        const { postId } = req.params;
        const { content } = req.body;
        const username = res.locals.user.username;

        // Validate that content exists
        if (!content || content.trim() === "") {
            return res.status(400).json({ error: "Content cannot be empty." });
        }

        // Fetch the post to get the owner's ID
        const postResult = await db.query(
            `SELECT owner_id FROM posts WHERE id = $1`,
            [postId]
        );

        if (postResult.rows.length === 0) {
            return res.status(404).json({ error: "Post not found" });
        }

        const postOwnerId = postResult.rows[0].owner_id;

        // Create a new comment in the database
        const newComment = await Comment.createComment(username, postId, content);

        // Create a notification for the post owner
        if (postOwnerId !== res.locals.user.id) { // Check if the commentor is not the post owner
            await Notification.create({
                userId: postOwnerId,
                type: 'comment',
                content: `${username} commented on your post: ${content}`
            });
        }

        // Optionally, emit a real-time notification if using WebSocket
        const io = getIO();
        io.emit("receiveNotification", {
            type: "comment",
            postId: postId,
            content: `${username} commented on post #${postId}: "${content}"`,
        });

        return res.status(201).json({ comment: newComment });
    } catch (err) {
        return next(err);
    }
});


/** PATCH /comments/:commentId
 * Update a comment by its ID.
 * Expects a JSON body with `content`.
 * Returns the updated comment: { id, postId, ownerId, content, createdAt }
 */

router.patch("/:commentId", ensureLoggedIn, async (req, res, next) => {
    try {
        const { commentId } = req.params;
        const { content } = req.body;
        const username = res.locals.user.username;

        // Validate that content exists
        if (!content || content.trim() === "") {
            return res.status(400).json({ error: "Content cannot be empty." });
        }

        // Update the comment
        const updatedComment = await Comment.updateComment(commentId, username, content);
        return res.status(200).json({ comment: updatedComment });
    } catch (err) {
        if (err instanceof NotFoundError) {
            return res.status(404).json({ error: err.message });
        }
        if (err instanceof ForbiddenError) {
            return res.status(403).json({ error: err.message });
        }
        return next(err);
    }
});


/** DELETE /comments/:commentId
 * Delete a comment by its ID.
 * Returns a confirmation message: { deleted: commentId }
 */

router.delete("/:commentId", ensureLoggedIn, async (req, res, next) => {
    try {
        const { commentId } = req.params;
        const username = res.locals.user.username;

        // Delete the comment
        await Comment.deleteComment(commentId, username);
        return res.json({ deleted: commentId });
    } catch (err) {
        if (err instanceof NotFoundError) {
            return res.status(404).json({ error: err.message });
        }
        if (err instanceof ForbiddenError) {
            return res.status(403).json({ error: err.message });
        }
        return next(err);
    }
});


module.exports = router;
