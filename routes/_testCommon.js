"use strict";

// Mocking the socket.js for all test files
jest.mock('../socket', () => {
    const emit = jest.fn();
    const on = jest.fn();
    const to = jest.fn(() => ({ emit }));
    const io = { emit, on, to, off: jest.fn() };

    return {
        init: jest.fn(),
        getIO: jest.fn(() => io)
    };
});


const jwt = require("jsonwebtoken");
const { SECRET_KEY } = require("../config");
const db = require("../db.js");
const User = require("../models/user.js");
const Pet = require("../models/pet.js");
const Post = require("../models/post.js");
const Comment = require("../models/comment.js");
const Like = require("../models/like.js");
const Event = require("../models/event.js");

const testPetIds = [];
const testPostIds = [];
const testCommentIds = [];
const testLikeIds = [];
const testEventIds = [];
let u1Token, u2Token, adminToken; // Declare tokens globally

async function resetAllData() {
    await db.query(`
        TRUNCATE TABLE users, pets, posts, comments, likes, events RESTART IDENTITY CASCADE;
    `);
}

async function commonBeforeAll() {
    try {
        await resetAllData();

        const [user1, user2, admin] = await Promise.all([
            User.register({
                username: "u1",
                name: "User One",
                email: "user1@example.com",
                password: "password1",
                is_admin: false,
            }),
            User.register({
                username: "u2",
                name: "User Two",
                email: "user2@example.com",
                password: "password2",
                is_admin: false,
            }),
            User.register({
                username: "admin",
                name: "Admin User",
                email: "admin@example.com",
                password: "adminpassword",
                is_admin: true,
            }),
        ]);

        // Generate tokens
        u1Token = jwt.sign({ id: user1.id, username: user1.username, isAdmin: false }, SECRET_KEY);
        u2Token = jwt.sign({ id: user2.id, username: user2.username, isAdmin: false }, SECRET_KEY);
        adminToken = jwt.sign({ id: admin.id, username: admin.username, isAdmin: true }, SECRET_KEY);

        // Create pets and posts in parallel
        const pets = await Promise.all([
            Pet.create({
                name: "Buddy",
                type: "Dog",
                breed: "Golden Retriever",
                age: 3,
                bio: "Friendly and energetic",
                photo_url: "http://example.com/buddy.jpg",
                ownerId: user1.id,
            }),
            Pet.create({
                name: "Mittens",
                type: "Cat",
                breed: "Siamese",
                age: 2,
                bio: "Playful and curious",
                photo_url: "http://example.com/mittens.jpg",
                ownerId: user2.id,
            }),
        ]);

        testPetIds.push(pets[0].id, pets[1].id);

        const posts = await Promise.all([
            Post.create({
                content: "Post 1 content",
                image_url: "http://example.com/post1.jpg",
                ownerId: user1.id,
            }),
            Post.create({
                content: "Post 2 content",
                image_url: "http://example.com/post2.jpg",
                ownerId: user2.id,
            }),
            Post.create({
                content: "Post 3 content",
                image_url: "http://example.com/post3.jpg",
                ownerId: user2.id,
            }),
        ]);

        testPostIds.push(...posts.map(post => post.id));

        // Create comments and likes in parallel
        const comments = await Promise.all([
            Comment.createComment("u2", testPostIds[0], "Great post!"),
            Comment.createComment("u2", testPostIds[1], "Thank you for sharing!"),
        ]);

        testCommentIds.push(...comments.map(comment => comment.id));

        const likes = await Promise.all([
            Like.add({
                postId: testPostIds[0],
                ownerId: user2.id,
            }),
            Like.add({
                postId: testPostIds[1],
                ownerId: user1.id,
            }),
        ]);

        testLikeIds.push(...likes.map(like => like.id));

        // Create events
        const events = await Promise.all([
            Event.create({
                title: "Dog Meetup",
                description: "A fun meetup for dog owners!",
                location: "Central Park",
                date: new Date(Date.now() + 86400000).toISOString().split("T")[0], // tomorrow
                startTime: "10:00 AM",
                endTime: "12:00 PM",
                createdBy: user1.id,
            }),
            Event.create({
                title: "Cat Lovers Gathering",
                description: "An event for cat enthusiasts.",
                location: "City Hall",
                date: new Date(Date.now() + 172800000).toISOString().split("T")[0], // day after tomorrow
                startTime: "10:00 AM",
                endTime: "12:00 PM",
                createdBy: user2.id,
            }),
        ]);

        testEventIds.push(...events.map(event => event.id));
    } catch (err) {
        console.error("Failed during commonBeforeAll setup:", err);
    }
}

async function commonBeforeEach() {
    await db.query("BEGIN");
}

async function commonAfterEach() {
    await db.query("ROLLBACK");
}

async function commonAfterAll() {
    await db.end();
}

// Getter functions for tokens
function getU1Token() {
    return u1Token;
}

function getU2Token() {
    return u2Token;
}

function getAdminToken() {
    return adminToken;
}

module.exports = {
    commonBeforeAll,
    commonBeforeEach,
    commonAfterEach,
    commonAfterAll,
    testPetIds,
    testPostIds,
    testCommentIds,
    testLikeIds,
    testEventIds,
    getU1Token,
    getU2Token,
    getAdminToken,
};
