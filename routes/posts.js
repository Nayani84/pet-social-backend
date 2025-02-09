"use strict";

/** Routes for posts. */

const jsonschema = require("jsonschema");
const express = require("express");
const { buildImageUrl } = require("../helpers/imageUtils");
const { BadRequestError } = require("../expressError");
const { ensureLoggedIn, ensureAdmin, ensureCorrectUserOrAdminPost, authenticateJWT } = require("../middleware/auth");
const Post = require("../models/post");
const postNewSchema = require("../schemas/postNew.json");
const postUpdateSchema = require("../schemas/postUpdate.json");
const postSearchSchema = require("../schemas/postSearch.json");
const router = new express.Router();


/** POST / { post } =>  { post }
 *
 * post should be { content, imageUrl, ownerId, createdAt }
 *
 * Returns { id, content, imageUrl, ownerId, createdAt }
 *
 * Authorization required: admin or same user-as-:username
 */

router.post("/", ensureCorrectUserOrAdminPost, async function (req, res, next) {
    try {
        const validator = jsonschema.validate(req.body, postNewSchema);
        if (!validator.valid) {
            const errs = validator.errors.map(e => e.stack);
            throw new BadRequestError(errs);
        }

        const post = await Post.create(req.body);
        return res.status(201).json({ post });
    } catch (err) {
        return next(err);
    }
});


/** GET /  =>
 *   { posts: [ { id, content, imageUrl, ownerId, createdAt }, ...] }
 *
 * Can filter on provided search filters:
 * * - ownerId
 * * - content
 * * - startDate (filter posts created on or after this date)
 * * - endDate (filter posts created on or before this date)
 *
 *  * Pagination:
     * - limit (number of rows to return)
     * - offset (number of rows to skip)
 * Authorization required: none
 */

router.get("/", async function (req, res, next) {
    try {
        let { ownerId, content, startDate, endDate, limit, offset } = req.query;

        // Normalize and validate inputs
        const filters = {
            ownerId: ownerId ? parseInt(ownerId, 10) : undefined,
            content: content || undefined,
            startDate: startDate || undefined,
            endDate: endDate || undefined,
            limit: limit ? parseInt(limit, 10) : 10,
            offset: offset ? parseInt(offset, 10) : 0
        };

        if (filters.ownerId && isNaN(filters.ownerId)) {
            throw new BadRequestError("ownerId must be an integer");
        }

        if ((filters.startDate && isNaN(Date.parse(filters.startDate))) ||
            (filters.endDate && isNaN(Date.parse(filters.endDate)))) {
            throw new BadRequestError("Invalid date format");
        }
        if (filters.startDate && filters.endDate) {
            const start = new Date(filters.startDate);
            const end = new Date(filters.endDate);
            if (start > end) throw new BadRequestError("startDate must be earlier than endDate");
        }

        const validator = jsonschema.validate(filters, postSearchSchema);
        if (!validator.valid) {
            const errs = validator.errors.map(e => e.stack);
            throw new BadRequestError(errs);
        }

        const posts = await Post.findAll(filters);

        // Update image URLs for each pet
        posts.forEach(post => {
            post.imageUrl = buildImageUrl(post.imageUrl);
        });

        return res.json({ posts });
    } catch (err) {
        return next(err);
    }
});


/** GET /[id]  =>  { post }
 *
 *  post is { id, content, imageUrl, ownerId, createdAt }
 *
 * Authorization required: none
 */

router.get("/:id", async function (req, res, next) {
    try {
        const post = await Post.get(req.params.id);
        return res.json({ post });
    } catch (err) {
        return next(err);
    }
});


/** PATCH /[id] { fld1, fld2, ... } => { post }
 *
 * Patches post data.
 *
 * fields can be: { content, imageUrl }
 *
 * Returns { id, content, imageUrl, createdAt }
 *
 * Authorization required: admin or same user-as-:username
 */

router.patch("/:id", ensureCorrectUserOrAdminPost, async function (req, res, next) {
    try {
        const validator = jsonschema.validate(req.body, postUpdateSchema);
        if (!validator.valid) {
            const errs = validator.errors.map(e => e.stack);
            throw new BadRequestError(errs);
        }

        const post = await Post.update(req.params.id, req.body);
        return res.json({ post });
    } catch (err) {
        return next(err);
    }
});


/** DELETE /[id]  =>  { deleted: id }
 *
 * Authorization required: admin or same user-as-:username
 */

router.delete("/:id", ensureCorrectUserOrAdminPost, async function (req, res, next) {
    try {
        await Post.remove(req.params.id);
        return res.json({ deleted: req.params.id });
    } catch (err) {
        return next(err);
    }
});


module.exports = router;