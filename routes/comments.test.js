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
const {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
  getU1Token,
  getU2Token,
  testPostIds,
  testCommentIds,
} = require("./_testCommon");

let u1Token, u2Token;

beforeAll(async () => {
  await commonBeforeAll();

  // Retrieve tokens
  u1Token = getU1Token();
  u2Token = getU2Token();

  if (!u1Token || !u2Token) {
    throw new Error("Tokens are not set in commonBeforeAll.");
  }
});

// beforeEach(commonBeforeEach);
beforeEach(async () => {
  await commonBeforeEach();
});

afterEach(commonAfterEach);
afterAll(commonAfterAll);


/************************************** POST /comments/:postId */

describe("POST /comments/:postId", () => {

  it("should allow a logged-in user to comment on a post", async () => {
    const io = require('../socket').getIO();

    const response = await request(app)
      .post(`/comments/${testPostIds[0]}`)
      .set("Authorization", `Bearer ${u1Token}`)
      .send({
        content: "This is a test comment by u1",
      });

    expect(response.status).toBe(201);
    expect(response.body.comment).toHaveProperty("id");
    expect(response.body.comment.content).toBe("This is a test comment by u1");

    // Assert `to` was called - Check if `to` was actually called
    expect(io.to).toHaveBeenCalledWith(testPostIds[0].toString());
    expect(io.to().emit).toHaveBeenCalled();
    expect(io.to().emit).toHaveBeenCalledWith("receiveNotification", expect.objectContaining({
      type: "comment",
      postId: expect.any(String),
      content: expect.any(String)
    }));
  });

  it("should not allow unauthenticated users to comment", async () => {
    const response = await request(app)
      .post(`/comments/${testPostIds[0]}`)
      .send({
        content: "Unauthorized comment",
      });

    expect(response.status).toBe(401);
  });

  it("should not allow empty content", async () => {
    const response = await request(app)
      .post(`/comments/${testPostIds[0]}`)
      .set("Authorization", `Bearer ${u1Token}`)
      .send({
        content: "",
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toEqual("Content cannot be empty.");
  });

});

/************************************** GET /comments/:postId */

describe("GET /comments/:postId", () => {

  it("should allow fetching all comments for a post", async () => {
    const response = await request(app)
      .get(`/comments/${testPostIds[0]}`)
      .set("Authorization", `Bearer ${u1Token}`);

    expect(response.status).toBe(200);
    expect(response.body.comments).toBeInstanceOf(Array);
    expect(response.body.comments.length).toBeGreaterThan(0);
  });

  it("should return an empty list for a post with no comments", async () => {
    const response = await request(app)
      .get(`/comments/${testPostIds[2]}`)
      .set("Authorization", `Bearer ${u1Token}`);

    expect(response.status).toBe(200);
    expect(response.body.comments).toEqual([]);
  });

  it("should allow unauthenticated users to fetch comments", async () => {
    const response = await request(app).get(`/comments/${testPostIds[0]}`);
    expect(response.status).toBe(200);
  });

});


/************************************** PATCH /comments/:commentId */

describe("PATCH /comments/:commentId", () => {

  it("should allow a user to update their own comment", async () => {
    const response = await request(app)
      .patch(`/comments/${testCommentIds[0]}`)
      .set("Authorization", `Bearer ${u2Token}`)
      .send({
        content: "Updated comment by u2",
      });

    expect(response.status).toBe(200);
    expect(response.body.comment.content).toBe("Updated comment by u2");
  });

  it("should not allow a user to update someone else's comment", async () => {
    const response = await request(app)
      .patch(`/comments/${testCommentIds[0]}`)
      .set("Authorization", `Bearer ${u1Token}`)
      .send({
        content: "Unauthorized update attempt",
      });

    expect(response.status).toBe(403);
    expect(response.body.error).toBe("Comment not found or unauthorized.");
  });

  it("should not allow unauthenticated users to update a comment", async () => {
    const response = await request(app)
      .patch(`/comments/${testCommentIds[0]}`)
      .send({
        content: "Unauthorized update attempt",
      });

    expect(response.status).toBe(401);
  });

  it("should return 400 for empty content", async () => {
    const response = await request(app)
      .patch(`/comments/${testCommentIds[0]}`)
      .set("Authorization", `Bearer ${u2Token}`)
      .send({
        content: "",
      });

    expect(response.status).toBe(400);
  });

});


/************************************** DELETE /comments/:commentId */

describe("DELETE /comments/:commentId", () => {

  it("should allow a user to delete their own comment", async () => {
    const response = await request(app)
      .delete(`/comments/${testCommentIds[0]}`)
      .set("Authorization", `Bearer ${u2Token}`);

    expect(response.status).toBe(200);
    expect(response.body.deleted).toBe(String(testCommentIds[0]));
  });

  it("should not allow a user to delete someone else's comment", async () => {
    const response = await request(app)
      .delete(`/comments/${testCommentIds[1]}`)
      .set("Authorization", `Bearer ${u1Token}`);

    expect(response.status).toBe(403);
  });

  it("should not allow unauthenticated users to delete a comment", async () => {
    const response = await request(app).delete(`/comments/${testCommentIds[1]}`);

    expect(response.status).toBe(401);
  });

  it("should return 404 for non-existent comment", async () => {
    const response = await request(app)
      .delete(`/comments/99999`)
      .set("Authorization", `Bearer ${u2Token}`);

    expect(response.status).toBe(404);
  });

});
