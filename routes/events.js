"use strict";

/** Routes for events. */

const jsonschema = require("jsonschema");
const express = require("express");
const router = new express.Router();
const { BadRequestError } = require("../expressError");
const { ensureLoggedIn, ensureAdmin, ensureCorrectUserOrAdminEvent } = require("../middleware/auth");
const Event = require("../models/event");
const eventNewSchema = require("../schemas/eventNew.json");
const eventUpdateSchema = require("../schemas/eventUpdate.json");
const eventSearchSchema = require("../schemas/eventSearch.json");

const { oauth2Client, google } = require('../helpers/googleClientService');


/** POST / { event } =>  { event }
 *
 * event should be { title, description, location, date, start_time, end_time, created_by }
 *
 * Returns { id, title, description, location, date, start_time, end_time, created_by }
 *
 * Authorization required: admin or same user-as-:username
 */

router.post("/", ensureCorrectUserOrAdminEvent, async function (req, res, next) {
    try {
        const validator = jsonschema.validate(req.body, eventNewSchema);
        if (!validator.valid) {
            const errs = validator.errors.map(e => e.stack);
            throw new BadRequestError(errs);
        }

        const event = await Event.create(req.body);
        return res.status(201).json({ event });

    } catch (err) {
        return next(err);
    }
});


/** GET /  =>
 *   { events: [ { id, title, description, location, date, start_time, end_time, created_by }, ...] }
 *
 * Can filter on provided search filters:
 * * - createdBy
 * * - title
 * * - location
 * * - startDate (filter posts created on or after this date)
 * * - endDate (filter posts created on or before this date)
 * 
 * Authorization required: none
 */

router.get("/", async function (req, res, next) {
    try {
        let { createdBy, title, startDate, endDate, latitude, longitude, option } = req.query;

        //  Ensure 'createdBy' is integer
        if (createdBy) {
            createdBy = parseInt(createdBy, 10);
            if (isNaN(createdBy)) {
                throw new BadRequestError("createdBy must be an integer");
            }
        }

        if (startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);

            if (start > end) {
                throw new BadRequestError("startDate must be earlier than endDate");
            }
        }

        const validator = jsonschema.validate({ createdBy, title, startDate, endDate, latitude, longitude }, eventSearchSchema);

        if (!validator.valid) {
            const errs = validator.errors.map(e => e.stack);
            throw new BadRequestError(errs);
        }

        console.log("backendOption", option);
        const events = await Event.findAll({ createdBy, title, startDate, endDate, latitude, longitude, option });
        return res.json({ events });
    } catch (err) {
        return next(err);
    }
});


/** GET /[id]  =>  { event }
 *
 *  event is { id, title, description, location, date, start_time, end_time, created_by }
 *
 * Authorization required: none
 */

router.get("/:id", async function (req, res, next) {
    try {
        const event = await Event.get(req.params.id);
        return res.json({ event });
    } catch (err) {
        return next(err);
    }
});


/** PATCH /[id] { fld1, fld2, ... } => { event }
 *
 * Patches event data.
 *
 * fields can be: { title, description, location, date, start_time, end_time }
 *
 * Returns { id, title, description, location, date, start_time, end_time, created_by }
 *
 * Authorization required: admin or same user-as-:username
 */

router.patch("/:id", ensureCorrectUserOrAdminEvent, async function (req, res, next) {
    try {
        const validator = jsonschema.validate(req.body, eventUpdateSchema);
        if (!validator.valid) {
            const errs = validator.errors.map(e => e.stack);
            throw new BadRequestError(errs);
        }

        const event = await Event.update(req.params.id, req.body);
        return res.json({ event });
    } catch (err) {
        return next(err);
    }
});


/** DELETE /[id]  =>  { deleted: id }
 *
 * Authorization required: admin or same user-as-:username
 */

router.delete("/:id", ensureCorrectUserOrAdminEvent, async function (req, res, next) {
    try {
        await Event.remove(req.params.id);
        return res.json({ deleted: req.params.id });
    } catch (err) {
        return next(err);
    }
});


module.exports = router;
