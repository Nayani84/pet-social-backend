"use strict";

const db = require("../db");
const { NotFoundError } = require("../expressError");
const { sqlForPartialUpdate } = require("../helpers/sql");


/** Related functions for posts. */

class Post {
    /** Create a post (from data), update db, return new post data.
     *
     * data should be { content, image_url, owner_id, created_at }
     *
     * Returns { id, content, image_url, owner_id, created_at }      
     **/

    static async create({ content, imageUrl, ownerId }) {

        const duplicateCheck = await db.query(
            `SELECT id 
             FROM posts
             WHERE content = $1 AND owner_id = $2`,
            [content, ownerId]
        );

        if (duplicateCheck.rows[0]) {
            throw new BadRequestError("Duplicate post");
        }

        const result = await db.query(
            `INSERT INTO posts (content, image_url, owner_id)
           VALUES ($1, $2, $3)
           RETURNING id, content, image_url AS imageUrl, owner_id AS "ownerId", created_at AS "createdAt"`,
            [
                content,
                imageUrl,
                ownerId,
            ]);
        let post = result.rows[0];
        if (!post) {
            throw new Error("Post creation failed, no rows returned");
        }

        return post;
    }


    /** Find all posts.
       *
       * * searchFilters (all optional):
       * - ownerId
       * - content
       * - startDate (filter posts created on or after this date)
       * - endDate (filter posts created on or before this date)
       *
       *  * Pagination:
     * - limit (number of rows to return)
     * - offset (number of rows to skip)
     *
       * Returns [{ id, content, image_url, owner_id, created_at }, ...]
       **/

    static async findAll({ ownerId, content, startDate, endDate, limit, offset } = {}) {
        let query = `SELECT id,
                        content,
                        image_url AS "imageUrl",
                        owner_id AS "ownerId",
                        created_at AS "createdAt"
                FROM posts`;

        let whereExpressions = [];
        let queryValues = [];

        // Add filters to the query
        if (ownerId) {
            queryValues.push(ownerId);
            whereExpressions.push(`owner_id = $${queryValues.length}`);
        }

        if (content) {
            queryValues.push(`%${content}%`);
            whereExpressions.push(`content ILIKE $${queryValues.length}`);
        }

        if (startDate) {
            queryValues.push(startDate);
            whereExpressions.push(`created_at >= $${queryValues.length}`);
        }

        if (endDate) {
            queryValues.push(endDate);
            whereExpressions.push(`created_at <= $${queryValues.length}`);
        }

        if (whereExpressions.length > 0) {
            query += " WHERE " + whereExpressions.join(" AND ");
        }

        // Add ordering
        query += " ORDER BY created_at";

        // Add pagination parameters
        if (limit !== undefined) {
            queryValues.push(limit);
            query += ` LIMIT $${queryValues.length}`;
        }

        if (offset !== undefined) {
            queryValues.push(offset);
            query += ` OFFSET $${queryValues.length}`;
        }

        // Execute query and return results
        const postsRes = await db.query(query, queryValues);
        return postsRes.rows;
    }


    /** Given a id, return data about post.
     *
     * Returns { content, image_url, owner_id, created_at }
     *
     * Throws NotFoundError if post not found.
     **/

    static async get(id) {
        const postRes = await db.query(
            `SELECT p.id,
                  p.content,
                  p.image_url AS "imageUrl",
                  p.owner_id AS "ownerId",
                  p.created_at AS "createdAt",
                  u.username AS "ownerUsername"
           FROM posts p
           JOIN users u
           ON p.owner_id = u.id
           WHERE p.id = $1`,
            [id],
        );

        const post = postRes.rows[0];

        if (!post) throw new NotFoundError(`No post found with id: ${id}`);

        return post;
    }


    /** Update post data with `data`.
     *
     * This is a "partial update" --- it's fine if data doesn't contain
     * all the fields; this only changes provided ones.
     *
     * Data can include:
     *   { content, image_url }
     *
     * Returns { id, content, imageUrl, createdAt }
     *
     * Throws NotFoundError if not found.
     *
     */

    static async update(id, data) {

        const { setCols, values } = sqlForPartialUpdate(
            data,
            {
                imageUrl: "image_url",
            });
        const idVarIdx = "$" + (values.length + 1);

        const querySql = `UPDATE posts
                      SET ${setCols} 
                      WHERE id = ${idVarIdx} 
                      RETURNING id,
                                content,
                                image_url AS "imageUrl",
                                created_at AS "createdAt"`;
        const result = await db.query(querySql, [...values, id]);
        const post = result.rows[0];

        if (!post) throw new NotFoundError(`No post: ${id}`);

        return post;
    }


    /** Delete given post from database; returns undefined. */

    static async remove(id) {
        let result = await db.query(
            `DELETE
           FROM posts
           WHERE id = $1
           RETURNING id`,
            [id],
        );
        const post = result.rows[0];

        if (!post) throw new NotFoundError(`No post: ${id}`);
    }

}


module.exports = Post;
