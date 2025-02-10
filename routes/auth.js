"use strict";

/** Routes for authentication. */

const jsonschema = require("jsonschema");

const User = require("../models/user");
const Event = require("../models/event");
const express = require("express");
const router = new express.Router();
const { createToken } = require("../helpers/tokens");
const userAuthSchema = require("../schemas/userAuth.json");
const userRegisterSchema = require("../schemas/userRegister.json");
const { BadRequestError } = require("../expressError");
const { oauth2Client, getAuthUrl, getTokensFromCode, google } = require('../helpers/googleClientService');


/** POST /auth/token:  { username, password } => { token }
 *
 * Returns JWT token which can be used to authenticate further requests.
 *
 * Authorization required: none
 */

router.post("/token", async function (req, res, next) {
  try {
    const validator = jsonschema.validate(req.body, userAuthSchema);
    if (!validator.valid) {
      const errs = validator.errors.map(e => e.stack);
      throw new BadRequestError(errs);
    }

    const { username, password } = req.body;
    const user = await User.authenticate(username, password);
    const token = createToken(user);
    return res.json({ token });
  } catch (err) {
    return next(err);
  }
});


/** POST /auth/register:   { user } => { token }
 *
 * user must include { username, password, name, email, profilePic }
 *
 * Returns JWT token which can be used to authenticate further requests.
 *
 * Authorization required: none
 */

router.post("/register", async function (req, res, next) {
  try {
    const validator = jsonschema.validate(req.body, userRegisterSchema);
    if (!validator.valid) {
      const customErrors = validator.errors.map(err => {
        if (err.property.includes('email')) {
          return "Please enter a valid email address.";
        }
        if (err.property.includes('password')) {
          return "Password must be at least 6 characters long.";
        }
        return "Invalid input.";
      });
      throw new BadRequestError(customErrors);
    }

    const newUser = await User.register({ ...req.body, isAdmin: false });
    const token = createToken(newUser);
    return res.status(201).json({ token });
  } catch (err) {
    if (err.message.includes("users_email_key")) {
      err.message = "this email address is alreay taken, Please enter a different one.";
    }
    return next(err);
  }
});


/** GET /auth/login */

router.get('/login', (req, res) => {
  const eventId = req.query.eveid;
  req.session.googleEventId = eventId;
  const url = getAuthUrl();
  res.redirect(url);
});


/** GET /auth/google/callback */

router.get('/google/callback', async (req, res) => {
  const { code } = req.query;
  try {
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.access_token) {
      throw new Error("No access token received from Google.");
    }

    oauth2Client.setCredentials(tokens);

    // Save tokens in a secure place (e.g., session, database)
    req.session.tokens = tokens;

    const gcalEvent = await Event.get(req.session.googleEventId);

    if (gcalEvent) {
      const eStartDt = new Date(gcalEvent.date + " " + gcalEvent.startTime);
      const eEndDt = new Date(gcalEvent.date + " " + gcalEvent.endTime);
      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
      const event = {
        summary: gcalEvent.title,
        location: gcalEvent.location,
        description: gcalEvent.description,
        start: {
          dateTime: eStartDt.toISOString(),
          timeZone: 'America/Los_Angeles',
        },
        end: {
          dateTime: eEndDt.toISOString(),
          timeZone: 'America/Los_Angeles',
        },
      };

      calendar.events.insert({
        calendarId: 'primary',
        resource: event,
      }, (err, event) => {
        if (err) {
          return res.status(500).send(err);
        }
        // Redirect back to frontend home page
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        res.redirect(`${frontendUrl}`);         
      });
    }

  } catch (error) {
    console.error("Error during token exchange", error);
    res.status(500).send("Failed to exchange the code for tokens");
  }
});


module.exports = router;

