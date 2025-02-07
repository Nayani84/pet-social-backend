"use strict";

const db = require("../db.js");
const { NotFoundError } = require("../expressError");
const Like = require("./like.js");
const {
    commonBeforeAll,
    commonBeforeEach,
    commonAfterEach,
    commonAfterAll,
} = require("./_testCommon");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/************************************** add */

describe("add", function () {

    test("works", async function () {
        const postRes = await db.query(`SELECT id FROM posts WHERE content = 'Post 2 content'`);
        const userRes = await db.query(`SELECT id FROM users WHERE username = 'testuser'`);

        const postId = postRes.rows[0].id;
        const ownerId = userRes.rows[0].id;

        const like = await Like.add({ postId, ownerId });

        expect(like).toEqual({
            id: expect.any(Number),
            postId,
            ownerId
        });
    });

    test("throws error for duplicate like", async function () {
        const postRes = await db.query(`SELECT id FROM posts WHERE content = 'Post 1 content'`);
        const userRes = await db.query(`SELECT id FROM users WHERE username = 'testuser'`);

        const postId = postRes.rows[0].id;
        const ownerId = userRes.rows[0].id;

        try {
            await Like.add({ postId, ownerId });
            await Like.add({ postId, ownerId });
            fail();
        } catch (err) {
            expect(err.message).toEqual("Duplicate like.");
        }
    });

});

/************************************** exists */

describe("exists", function () {

    test("works: like exists", async function () {
        const postRes = await db.query(`SELECT id FROM posts WHERE content = 'Post 1 content'`);
        const userRes = await db.query(`SELECT id FROM users WHERE username = 'testuser'`);

        const postId = postRes.rows[0].id;
        const ownerId = userRes.rows[0].id;

        const exists = await Like.exists(postId, ownerId);
        expect(exists).toBeTruthy();
    });

    test("works: like does not exist", async function () {
        const exists = await Like.exists(0, 0);
        expect(exists).toBeFalsy();
    });

});

/************************************** remove */

describe("remove", function () {

    test("works", async function () {
        const postRes = await db.query(`SELECT id FROM posts WHERE content = 'Post 1 content'`);
        const userRes = await db.query(`SELECT id FROM users WHERE username = 'testuser'`);

        const postId = postRes.rows[0].id;
        const ownerId = userRes.rows[0].id;

        const res = await Like.remove(postId, ownerId);
        expect(res).toEqual({ message: "Like removed" });
    });

    test("not found if no such like", async function () {
        try {
            await Like.remove(0, 0);
            fail();
        } catch (err) {
            expect(err instanceof NotFoundError).toBeTruthy();
        }
    });

});

/************************************** getLikesCount */

describe("getLikesCount", function () {

    test("works", async function () {
        const postRes = await db.query(`SELECT id FROM posts WHERE content = 'Post 1 content'`);
        const postId = postRes.rows[0].id;

        const count = await Like.getLikesCount(postId);
        expect(count).toEqual(1);
    });

    test("not found if no such post", async function () {
        try {
            await Like.getLikesCount(0);
            fail();
        } catch (err) {
            expect(err instanceof NotFoundError).toBeTruthy();
        }
    });

});
