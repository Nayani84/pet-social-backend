"use strict";

/** Routes for users. */

const jsonschema = require("jsonschema");
const express = require("express");
const { buildImageUrl } = require("../helpers/imageUtils");
const { ensureCorrectUserOrAdmin, ensureAdmin } = require("../middleware/auth");
const { BadRequestError } = require("../expressError");
const User = require("../models/user");
const { createToken } = require("../helpers/tokens");
const userNewSchema = require("../schemas/userNew.json");
const userUpdateSchema = require("../schemas/userUpdate.json");
const router = express.Router();


/** POST / { user }  => { user, token }
 *
 * Adds a new user. This is not the registration endpoint --- instead, this is
 * only for admin users to add new users. The new user being added can be an
 * admin.
 *
 * This returns the newly created user and an authentication token for them:
 *  {user: { username, name, email, profile_pic, isAdmin }, token }
 *
 * Authorization required: admin
 **/

router.post("/", ensureAdmin, async function (req, res, next) {
  try {
    const validator = jsonschema.validate(req.body, userNewSchema);
    if (!validator.valid) {
      const errs = validator.errors.map(e => e.stack);
      throw new BadRequestError(errs);
    }

    const user = await User.register(req.body);
    const token = createToken(user);
    return res.status(201).json({ user, token });
  } catch (err) {
    return next(err);
  }
});


/** GET / => { users: [ {username, name, email, profile_pic }, ... ] }
 *
 * Returns list of all users.
 *
 * Authorization required: admin
 **/

router.get("/", ensureAdmin, async function (req, res, next) {
  try {
    const users = await User.findAll();
    return res.json({ users });
  } catch (err) {
    return next(err);
  }
});


/** GET /[username] => { user }
 *
 * Returns { username, name, email, isAdmin, posts }
 *   where posts is { id, content, image_url, created_at }
 *
 * Authorization required: admin or same user-as-:username
 **/

router.get("/:username", ensureCorrectUserOrAdmin, async function (req, res, next) {
  try {
    const user = await User.get(req.params.username);

    // // Ensure the profile picture URL is updated
    // user.profilePic = buildImageUrl(user.profilePic);

    return res.json({ user });
  } catch (err) {
    return next(err);
  }
});


/** GET /:username/posts => { posts }
 *
 * Returns [{ id, content, imageUrl, createdAt }, ...]
 *
 * Authorization required: admin or same user-as-:username
 **/

router.get("/:username/posts", ensureCorrectUserOrAdmin, async function (req, res, next) {
  try {
    const posts = await User.getPostsByUser(req.params.username);

    // Update image URLs for each pet
    posts.forEach(post => {
      post.imageUrl = buildImageUrl(post.imageUrl);
    });

    return res.json({ posts });
  } catch (err) {
    return next(err);
  }
});


/** GET /:username/pets => { pets }
 *
 * Returns [{ id, name, type, breed, age, bio, photoUrl }, ...]
 *
 * Authorization required: admin or same user-as-:username
 **/

router.get("/:username/pets", ensureCorrectUserOrAdmin, async function (req, res, next) {
  try {
    const { type, breed, name } = req.query; // Extract query parameters
    const filters = {
      type,
      breed,
      name
    };

    // Remove undefined or empty filter values
    const cleanedFilters = Object.fromEntries(
      Object.entries(filters).filter(([_, value]) => value && value.trim() !== "")
    );

    const pets = await User.getPetsByUser(req.params.username, cleanedFilters);

    // Update image URLs for each pet
    pets.forEach(pet => {
      pet.photoUrl = buildImageUrl(pet.photoUrl);
    });

    return res.json({ pets });
  } catch (err) {
    return next(err);
  }
});


/** PATCH /[username] { user } => { user }
 *
 * Data can include:
 *   { name, password, email, profile_pic }
 *
 * Returns { username, name, email, profilePic, isAdmin }
 *
 * Authorization required: admin or same-user-as-:username
 **/

router.patch("/:username", ensureCorrectUserOrAdmin, async function (req, res, next) {
  try {
    const validator = jsonschema.validate(req.body, userUpdateSchema);
    if (!validator.valid) {
      const errs = validator.errors.map(e => e.stack);
      throw new BadRequestError(errs);
    }

    const user = await User.update(req.params.username, req.body);
    return res.json({ user });
  } catch (err) {
    return next(err);
  }
});


/** DELETE /[username]  =>  { deleted: username }
 *
 * Authorization required: admin or same-user-as-:username
 **/

router.delete("/:username", ensureCorrectUserOrAdmin, async function (req, res, next) {
  try {
    await User.remove(req.params.username);
    return res.json({ deleted: req.params.username });
  } catch (err) {
    return next(err);
  }
});


module.exports = router;