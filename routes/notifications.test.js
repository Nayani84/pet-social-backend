"use strict";

// --- MOCK SOCKET  ---
jest.mock('../socket', () => {
    const emit = jest.fn();
    const on = jest.fn();
    const to = jest.fn(() => ({ emit }));
    const io = { emit, on, to, off: jest.fn() };

    return {
        init: jest.fn(() => io),
        getIO: jest.fn(() => io)
    };
});

const request = require("supertest");
const jwt = require("jsonwebtoken");
const { SECRET_KEY } = require("../config");
const db = require("../db.js");
const app = require("../app");
const Notification = require("../models/notification");

const {
    commonBeforeAll,
    commonBeforeEach,
    commonAfterEach,
    commonAfterAll,
    getU1Token,
    getU2Token,
} = require("./_testCommon");

let u1Token, u2Token;

beforeAll(async () => {
    await commonBeforeAll();

    u1Token = getU1Token();
    u2Token = getU2Token();

    if (!u1Token || !u2Token) {
        throw new Error("Tokens are not set in commonBeforeAll.");
    }
});

beforeEach(async () => {
    await commonBeforeEach();
});

afterEach(commonAfterEach);
afterAll(async () => {
    await commonAfterAll();
    jest.clearAllMocks();
});


/************************************** GET /notifications/:userId */

describe("GET /notifications/:userId", () => {

    it("should return an error for an invalid user id", async () => {
        const response = await request(app)
            .get("/notifications/undefined")
            .set("Authorization", `Bearer ${u1Token}`);

        expect(response.status).toBe(400);
        expect(response.body.error).toEqual("Invalid user ID provided");
    });

    it("should return notifications for a valid user", async () => {
        const payload = jwt.verify(u1Token, SECRET_KEY);
        const u1Id = payload.id;

        // Create two notifications for u1.
        await Notification.create({
            userId: u1Id,
            type: "like",
            content: "Your post was liked."
        });
        await Notification.create({
            userId: u1Id,
            type: "comment",
            content: "You have a new comment."
        });

        const response = await request(app)
            .get(`/notifications/${u1Id}`)
            .set("Authorization", `Bearer ${u1Token}`);

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body.notifications)).toBe(true);

        const notifications = response.body.notifications;
        const likeNotif = notifications.find(n => n.content === "Your post was liked.");
        const commentNotif = notifications.find(n => n.content === "You have a new comment.");

        expect(likeNotif).toBeDefined();
        expect(commentNotif).toBeDefined();
    });

});


/************************************** POST /notifications/read/:id */

describe("POST /notifications/read/:id", () => {

    it("should mark a notification as read", async () => {

        const payload = jwt.verify(u1Token, SECRET_KEY);
        const u1Id = payload.id;

        const notif = await Notification.create({
            userId: u1Id,
            type: "comment",
            content: "You have a new comment."
        });

        const response = await request(app)
            .post(`/notifications/read/${notif.id}`)
            .set("Authorization", `Bearer ${u1Token}`);

        expect(response.status).toBe(200);
        expect(response.body.message).toBe("Notification marked as read");

        const notificationsResponse = await request(app)
            .get(`/notifications/${u1Id}`)
            .set("Authorization", `Bearer ${u1Token}`);

        const markedNotification = notificationsResponse.body.notifications.find(n => n.id === notif.id);
        expect(markedNotification).toBeDefined();
        expect(markedNotification.is_read).toBe(true);
    });

    it("should return an error if the notification does not exist", async () => {
        const response = await request(app)
            .post("/notifications/read/99999")
            .set("Authorization", `Bearer ${u1Token}`);

        expect(response.status).toBe(404);
        expect(response.body.message).toBe("Notification not found");
    });

});
