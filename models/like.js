"use strict";
const db = require("../db");
const { NotFoundError } = require("../expressError");

class Like {
    /** Add a like to a post.
     * 
     * data should include { postId, ownerId }
     * Returns { id, postId, ownerId }
     */

    static async add({ postId, ownerId }) {
        if (!postId || !ownerId) {
            console.error("Missing postId or ownerId:", { postId, ownerId });
            throw new Error("Invalid postId or ownerId");
        }

        const duplicateCheck = await db.query(
            `SELECT id
             FROM likes
             WHERE post_id = $1 AND owner_id = $2`,
            [postId, ownerId]
        );

        if (duplicateCheck.rows[0]) {
            throw new Error("Duplicate like.");
        }

        const result = await db.query(
            `INSERT INTO likes (post_id, owner_id)
             VALUES ($1, $2)
             RETURNING id, post_id AS "postId", owner_id AS "ownerId"`,
            [postId, ownerId]
        );
        return result.rows[0];
    }


    /** Check if a like exists for a given post and owner.
     * 
     * Returns true if like exists, false otherwise.
     */

    static async exists(postId, ownerId) {
        const result = await db.query(
            `SELECT id
             FROM likes
             WHERE post_id = $1 AND owner_id = $2`,
            [postId, ownerId]
        );

        return result.rows.length > 0;
    }


    /** Remove a like from a post by a specific owner.
    * Throws NotFoundError if the like does not exist.
    */

    static async remove(postId, ownerId) {
        const result = await db.query(
            `DELETE FROM likes
             WHERE post_id = $1 AND owner_id = $2
             RETURNING id`,
            [postId, ownerId]
        );

        if (result.rows.length === 0) {
            throw new NotFoundError("Like not found.");
        }

        return { message: "Like removed" };
    }


    /**  Get the likes count for a specific post.
     * Request params: postId
     * Response: { likesCount: number }
     */

    static async getLikesCount(postId) {

        // Check if the post exists
        const postCheck = await db.query(
            `SELECT id FROM posts WHERE id = $1`,
            [postId]
        );

        if (postCheck.rows.length === 0) {
            throw new NotFoundError(`Post with ID ${postId} not found.`);
        }

        const result = await db.query(
            `SELECT COUNT(*) AS "likesCount"
         FROM likes
         WHERE post_id = $1`,
            [postId]
        );

        return parseInt(result.rows[0].likesCount, 10 || 0);
    }

}
module.exports = Like;
