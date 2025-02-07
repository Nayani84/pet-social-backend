"use strict";

const db = require("../db");
const { NotFoundError } = require("../expressError");
const { sqlForPartialUpdate } = require("../helpers/sql");
const { convertTo24HourFormat } = require("../helpers/timeUtils");
const Notification = require("./notification");
const { getIO } = require("../socket");

/** Related functions for events. */

class Event {

    /** Create a event (from data), update db, return new event data.
     *
     * data should be { title, description, location, date, start_time, end_time, created_by }
     *
     * Returns { id, title, description, location, date, start_time, end_time, created_by }
     **/

    static async create({ title, description, location, date, startTime, endTime, createdBy, lat, lng }) {

        const result = await db.query(
            `INSERT INTO events (title, description, location, date, start_time, end_time, created_by, lat, lng)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           RETURNING id, title, description, location, TO_CHAR(date, 'YYYY-MM-DD') AS date, start_time AS "startTime", end_time AS "endTime", created_by AS "createdBy", lat,lng`,
            [
                title,
                description,
                location,
                date,
                convertTo24HourFormat(startTime),
                convertTo24HourFormat(endTime),
                createdBy,
                lat,
                lng
            ]);
        let event = result.rows[0];

        // Fetch all users from the database
        const usersToNotify = await db.query(`SELECT id FROM users`);

        // Loop over each user and create a notification
        usersToNotify.rows.forEach(async user => {
            await Notification.create({
                userId: user.id,
                type: 'event',
                content: `New Pet Event: ${title}`
            });

            // Emit notification via WebSocket
            const io = getIO();
            io.to(user.id.toString()).emit("new_notification", {
                type: 'event',
                content: `New Pet Event: ${title}`,
                eventDetails: event
            });
        });

        return event;
    }


    /** Find all events.
       *
       * * searchFilters (all optional):
       * - createdBy
       * - title
       * - startDate (filter events on or after this date)
       * - endDate (filter events on or before this date)
       *
       * Returns [{ id, title, description, location, date, start_time, end_time, created_by }, ...]
       **/

    static async findAll({ title, createdBy, startDate, endDate, option, latitude, longitude, radius = 50 } = {}) {
        let query = `SELECT id,
                        title,
                        description,
                        location,
                        TO_CHAR(date, 'YYYY-MM-DD') AS date,
                        start_time AS "startTime",
                        end_time AS "endTime",
                        created_by AS "createdBy",
                        lat,
                        lng
                FROM events`;

        let whereExpressions = [];
        let queryValues = [];

        // Add filters to the query
        if (option === "1") {
            queryValues.push(`%${title}%`);
            whereExpressions.push(`title ILIKE $${queryValues.length}`);
        } else if (option === "2") {
            queryValues.push(latitude, longitude, radius * 1000);
            whereExpressions.push(`earth_distance(ll_to_earth($${queryValues.length - 2}, $${queryValues.length - 1}), ll_to_earth(lat, lng)) <= $${queryValues.length}`);

        }

        if (createdBy) {
            queryValues.push(createdBy);
            whereExpressions.push(`created_by = $${queryValues.length}`);
        }

        if (startDate) {
            queryValues.push(startDate);
            whereExpressions.push(`date >= $${queryValues.length}`);
        }

        if (endDate) {
            queryValues.push(endDate);
            whereExpressions.push(`date <= $${queryValues.length}`);
        }


        if (whereExpressions.length > 0) {
            query += " WHERE " + whereExpressions.join(" AND ");
        }

        // Add ordering
        query += " ORDER BY date";


        const eventsRes = await db.query(query, queryValues);

        return eventsRes.rows.map((event) => ({
            ...event,
            startTime: event.startTime ? event.startTime.substring(0, 5) : null,
            endTime: event.endTime ? event.endTime.substring(0, 5) : null,
        }));
    }


    /** Given a id, return data about event.
     *
     * Returns { title, description, location, date, start_time, end_time, created_by }
     *
     * Throws NotFoundError if event not found.
     **/

    static async get(id) {
        const eventRes = await db.query(
            `SELECT id,
                  title,
                  description,
                  location,
                  TO_CHAR(date, 'YYYY-MM-DD') AS date,
                  TO_CHAR(start_time, 'HH24:MI') AS "startTime", 
                  TO_CHAR(end_time, 'HH24:MI') AS "endTime",
                  created_by AS "createdBy"
           FROM events
           WHERE id = $1`,
            [id],
        );

        const event = eventRes.rows[0];

        if (!event) throw new NotFoundError(`No event found with id: ${id}`);

        return event;
    }


    /** Update event data with `data`.
     *
     * This is a "partial update" --- it's fine if data doesn't contain
     * all the fields; this only changes provided ones.
     *
     * Data can include:
     *   { title, description, location, date, start_time, end_time }
     *
     * Returns { id, title, description, location, date, start_time, end_time, created_by }
     *
     * Throws NotFoundError if not found.
     *
     */

    static async update(id, data) {
        if (Object.keys(data).length === 0) {
            throw new BadRequestError("No data provided for update");
        }

        if (data.startTime) data.startTime = convertTo24HourFormat(data.startTime);
        if (data.endTime) data.endTime = convertTo24HourFormat(data.endTime);
        const { setCols, values } = sqlForPartialUpdate(
            data,
            {
                title: "title",
                description: "description",
                location: "location",
                date: "date",
                startTime: "start_time",
                endTime: "end_time"
            });

        const idVarIdx = "$" + (values.length + 1);

        const querySql = `UPDATE events
                      SET ${setCols} 
                      WHERE id = ${idVarIdx} 
                      RETURNING id,
                                title,
                                description,
                                location,
                                TO_CHAR(date, 'YYYY-MM-DD') AS date,
                                start_time AS "startTime", 
                                end_time AS "endTime",
                                created_by AS "createdBy"`;

        const result = await db.query(querySql, [...values, id]);
        const event = result.rows[0];

        if (!event) throw new NotFoundError(`No event found with id: ${id}`);

        return event;
    }


    /** Delete given event from database; returns undefined. */

    static async remove(id) {
        let result = await db.query(
            `DELETE
           FROM events
           WHERE id = $1
           RETURNING id`,
            [id],
        );
        const event = result.rows[0];

        if (!event) throw new NotFoundError(`No event found with id: ${id}`);
    }

}


module.exports = Event;
