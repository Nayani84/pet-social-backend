"use strict";

/** Express app for pet-social. */
const session = require('express-session');
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const { NotFoundError } = require("./expressError");
const { authenticateJWT } = require("./middleware/auth");

// Import routes
const authRoutes = require("./routes/auth");
const petsRoutes = require("./routes/pets");
const usersRoutes = require("./routes/users");
const eventsRoutes = require("./routes/events");
const postsRoutes = require("./routes/posts");
const likesRoutes = require("./routes/likes");
const commentsRoutes = require("./routes/comments");
const notificationsRoutes = require("./routes/notifications");

const app = express();
app.use(express.static('public'));

app.use(cors({
  origin: 'https://pet-social-frontend.onrender.com', // Allows all domains
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  credentials: true
}));

// app.use(cors({
//   origin: ['http://127.0.0.1:5174','http://127.0.0.1:5173','http://127.0.0.1:3000', 'https://yourdomain.com'],
//   methods: ['GET', 'POST', 'PUT', 'DELETE'],
//   credentials: true
// }));
// Security middleware
app.use(helmet()); // Sets various HTTP headers for security

app.use(express.json());
app.use(morgan("tiny"));

// Rate limiting
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 15 minutes
  max: 500, // limit each IP to 100 requests per windowMs
  message: 'Too many requests, please try again later.'
});
app.use(limiter);
app.use(authenticateJWT);

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'pets',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24
  }
}));

// Setup routes
app.use("/auth", authRoutes);
app.use("/pets", petsRoutes);
app.use("/users", usersRoutes);
app.use("/events", eventsRoutes);
app.use("/posts", postsRoutes);
app.use("/likes", likesRoutes);
app.use("/comments", commentsRoutes);
app.use("/notifications", notificationsRoutes);

/** Handle 404 errors -- this matches everything */
app.use(function (req, res, next) {
  return next(new NotFoundError());
});

/** Generic error handler; anything unhandled goes here. */
app.use(function (err, req, res, next) {
  if (process.env.NODE_ENV !== "test") console.error(err.stack);
  const status = err.status || 500;
  const message = err.message;

  return res.status(status).json({
    error: { message, status },
  });
});

module.exports = app;
