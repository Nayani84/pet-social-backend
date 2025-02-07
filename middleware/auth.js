"use strict";

/** Convenience middleware to handle common auth cases in routes. */

const jwt = require("jsonwebtoken");
const { SECRET_KEY } = require("../config");
const { UnauthorizedError, ForbiddenError } = require("../expressError");
const { Pool } = require("pg");
const { getDatabaseUri } = require("../config");

// Initialize the database pool
const pool = new Pool({
  connectionString: getDatabaseUri(),
});

/** Middleware: Authenticate user.
 *
 * If a token was provided, verify it, and, if valid, store the token payload
 * on res.locals (this will include the username and isAdmin field.)
 *
 * It's not an error if no token was provided or if the token is not valid.
 */

function authenticateJWT(req, res, next) {
  try {
    const authHeader = req.headers && req.headers.authorization;

    if (authHeader) {
      const token = authHeader.replace(/^[Bb]earer /, "").trim();

      if (token) {
        const payload = jwt.verify(token, SECRET_KEY);

        res.locals.user = {
          id: payload.id,
          username: payload.username,
          isAdmin: payload.isAdmin,
        };
      }
    }
    return next();
  } catch (err) {
    const authHeader = req.headers && req.headers.authorization;
    if (authHeader) {
      console.error("JWT authentication failed:", err.message);
    }
    return next();
  }
}


/** Middleware to use when they must be logged in.
 *
 * If not, raises Unauthorized.
 */

function ensureLoggedIn(req, res, next) {
  try {
    // console.log("res.locals.user in ensureLoggedIn:", res.locals.user);
    // if (!res.locals.user || !res.locals.user.id) throw new UnauthorizedError();
    if (!res.locals.user) throw new UnauthorizedError("User must be logged in");
    return next();
  } catch (err) {
    return next(err);
  }
}


/** Middleware to use when they be logged in as an admin user.
 *
 *  If not, raises Unauthorized.
 */

function ensureAdmin(req, res, next) {
  try {
    if (!res.locals.user || !res.locals.user.isAdmin) {
      throw new ForbiddenError();
    }
    return next();
  } catch (err) {
    return next(err);
  }
}


/** Middleware to use when they must provide a valid token & be user matching
 *  username provided as route param.
 *
 *  If not, raises Unauthorized.
 */

async function ensureCorrectUserOrAdmin(req, res, next) {
  try {
    const user = res.locals.user;
    // console.log("*****************localuser", user);
    if (!user) throw new UnauthorizedError("No authentication provided.");

    const { username, id } = req.params;
    // console.log("Checking user access for params:", { username, id });

    if (username) {
      // Check for user routes
      if (!(user.isAdmin || user.username === username)) {
        throw new ForbiddenError("Unauthorized: Admin or matching user required.");
      }
    }
    return next();
  } catch (err) {
    return next(err);
  }
}


async function ensureCorrectUserOrAdminPost(req, res, next) {
  try {
    const user = res.locals.user;
    if (!user) throw new UnauthorizedError("No authentication provided.");

    const { username, id } = req.params;

    if (username) {
      // Check for user routes
      if (!(user.isAdmin || user.username === username)) {
        throw new ForbiddenError("Unauthorized: Admin or matching user required.");
      }
    } else if (id) {
      // Check for post routes
      const postResult = await pool.query(
        `SELECT u.username 
         FROM posts p
         JOIN users u ON p.owner_id = u.id
         WHERE p.id = $1`,
        [id]
      );

      const post = postResult.rows[0];
      if (!post) throw new NotFoundError("Post not found.");

      if (!(user.isAdmin || user.username === post.username)) {
        throw new ForbiddenError("Unauthorized: Admin or post owner required.");
      }
    }
    return next();
  } catch (err) {
    return next(err);
  }
}


async function ensureCorrectUserOrAdminPet(req, res, next) {
  try {
    const user = res.locals.user;
    if (!user) throw new UnauthorizedError("No authentication provided.");

    const { username, id } = req.params;

    if (username) {
      // Check for user routes
      if (!(user.isAdmin || user.username === username)) {
        throw new ForbiddenError("Unauthorized: Admin or matching user required.");
      }
    } else if (id) {
      // Check for pet routes
      const petResult = await pool.query(
        `SELECT u.username 
         FROM pets p
         JOIN users u ON p.owner_id = u.id
         WHERE p.id = $1`,
        [id]
      );

      const pet = petResult.rows[0];
      if (pet) {
        if (!(user.isAdmin || user.username === pet.username)) {
          throw new ForbiddenError("Unauthorized: Admin or pet owner required.");
        }
      }
    }
    return next();
  } catch (err) {
    return next(err);
  }
}


async function ensureCorrectUserOrAdminEvent(req, res, next) {
  try {
    const user = res.locals.user;
    if (!user) throw new UnauthorizedError("No authentication provided.");

    const { username, id } = req.params;

    if (username) {
      // Check for user routes
      if (!(user.isAdmin || user.username === username)) {
        throw new ForbiddenError("Unauthorized: Admin or matching user required.");
      }
    } else if (id) {
      // Check for event routes
      const eventResult = await pool.query(
        `SELECT u.username 
         FROM events e
         JOIN users u ON e.created_by = u.id
         WHERE e.id = $1`,
        [id]
      );

      const event = eventResult.rows[0];
      if (!event) throw new NotFoundError("Event not found.");

      if (!(user.isAdmin || user.username === event.username)) {
        throw new ForbiddenError("Unauthorized: Admin or event owner required.");
      }
    }
    return next();
  } catch (err) {
    return next(err);
  }
}


module.exports = {
  authenticateJWT,
  ensureLoggedIn,
  ensureAdmin,
  ensureCorrectUserOrAdmin,
  ensureCorrectUserOrAdminPost,
  ensureCorrectUserOrAdminPet,
  ensureCorrectUserOrAdminEvent,
};
