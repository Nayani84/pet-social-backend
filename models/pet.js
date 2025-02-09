"use strict";

const { serializeUser } = require("passport");
const db = require("../db");
const { BadRequestError, NotFoundError } = require("../expressError");
const { sqlForPartialUpdate } = require("../helpers/sql");
const { buildImageUrl } = require("../helpers/imageUtils");

/** Related functions for pets. */

class Pet {
    /** Create a pet (from data), update db, return new pet data.
       *
       * data should be { name, type, breed, age, bio, photo_url, owner_id }
       *
       * Returns { id, name, type, breed, age, bio, photo_url, owner_id }
       *
       * Throws BadRequestError if pet already in database.
       * */

    static async create({ name, type, breed, age, bio, photoUrl, ownerId }) {

        const duplicateCheck = await db.query(
            `SELECT id
           FROM pets
           WHERE name = $1 AND owner_id = $2`,
            [name, ownerId]);

        if (duplicateCheck.rows[0])
            throw new BadRequestError(`Duplicate pet: ${name} for owner: ${ownerId}`);

        const result = await db.query(
            `INSERT INTO pets
                (name, type, breed, age, bio, photo_url, owner_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING id, name, type, breed, age, bio, photo_url AS "photoUrl", owner_id AS "ownerId"`,
            [
                name,
                type,
                breed,
                age,
                bio,
                photoUrl || null,
                ownerId,
            ],
        );

        const pet = result.rows[0];

        return pet;
    }


    /** Find all pets (optional filter on searchFilters).
     *
     * searchFilters (all optional):
     * - type
     * - breed
     * - name (will find case-insensitive, partial matches)
     *
     * Returns [{ id, name, type, breed, age, bio, photo_url }, ...]
     * */

    static async findAll(searchFilters = {}) {
        let query = `SELECT id,
                        name,
                        type,
                        breed,
                        age,
                        bio,
                        photo_url AS "photoUrl",
                        owner_id AS "ownerId"
                 FROM pets`;
        let whereExpressions = [];
        let queryValues = [];

        const { type, breed, name } = searchFilters;
        let title;
        if (typeof name !== 'undefined' && name !== null && typeof name.title !== 'undefined') {
            title = name.title;
        }
        // For each possible search term, add to whereExpressions and queryValues so
        // we can generate the right SQL


        if (type) {
            queryValues.push(`%${type}%`);
            whereExpressions.push(`type ILIKE $${queryValues.length}`);
        }

        if (breed) {
            queryValues.push(`%${breed}%`);
            whereExpressions.push(`breed ILIKE $${queryValues.length}`);
        }

        if (title) {
            queryValues.push(`%${title}%`);
            whereExpressions.push(`name ILIKE $${queryValues.length}`);
        }

        if (whereExpressions.length > 0) {
            query += " WHERE " + whereExpressions.join(" AND ");
        }

        // Finalize query and return results

        query += " ORDER BY name";
        const petsRes = await db.query(query, queryValues);
        return petsRes.rows;
    }


    /** Given a pet id, return data about pet.
       *
       * Returns { id, name, type, breed, age, bio, photo_url, owner_id}
       *
       * Throws NotFoundError if not found.
       **/

    static async get(id) {
        if (isNaN(parseInt(id))) {
            throw new BadRequestError(`Invalid ID: ${id}`);
        }

        const petRes = await db.query(
            `SELECT id,
                  name,
                  type,
                  breed,
                  age,
                  bio,
                  photo_url AS "photoUrl",
                  owner_id AS "ownerId"
           FROM pets
           WHERE id = $1`,
            [id]);

        const pet = petRes.rows[0];

        if (!pet) throw new NotFoundError(`No pet found with id: ${id}`);

        // Update the photo URL 
        pet.photoUrl = buildImageUrl(pet.photoUrl);

        return pet;
    }


    /** Update pet data with `data`.
       *
       * This is a "partial update" --- it's fine if data doesn't contain all the
       * fields; this only changes provided ones.
       *
       * Data can include: {name, type, breed, age, bio, photo_url}
       *
       * Returns {id, name, type, breed, age, bio, photo_url}
       *
       * Throws NotFoundError if not found.
       */

    static async update(id, data) {
        const { setCols, values } = sqlForPartialUpdate(
            data,
            {
                photoUrl: "photo_url",
            });
        const idVarIdx = "$" + (values.length + 1);

        const querySql = `UPDATE pets 
                      SET ${setCols} 
                      WHERE id = ${idVarIdx} 
                      RETURNING id, 
                                name, 
                                type,
                                breed,
                                age,
                                bio, 
                                photo_url AS "photoUrl",
                                owner_id AS "ownerId"`;

        const result = await db.query(querySql, [...values, id]);
        const pet = result.rows[0];

        if (!pet) throw new NotFoundError(`No pet found with id: ${id}`);

        return pet;
    }


    /** Delete given pet from database; returns undefined.
      *
      * Throws NotFoundError if pet not found.
      **/

    static async remove(id) {
        if (isNaN(parseInt(id))) {
            throw new BadRequestError(`Invalid ID: ${id}`);
        }

        const result = await db.query(
            `DELETE
           FROM pets
           WHERE id = $1
           RETURNING id`,
            [id]);
        const pet = result.rows[0];

        if (!pet) throw new NotFoundError(`No pet found with id: ${id}`);
    }


    /** Get distinct pet types.
     *
     * Returns [ "type1", "type2", ... ]
     */

    static async getDistinctTypes() {
        const result = await db.query(
            `SELECT DISTINCT type
         FROM pets
         ORDER BY type`
        );
        return result.rows.map(row => row.type);
    }


    /** Get distinct pet breeds.
    *
    * Returns [ "breed1", "breed2", ... ]
    */

    static async getDistinctBreeds() {
        const result = await db.query(
            `SELECT DISTINCT breed
             FROM pets
             ORDER BY breed`
        );
        return result.rows.map(row => row.breed);
    }


}



module.exports = Pet;