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
const app = require("../app");
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


/************************************** POST /likes */

describe("POST /likes", () => {

  it("should allow a user to like a post", async () => {
    const response = await request(app)
      .post("/likes")
      .set("Authorization", `Bearer ${u1Token}`)
      .send({ postId: testPostIds[2] }); // Like user2's post

    expect(response.status).toBe(201);
    expect(response.body.like).toHaveProperty("id");
    expect(response.body.like.postId).toBe(testPostIds[2]);
  });

  it("should not allow a user to like a post more than once", async () => {
    // First like
    await request(app)
      .post("/likes")
      .set("Authorization", `Bearer ${u1Token}`)
      .send({ postId: testPostIds[1] });

    // Try to like again
    const response = await request(app)
      .post("/likes")
      .set("Authorization", `Bearer ${u1Token}`)
      .send({ postId: testPostIds[1] });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("Already liked");
  });

  it("should not allow unauthenticated users to like a post", async () => {
    const response = await request(app)
      .post("/likes")
      .send({ postId: testPostIds[1] });

    expect(response.status).toBe(401);
  });

  it("should return error if no postId is provided", async () => {
    const response = await request(app)
      .post("/likes")
      .set("Authorization", `Bearer ${u1Token}`)
      .send({});

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("Post ID is required");
  });

});


/************************************** DELETE /likes/:postId */

describe("DELETE /likes/:postId", () => {

  it("should allow a user to remove a like from a post", async () => {
    // First, like the post
    await request(app)
      .post("/likes")
      .set("Authorization", `Bearer ${u1Token}`)
      .send({ postId: testPostIds[1] });

    // Now, remove the like
    const response = await request(app)
      .delete(`/likes/${testPostIds[1]}`)
      .set("Authorization", `Bearer ${u1Token}`);

    expect(response.status).toBe(200);
    expect(response.body.message).toBe("Like removed");
  });

  it("should not allow unauthenticated users to remove a like", async () => {
    const response = await request(app)
      .delete(`/likes/${testPostIds[1]}`);

    expect(response.status).toBe(401);
  });

});


/************************************** GET /likes/:postId */

describe("GET /likes/:postId", () => {

  it("should check if a user has liked a post", async () => {
    // Like the post first
    await request(app)
      .post("/likes")
      .set("Authorization", `Bearer ${u1Token}`)
      .send({ postId: testPostIds[1] });

    // Now, check if the post is liked
    const response = await request(app)
      .get(`/likes/${testPostIds[1]}`)
      .set("Authorization", `Bearer ${u1Token}`);

    expect(response.status).toBe(200);
    expect(response.body.isLiked).toBe(true);
  });

  it("should return false if the user has not liked the post", async () => {
    const response = await request(app)
      .get(`/likes/${testPostIds[2]}`)
      .set("Authorization", `Bearer ${u1Token}`);

    expect(response.status).toBe(200);
    expect(response.body.isLiked).toBe(false);
  });

  it("should return error if no postId is provided", async () => {
    const response = await request(app)
      .get("/likes/")
      .set("Authorization", `Bearer ${u1Token}`);

    expect(response.status).toBe(404);
  });

});


/************************************** GET /likes/count/:postId */

describe("GET /likes/count/:postId", () => {

  it("should return the number of likes for a post", async () => {
    // Like the post first
    await request(app)
      .post("/likes")
      .set("Authorization", `Bearer ${u1Token}`)
      .send({ postId: testPostIds[1] });

    const response = await request(app)
      .get(`/likes/count/${testPostIds[1]}`)
      .set("Authorization", `Bearer ${u1Token}`);

    expect(response.status).toBe(200);
    expect(response.body.likesCount).toBeGreaterThan(0);
  });

  it("should return 0 likes if no likes have been added", async () => {
    const response = await request(app)
      .get(`/likes/count/${testPostIds[2]}`)
      .set("Authorization", `Bearer ${u1Token}`);

    expect(response.status).toBe(200);
    expect(response.body.likesCount).toBe(0);
  });

});