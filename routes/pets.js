"use strict";

/** Routes for pets. */

const jsonschema = require("jsonschema");
const express = require("express");
const { BadRequestError } = require("../expressError");
const { buildImageUrl } = require("../helpers/imageUtils");
const { ensureLoggedIn, ensureAdmin, ensureCorrectUserOrAdminPet } = require("../middleware/auth");
const Pet = require("../models/pet");
const petNewSchema = require("../schemas/petNew.json");
const petUpdateSchema = require("../schemas/petUpdate.json");
const petSearchSchema = require("../schemas/petSearch.json");
const router = new express.Router();


/** POST / { pet } =>  { pet }
 *
 * pet should be { name, type, breed, age, bio, photo_url, owner_id }
 *
 * Returns { name, type, breed, age, bio, photo_url, owner_id  }
 *
 * Authorization required: admin or same user-as-:username
 */

router.post("/", ensureCorrectUserOrAdminPet, async function (req, res, next) {
  try {
    const validator = jsonschema.validate(req.body, petNewSchema);
    if (!validator.valid) {
      const errs = validator.errors.map(err => {
        if (err.property.includes('breed')) {
          return "The breed field cannot be empty. Please enter a valid breed.";
        }
        return "Invalid input.";
      });
      throw new BadRequestError(errs);
    }

    const pet = await Pet.create(req.body);
    return res.status(201).json({ pet });
  } catch (err) {
    // console.error("Error during pet creation:", err); // Debugging
    return next(err);
  }
});


/** GET /  =>
 *   { pets: [ { name, type, breed, age, bio, photo_url }, ...] }
 *
 * Can filter on provided search filters:
 * * - type
 * * - breed
 * * - name (will find case-insensitive, partial matches)
 *
 * Authorization required: none
 */

router.get("/", async function (req, res, next) {
  try {
    let { type, breed, name } = req.query;
    const validator = jsonschema.validate({ type, breed, name }, petSearchSchema);
    if (!validator.valid) {
      const errs = validator.errors.map(e => e.stack);
      throw new BadRequestError(errs);
    }
    const pets = await Pet.findAll({ type, breed, name });

    // Update image URLs for each pet
    pets.forEach(pet => {
      pet.photoUrl = buildImageUrl(pet.photoUrl);
    });

    return res.json({ pets });
  } catch (err) {
    return next(err);
  }
});


/** GET /types => { types: [ "type1", "type2", ... ] }
 *
 * Returns an array of distinct pet types.
 *
 * Authorization required: none
 */

router.get("/types", async function (req, res, next) {
  try {
    const types = await Pet.getDistinctTypes();
    return res.json({ types });
  } catch (err) {
    return next(err);
  }
});


/** GET /breeds => { breeds: [ "breed1", "breed2", ... ] }
 *
 * Returns an array of distinct pet breeds.
 *
 * Authorization required: none
 */

router.get("/breeds", async function (req, res, next) {
  try {
    const breeds = await Pet.getDistinctBreeds();
    return res.json({ breeds });
  } catch (err) {
    return next(err);
  }
});


/** GET /[id]  =>  { pet }
 *
 *  pet is { name, type, breed, age, bio, photo_url }
 * 
 * Returns { id, name, type, breed, age, bio, photoUrl, ownerId }
 *
 * Authorization required: none
 */

router.get("/:id", async function (req, res, next) {
  try {
    const pet = await Pet.get(req.params.id);
    return res.json({ pet });
  } catch (err) {
    return next(err);
  }
});


/** PATCH /[id] { fld1, fld2, ... } => { pet }
 *
 * Patches pet data.
 *
 * fields can be: { name, type, breed, age, bio, photo_url }
 *
 * Returns { id, name, type, breed, age, bio, photoUrl }
 *
 * Authorization required: admin or same user-as-:username
 */

router.patch("/:id", ensureCorrectUserOrAdminPet, async function (req, res, next) {
  try {
    const validator = jsonschema.validate(req.body, petUpdateSchema);
    if (!validator.valid) {
      const errs = validator.errors.map(e => e.stack);
      throw new BadRequestError(errs);
    }

    const pet = await Pet.update(req.params.id, req.body);
    return res.json({ pet });
  } catch (err) {
    return next(err);
  }
});


/** DELETE /[id]  =>  { deleted: id }
 *
 * Authorization required: admin or same user-as-:username
 */

router.delete("/:id", ensureCorrectUserOrAdminPet, async function (req, res, next) {
  try {
    await Pet.remove(req.params.id);
    return res.json({ deleted: req.params.id });
  } catch (err) {
    return next(err);
  }
});


module.exports = router;