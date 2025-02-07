"use strict";
const db = require("../db");
const { NotFoundError, ForbiddenError } = require("../expressError");

class Comment {
    /** Get comments for a specific post.
     * 
     * Returns [{ id, postId, ownerId, content, createdAt }, ...]
     */

    static async getCommentsForPost(postId) {
        const result = await db.query(
            `SELECT c.id, c.content, c.created_at AS "createdAt", 
                    u.username, u.profile_pic AS "profilePic"
             FROM comments c
             JOIN users u ON c.owner_id = u.id
             WHERE c.post_id = $1
             ORDER BY c.created_at ASC`,
            [postId]
        );
        return result.rows;
    }

    /** Create a new comment for a post. */
    static async createComment(username, postId, content) {
        const userResult = await db.query(`SELECT id, username FROM users WHERE username = $1`, [username]);
        const user = userResult.rows[0];

        if (!user.id) throw new Error("Invalid user!!!");
        const result = await db.query(
            `INSERT INTO comments (post_id, owner_id, content)
             VALUES ($1, $2, $3)
             RETURNING id, post_id AS "postId", owner_id AS "ownerId", content, created_at AS "createdAt"`,
            [postId, user.id, content]
        );
        return result.rows[0];
    }

    /** Update a comment by its ID and owner ID. */
    static async updateComment(commentId, username, content) {

        // Ensure the comment belongs to the user
        const userIdResult = await db.query(
            `SELECT id FROM users WHERE username = $1`,
            [username]
        );

        if (userIdResult.rows.length === 0) {
            throw new NotFoundError("User not found.");
        }

        const ownerId = userIdResult.rows[0].id;

        const result = await db.query(
            `UPDATE comments
         SET content = $1
         WHERE id = $2 AND owner_id = $3
         RETURNING id, post_id AS "postId", owner_id AS "ownerId", content, created_at AS "createdAt"`,
            [content, commentId, ownerId]
        );

        const updatedComment = result.rows[0];
        if (!updatedComment) throw new ForbiddenError("Comment not found or unauthorized.");

        return updatedComment;
    }

    /** Delete a comment by its ID and owner ID. */
    static async deleteComment(commentId, username) {

        // Ensure the comment belongs to the user
        const userIdResult = await db.query(
            `SELECT id FROM users WHERE username = $1`,
            [username]
        );

        if (userIdResult.rows.length === 0) {
            throw new NotFoundError("User not found.");
        }

        const ownerId = userIdResult.rows[0].id;

        // Check if the comment exists and belongs to the user
        const commentResult = await db.query(
            `SELECT owner_id FROM comments WHERE id = $1`,
            [commentId]
        );

        if (commentResult.rows.length === 0) {
            throw new NotFoundError("Comment not found.");
        }

        if (commentResult.rows[0].owner_id !== ownerId) {
            throw new ForbiddenError("You are not authorized to delete this comment.");
        }

        // Delete the comment
        const result = await db.query(
            `DELETE FROM comments WHERE id = $1 RETURNING id`,
            [commentId]
        );

        if (!result.rows[0]) throw new NotFoundError("Comment not found or unauthorized.");
    }


}
module.exports = Comment;
