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
const Post = require("../models/post");
const {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
  getU1Token,
  getU2Token,
  getAdminToken,
  testPostIds
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


/************************************** POST /posts */

describe("POST /posts", () => {

  it("should allow a user to create a new post", async () => {
    const response = await request(app)
      .post("/posts")
      .set("Authorization", `Bearer ${u1Token}`)
      .send({
        content: "New post by user1",
        image_url: "http://example.com/user1_post.jpg",
        ownerId: 1, // Assuming u1's ID
      });

    expect(response.status).toBe(201);
    expect(response.body.post).toHaveProperty("id");
    expect(response.body.post.content).toBe("New post by user1");
  });

  it("should not allow non-authenticated users to create a post", async () => {
    const response = await request(app)
      .post("/posts")
      .send({
        content: "Post without authentication",
        image_url: "http://example.com/no_auth_post.jpg",
        ownerId: 2, // Assuming u2's ID
      });

    expect(response.status).toBe(401);
  });

  it("should not allow invalid data (missing content)", async () => {
    const response = await request(app)
      .post("/posts")
      .set("Authorization", `Bearer ${u1Token}`)
      .send({
        image_url: "http://example.com/invalid_post.jpg",
        ownerId: 1,
      });

    expect(response.status).toBe(400);
  });

});


/************************************** GET /posts */

describe("GET /posts", () => {

  it("should allow fetching all posts", async () => {
    const response = await request(app)
      .get("/posts")
      .set("Authorization", `Bearer ${u1Token}`);

    expect(response.status).toBe(200);
    expect(response.body.posts).toBeInstanceOf(Array);
    expect(response.body.posts.length).toBeGreaterThan(0);
  });

  it("should allow filtering posts by ownerId", async () => {
    const response = await request(app)
      .get("/posts")
      .set("Authorization", `Bearer ${u1Token}`)
      .query({ ownerId: 1 });

    expect(response.status).toBe(200);
    expect(response.body.posts).toBeInstanceOf(Array);
    if (response.body.posts.length > 0) {
      expect(response.body.posts[0].ownerId).toBe(1);
    } else {
      console.warn("No posts found for ownerId 1");
    }
  });

  it("should allow filtering posts by content", async () => {
    const response = await request(app)
      .get("/posts")
      .set("Authorization", `Bearer ${u1Token}`)
      .query({ content: "Post 1 content" });

    expect(response.status).toBe(200);
    expect(response.body.posts).toBeInstanceOf(Array);

    expect(response.body.posts.length).toBeGreaterThan(0);
    expect(response.body.posts[0].content).toBe("Post 1 content");
  });

});


/************************************** PATCH /posts/:id */

describe("PATCH /posts/:id", () => {

  it("should allow updating a post created by the user", async () => {
    const response = await request(app)
      .patch(`/posts/${testPostIds[0]}`)
      .set("Authorization", `Bearer ${u1Token}`)
      .send({
        content: "Updated post content by user1",
      });

    expect(response.status).toBe(200);
    expect(response.body.post.content).toBe("Updated post content by user1");
  });

  it("should not allow updating a post created by another user", async () => {
    const response = await request(app)
      .patch(`/posts/${testPostIds[0]}`)
      .set("Authorization", `Bearer ${u2Token}`)
      .send({
        content: "Updated post content by user2",
      });

    expect(response.status).toBe(403);
  });

  it("should allow admin to update any post", async () => {
    const response = await request(app)
      .patch(`/posts/${testPostIds[1]}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        content: "Admin updated post content",
      });

    expect(response.status).toBe(200);
    expect(response.body.post.content).toBe("Admin updated post content");
  });

});


/************************************** DELETE /posts/:id */

describe("DELETE /posts/:id", () => {

  it("should allow deleting a post created by the user", async () => {
    const response = await request(app)
      .delete(`/posts/${testPostIds[0]}`)
      .set("Authorization", `Bearer ${u1Token}`);

    expect(response.status).toBe(200);
    expect(response.body.deleted).toBe(String(testPostIds[0]));
  });

  it("should not allow deleting a post created by another user", async () => {
    const response = await request(app)
      .delete(`/posts/${testPostIds[1]}`)
      .set("Authorization", `Bearer ${u1Token}`);

    expect(response.status).toBe(403);
  });

  it("should allow admin to delete any post", async () => {
    const response = await request(app)
      .delete(`/posts/${testPostIds[1]}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body.deleted).toBe(String(testPostIds[1]));
  });

});
