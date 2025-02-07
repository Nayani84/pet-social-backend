"use strict";

const db = require("../db");
const bcrypt = require("bcrypt");
const { sqlForPartialUpdate } = require("../helpers/sql");
const {
    NotFoundError,
    BadRequestError,
    UnauthorizedError,
} = require("../expressError");

const { BCRYPT_WORK_FACTOR } = require("../config.js");

/** Related functions for users. */

class User {
    /** authenticate user with username, password.
     *
     * Returns {id, username, name, email, profile_pic, is_admin }
     *
     * Throws UnauthorizedError is user not found or wrong password.
     **/

    static async authenticate(username, password) {
        // try to find the user first
        const result = await db.query(
            `SELECT id,
                  username,
                  password,
                  name,
                  email,
                  profile_pic AS "profilePic",
                  is_admin AS "isAdmin"
           FROM users
           WHERE username = $1`,
            [username],
        );

        const user = result.rows[0];

        if (user) {
            // compare hashed password to a new hash from password
            const isValid = await bcrypt.compare(password, user.password);
            if (isValid === true) {
                delete user.password;
                return user;
            }
        }

        throw new UnauthorizedError("Invalid username/password");
    }


    /** Register user with data.
     *
     * Returns { username, name, email, profilePic, isAdmin }
     *
     * Throws BadRequestError on duplicates.
     **/

    static async register(
        { username, password, name, email, profilePic, isAdmin = false }) {
        const duplicateCheck = await db.query(
            `SELECT username
             FROM users
             WHERE username = $1`,
             [username],
        );

        if (duplicateCheck.rows[0]) {
            throw new BadRequestError(`Duplicate username: ${username}`);
        }

        const hashedPassword = await bcrypt.hash(password, BCRYPT_WORK_FACTOR);

        const result = await db.query(
            `INSERT INTO users
           (username,
            password,
            name,
            email,
            profile_pic,
            is_admin)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING id, username, name, email, profile_pic AS "profilePic", is_admin AS "isAdmin"`,
            [
                username,
                hashedPassword,
                name,
                email,
                profilePic || null,
                isAdmin,
            ],
        );

        const user = result.rows[0];

        return user;
    }


    /** Find all users.
     *
     * Returns [{ username, name, email, profile_pic, is_admin }, ...]
     **/

    static async findAll() {
        const result = await db.query(
            `SELECT username,
                  name,
                  email,
                  profile_pic AS "profilePic",
                  is_admin AS "isAdmin"
           FROM users
           ORDER BY username`,
        );

        return result.rows;
    }


    /** Given a username, return data about user.
     *
     * Returns { username, name, email, profile_pic, is_admin, posts }
     *   where posts is { id, content, image_url, created_at }
     *
     * Throws NotFoundError if user not found.
     **/

    static async get(username) {
        // Fetch the user data
        const userRes = await db.query(
            `SELECT id,
		  username,
                  name,
                  email,
                  profile_pic AS "profilePic",
                  is_admin AS "isAdmin"
           FROM users
           WHERE username = $1`,
            [username],
        );

        const user = userRes.rows[0];

        if (!user) throw new NotFoundError(`No user: ${username}`);

        // Fetch the user's posts
        const userPostsRes = await db.query(
            `SELECT id,
                                                content,
                                                image_url AS "imageUrl",
                                                created_at AS "createdAt"
                                        FROM posts
                                        WHERE owner_id = (SELECT id FROM users WHERE username = $1)
                                        ORDER BY created_at`,
            [username]
        )

        user.posts = userPostsRes.rows;
        return user;
    }


    /** Find a user by email.
     *
     * Returns { id, username, name, email, profile_pic, is_admin }
     *
     * Throws NotFoundError if user not found.
     **/

    static async findByEmail(email) {
        const result = await db.query(
            `SELECT id,
                    username,
                    name,
                    email,
                    profile_pic AS "profilePic",
                    is_admin AS "isAdmin"
             FROM users
             WHERE email = $1`,
            [email]
        );

        const user = result.rows[0];

        if (!user) {
            throw new NotFoundError(`No user found with email: ${email}`);
        }

        return user;
    }


    /** Get posts for a user by their username.
     *
     * Returns [{ id, content, image_url, created_at }, ...]
     *
     * Throws NotFoundError if the user does not exist.
     */

    static async getPostsByUser(username) {
        // Check if the user exists
        const userCheck = await db.query(
            `SELECT id 
            FROM users 
            WHERE username = $1`,
            [username]
        );

        const user = userCheck.rows[0];
        if (!user) throw new NotFoundError(`No user: ${username}`);

        // Retrieve the user's posts
        const postsRes = await db.query(
            `SELECT id,
                content,
                image_url AS "imageUrl",
                created_at AS "createdAt"
            FROM posts
            WHERE owner_id = $1
            ORDER BY created_at DESC`,
            [user.id]
        );

        return postsRes.rows;
    }


    /** Get pets for a user by their username with optional filters.
    *
    * Returns [{ id, name, type, breed, age, bio, photo_url }, ...]
    *
    * Throws NotFoundError if the user does not exist.
    */

    static async getPetsByUser(username, filters = {}) {
        // Check if the user exists
        const userCheck = await db.query(
            `SELECT id 
             FROM users 
             WHERE username = $1`,
            [username]
        );

        const user = userCheck.rows[0];
        if (!user) throw new NotFoundError(`No user: ${username}`);

        // Base query for retrieving pets
        let query = `
                SELECT id,
                    name,
                    type,
                    breed,
                    age,
                    bio,
                    photo_url AS "photoUrl"
                FROM pets
                WHERE owner_id = $1`;

        let values = [user.id];

        // Add filters to the query if they exist
        if (filters.type) {
            query += ` AND type = $${values.length + 1}`;
            values.push(filters.type);
        }
        if (filters.breed) {
            query += ` AND breed = $${values.length + 1}`;
            values.push(filters.breed);
        }
        if (filters.name) {
            query += ` AND name ILIKE $${values.length + 1}`; // ILIKE for case-insensitive search
            values.push(`%${filters.name}%`);
        }

        // Execute the query with the added filters
        const petsRes = await db.query(query, values);

        return petsRes.rows;
    }


    /** Update user data with `data`.
     *
     * This is a "partial update" --- it's fine if data doesn't contain
     * all the fields; this only changes provided ones.
     *
     * Data can include:
     *   { name, password, email, profilePic }
     *
     * Returns { username, name, email, profilePic, isAdmin }
     *
     * Throws NotFoundError if not found.
     *
     * WARNING: this function can set a new password or make a user an admin.
     * Callers of this function must be certain they have validated inputs to this
     * or a serious security risks are opened.
     */

    static async update(username, data) {
        if (data.password) {
            data.password = await bcrypt.hash(data.password, BCRYPT_WORK_FACTOR);
        }

        const { setCols, values } = sqlForPartialUpdate(
            data,
            {
                profilePic: "profile_pic",
                isAdmin: "is_admin",
            });
        const usernameVarIdx = "$" + (values.length + 1);

        const querySql = `UPDATE users 
                      SET ${setCols} 
                      WHERE username = ${usernameVarIdx} 
                      RETURNING username,
                                name,
                                email,
                                profile_pic AS "profilePic",
                                is_admin AS "isAdmin"`;
        const result = await db.query(querySql, [...values, username]);
        const user = result.rows[0];

        if (!user) throw new NotFoundError(`No user: ${username}`);

        delete user.password;
        return user;
    }


    /** Delete given user from database; returns undefined. */

    static async remove(username) {
        let result = await db.query(
            `DELETE
             FROM users
             WHERE username = $1
             RETURNING username`,
            [username],
        );
        const user = result.rows[0];

        if (!user) throw new NotFoundError(`No user: ${username}`);
    }

}


module.exports = User;
