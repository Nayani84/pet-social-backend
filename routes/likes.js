"use strict";

const express = require("express");
const Like = require("../models/like");
const Notification = require("../models/notification");
const { getIO } = require("../socket");
const { ensureLoggedIn } = require("../middleware/auth");
const db = require("../db");
const router = express.Router();


/** POST /like
 * Add a like to a post.
 * Request body: { postId }
 * Response: { id, postId, ownerId }
 */

router.post("/", ensureLoggedIn, async (req, res, next) => {
  try {
    const { postId } = req.body;
    const likerId = res.locals.user.id; // Authenticated user's ID
    const username = res.locals.user.username;

    if (!likerId) {
      return res.status(400).json({ error: "User not authenticated" });
    }

    if (!postId) {
      return res.status(400).json({ error: "Post ID is required" });
    }

    // Check if the like already exists
    const exists = await Like.exists(postId, likerId);
    if (exists) {
      return res.status(400).json({ error: "Already liked" });
    }

    const like = await Like.add({ postId, ownerId: likerId });

    // Fetch the post to get the owner's ID
    const postResult = await db.query(
      `SELECT owner_id FROM posts WHERE id = $1`,
      [postId]
    );

    if (postResult.rows.length === 0) {
      return res.status(404).json({ error: "Post not found" });
    }

    const postOwnerId = postResult.rows[0].owner_id;

    // Create a notification if the liker is not the post owner
    if (postOwnerId !== likerId) {
      const notification = await Notification.create({
        userId: postOwnerId,
        type: 'like',
        content: `Your post has been liked by user ${username}`
      });
    }

    // Optionally, emit a real-time notification if using WebSocket
    const io = getIO();
    io.emit("receiveNotification", {
      type: "like",
      postId: postId,
      content: `Your post has been liked by user ${username}`,
    });

    return res.status(201).json({ like });
  } catch (err) {
    console.error("Error in POST /likes:", err);
    return next(err);
  }
});


/** DELETE /likes/:postId
 * Remove a like from a post.
 * Request params: postId
 * Response: { message: "Like removed" }
 */

router.delete("/:postId", ensureLoggedIn, async (req, res, next) => {
  try {
    const { postId } = req.params;
    const ownerId = res.locals.user.id;

    if (!postId) {
      return res.status(400).json({ error: "Post ID is required" });
    }

    const result = await Like.remove(postId, ownerId);
    return res.json(result);
  } catch (err) {
    return next(err);
  }
});


/** GET /likes/:postId
 * Check if a post is liked by the current user.
 * Request params: postId
 * Response: { isLiked: boolean }
 */

router.get("/:postId", ensureLoggedIn, async (req, res, next) => {
  try {
    const { postId } = req.params;
    const ownerId = res.locals.user.id; // Authenticated user's ID

    if (!postId) {
      return res.status(400).json({ error: "Post ID is required" });
    }

    // Check if the like exists
    const isLiked = await Like.exists(postId, ownerId);

    return res.json({ isLiked });
  } catch (err) {
    console.error("Error in GET /likes/:postId:", err); // Add error logging
    return next(err);
  }
});


/** GET /likes/count/:postId
* Get the likes count for a specific post.
* Request params: postId
* Response: { likesCount: number }
*/

router.get("/count/:postId", ensureLoggedIn, async (req, res, next) => {
  try {
    const { postId } = req.params;

    if (!postId) {
      return res.status(400).json({ error: "Post ID is required" });
    }

    //   const likesCount = parseInt(result.rows[0].likesCount, 10);
    const likesCount = await Like.getLikesCount(postId);
    await db.query("DELETE FROM likes WHERE post_id = $1", [postId]);

    return res.json({ likesCount });
  } catch (err) {
    console.error("Error fetching likes count:", err);
    return next(err);
  }
});


module.exports = router;