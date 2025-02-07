"use strict";

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
const db = require("../db.js");
const app = require("../app");
const Event = require("../models/event");
const {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
  getU1Token,
  getU2Token,
  getAdminToken,
  testEventIds
} = require("./_testCommon");

let u1Token, u2Token, adminToken;

beforeAll(async () => {
  await commonBeforeAll();

  // Retrieve tokens
  u1Token = getU1Token();
  u2Token = getU2Token();
  adminToken = getAdminToken();

  // Assert tokens are defined
  if (!u1Token || !u2Token || !adminToken) {
    throw new Error("Tokens are not set in commonBeforeAll.");
  }
});

beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);


/************************************** POST /events */

describe("POST /events", () => {

  it("should allow a user to create a new event", async () => {
    const response = await request(app)
      .post("/events")
      .set("Authorization", `Bearer ${u1Token}`)
      .send({
        title: "New Event by user1",
        description: "Description of new event",
        location: "Event location",
        date: "2025-02-20",
        startTime: "10:00",
        endTime: "12:00",
        createdBy: 1, // Assuming u1's ID
      });

    expect(response.status).toBe(201);
    expect(response.body.event).toHaveProperty("id");
    expect(response.body.event.title).toBe("New Event by user1");
  });

  it("should not allow non-authenticated users to create an event", async () => {
    const response = await request(app)
      .post("/events")
      .send({
        title: "Event without authentication",
        description: "Description",
        location: "Location",
        date: "2025-02-20",
        startTime: "10:00",
        endTime: "12:00",
        createdBy: 2, // Assuming u2's ID
      });

    expect(response.status).toBe(401);
  });

  it("should not allow invalid data (missing title)", async () => {
    const response = await request(app)
      .post("/events")
      .set("Authorization", `Bearer ${u1Token}`)
      .send({
        description: "Description",
        location: "Location",
        date: "2025-02-20",
        startTime: "10:00",
        endTime: "12:00",
        createdBy: 1,
      });

    expect(response.status).toBe(400);
  });

});


/************************************** GET /events */

describe("GET /events", () => {

  it("should allow fetching all events", async () => {
    const response = await request(app)
      .get("/events")
      .set("Authorization", `Bearer ${u1Token}`);

    expect(response.status).toBe(200);
    expect(response.body.events).toBeInstanceOf(Array);
    expect(response.body.events.length).toBeGreaterThan(0);
  });

  it("should allow filtering events by title", async () => {
    const response = await request(app)
      .get("/events")
      .set("Authorization", `Bearer ${u1Token}`)
      .query({ title: "Dog Meetup" });

    expect(response.status).toBe(200);
    expect(response.body.events).toBeInstanceOf(Array);
    expect(response.body.events.length).toBeGreaterThan(0);
    expect(response.body.events[0].title).toBe("Dog Meetup");
  });

});


/************************************** PATCH /events/:id */

describe("PATCH /events/:id", () => {

  it("should allow updating an event created by the user", async () => {
    const response = await request(app)
      .patch(`/events/${testEventIds[0]}`)
      .set("Authorization", `Bearer ${u1Token}`)
      .send({
        title: "Updated event content by user1",
      });

    expect(response.status).toBe(200);
    expect(response.body.event.title).toBe("Updated event content by user1");
  });

  it("should not allow updating an event created by another user", async () => {
    const response = await request(app)
      .patch(`/events/${testEventIds[0]}`)
      .set("Authorization", `Bearer ${u2Token}`)
      .send({
        title: "Updated event content by user2",
      });

    expect(response.status).toBe(403);
  });

  it("should allow admin to update any event", async () => {
    const response = await request(app)
      .patch(`/events/${testEventIds[1]}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        title: "Admin updated event content",
      });

    expect(response.status).toBe(200);
    expect(response.body.event.title).toBe("Admin updated event content");
  });

});


/************************************** DELETE /events/:id */

describe("DELETE /events/:id", () => {

  it("should allow deleting an event created by the user", async () => {
    const response = await request(app)
      .delete(`/events/${testEventIds[0]}`)
      .set("Authorization", `Bearer ${u1Token}`);

    expect(response.status).toBe(200);
    expect(response.body.deleted).toBe(String(testEventIds[0]));
  });

  it("should not allow deleting an event created by another user", async () => {
    const response = await request(app)
      .delete(`/events/${testEventIds[1]}`)
      .set("Authorization", `Bearer ${u1Token}`);

    expect(response.status).toBe(403);
  });

  it("should allow admin to delete any event", async () => {
    const response = await request(app)
      .delete(`/events/${testEventIds[1]}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body.deleted).toBe(String(testEventIds[1]));
  });

});
