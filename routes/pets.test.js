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
const Pet = require("../models/pet");
const {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
  getU1Token,
  getU2Token,
  getAdminToken,
  testPetIds,
} = require("./_testCommon");

let u1Token, u2Token, adminToken;

beforeAll(async () => {
  await commonBeforeAll();

  u1Token = getU1Token();
  u2Token = getU2Token();
  adminToken = getAdminToken();
});

beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);


/************************************** POST /pets */

describe("POST /pets", () => {

  it("should allow an admin to create a pet", async () => {
    const response = await request(app)
      .post("/pets")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        name: "Charlie",
        type: "Dog",
        breed: "Beagle",
        age: 4,
        bio: "Friendly dog",
        photo_url: "http://example.com/charlie.jpg",
        ownerId: 1,
      });

    expect(response.status).toBe(201);
    expect(response.body.pet).toHaveProperty("id");
    expect(response.body.pet.name).toBe("Charlie");
  });

  it("should allow a regular user to create a pet", async () => {
    const response = await request(app)
      .post("/pets")
      .set("Authorization", `Bearer ${u1Token}`)
      .send({
        name: "Charlie",
        type: "Dog",
        breed: "Beagle",
        age: 4,
        bio: "Friendly dog",
        photo_url: "http://example.com/charlie.jpg",
        ownerId: 1,
      });

    expect(response.status).toBe(201);
  });

  it("should return 400 for invalid data", async () => {
    const response = await request(app)
      .post("/pets")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        type: "Dog",
      });

    expect(response.status).toBe(400);
  });

});


/************************************** GET /pets */

describe("GET /pets", () => {

  it("should allow anyone to fetch all pets", async () => {
    const response = await request(app).get("/pets");

    expect(response.status).toBe(200);
    expect(response.body.pets).toBeInstanceOf(Array);
    expect(response.body.pets.length).toBeGreaterThan(0);
  });

  it("should allow filtering pets by type", async () => {
    const response = await request(app)
      .get("/pets")
      .query({ type: "Dog" });

    expect(response.status).toBe(200);
    expect(response.body.pets.every(pet => pet.type === "Dog")).toBe(true);
  });

});


/************************************** GET /pets/:id */

describe("GET /pets/:id", () => {

  it("should return pet details for a valid ID", async () => {
    const response = await request(app).get(`/pets/${testPetIds[0]}`);

    expect(response.status).toBe(200);
    expect(response.body.pet).toHaveProperty("id", testPetIds[0]);
  });

  it("should return 404 for a non-existent pet", async () => {
    const response = await request(app).get(`/pets/99999`);

    expect(response.status).toBe(404);
  });

});


/************************************** PATCH /pets/:id */

describe("PATCH /pets/:id", () => {

  it("should allow an admin to update a pet", async () => {
    const response = await request(app)
      .patch(`/pets/${testPetIds[0]}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ bio: "Updated bio" });

    expect(response.status).toBe(200);
    expect(response.body.pet.bio).toBe("Updated bio");
  });

  it("should allow a regular user to update a pet", async () => {
    const response = await request(app)
      .patch(`/pets/${testPetIds[0]}`)
      .set("Authorization", `Bearer ${u1Token}`)
      .send({ bio: "Should not update" });

    expect(response.status).toBe(200);
  });

});


/************************************** DELETE /pets/:id */

describe("DELETE /pets/:id", () => {

  it("should allow an admin to delete a pet", async () => {
    const response = await request(app)
      .delete(`/pets/${testPetIds[0]}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body.deleted).toBe(String(testPetIds[0]));
  });

  it("should allow a regular user to delete a pet", async () => {
    const response = await request(app)
      .delete(`/pets/${testPetIds[1]}`)
      .set("Authorization", `Bearer ${u2Token}`);

    expect(response.status).toBe(200);
    expect(response.body.deleted).toBe(String(testPetIds[1]));
  });

});
