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
const db = require("../db.js");
const app = require("../app");
const User = require("../models/user");

const {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
  getU1Token,
  getU2Token,
  getAdminToken
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


/************************************** POST /users */

describe("POST /users", () => {

  it("should allow an admin to create a new user", async () => {
    if (!adminToken) {
      throw new Error("Admin token is not set!");
    }
    const response = await request(app)
      .post("/users")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        username: "newuser",
        name: "New User",
        email: "newuser@example.com",
        password: "newpassword",
        isAdmin: false,
      });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty("user");
    expect(response.body.user.username).toBe("newuser");
    expect(response.body.user.isAdmin).toBe(false);
    expect(response.body).toHaveProperty("token");
  });

  it("should not allow non-admin to create a new user", async () => {
    const response = await request(app)
      .post("/users")
      .set("Authorization", `Bearer ${u1Token}`)
      .send({
        username: "newuser",
        name: "New User",
        email: "newuser@example.com",
        password: "newpassword",
        is_admin: false,
      });

    expect(response.status).toBe(403);
  });

});


/************************************** GET /users */

describe("GET /users", () => {

  it("should allow admin to get all users", async () => {
    const response = await request(app)
      .get("/users")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body.users).toBeInstanceOf(Array);
  });

  it("should not allow non-admin to get all users", async () => {
    const response = await request(app)
      .get("/users")
      .set("Authorization", `Bearer ${u1Token}`);

    expect(response.status).toBe(403);
  });

});


/************************************** GET /users/:username */

describe("GET /users/:username", () => {

  it("should return user details", async () => {
    const response = await request(app)
      .get("/users/u1")
      .set("Authorization", `Bearer ${u1Token}`);

    expect(response.status).toBe(200);
    expect(response.body.user).toHaveProperty("username", "u1");
    expect(response.body.user).toHaveProperty("name", "User One");
  });

  it("should not allow non-admin to get other user's data", async () => {
    const response = await request(app)
      .get("/users/u2")
      .set("Authorization", `Bearer ${u1Token}`);

    expect(response.status).toBe(403);
  });

});


/************************************** PATCH /users/:username */

describe("PATCH /users/:username", () => {

  it("should allow the user to update their own data", async () => {
    const response = await request(app)
      .patch("/users/u1")
      .set("Authorization", `Bearer ${u1Token}`)
      .send({
        name: "Updated User One",
      });

    expect(response.status).toBe(200);
    expect(response.body.user.name).toBe("Updated User One");
  });

  it("should allow admin to update a user's data", async () => {
    const response = await request(app)
      .patch("/users/u2")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        name: "Updated User Two",
      });

    expect(response.status).toBe(200);
    expect(response.body.user.name).toBe("Updated User Two");
  });

  it("should not allow non-user to update others' data", async () => {
    const response = await request(app)
      .patch("/users/u2")
      .set("Authorization", `Bearer ${u1Token}`)
      .send({
        name: "Updated User Two",
      });

    expect(response.status).toBe(403);
  });

});


/************************************** DELETE /users/:username */

describe("DELETE /users/:username", () => {

  it("should allow a user to delete their own account", async () => {
    const response = await request(app)
      .delete("/users/u1")
      .set("Authorization", `Bearer ${u1Token}`);

    expect(response.status).toBe(200);
    expect(response.body.deleted).toBe("u1");
  });

  it("should allow admin to delete any user", async () => {
    const response = await request(app)
      .delete("/users/u2")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body.deleted).toBe("u2");
  });

  it("should not allow non-user to delete others' accounts", async () => {
    const response = await request(app)
      .delete("/users/u2")
      .set("Authorization", `Bearer ${u1Token}`);

    expect(response.status).toBe(403);
  });

});
