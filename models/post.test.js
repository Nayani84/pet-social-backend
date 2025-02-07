"use strict";

const db = require("../db.js");
const { BadRequestError, NotFoundError } = require("../expressError");
const Post = require("./post.js");
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


/************************************** create */

describe("create", function () {

    test("works", async function () {
        const userRes = await db.query(
            `SELECT id FROM users WHERE username = 'testuser'`
        );
        const ownerId = userRes.rows[0].id;

        const newPost = {
            content: "New post content",
            imageUrl: "http://example.com/newpost.jpg",
            ownerId,
        };

        const post = await Post.create(newPost);

        expect(post).toEqual({
            id: expect.any(Number),
            content: "New post content",
            imageurl: "http://example.com/newpost.jpg",
            ownerId,
            createdAt: expect.any(Date),
        });

        const result = await db.query(
            `SELECT id, content, image_url, owner_id, created_at
             FROM posts
             WHERE id = $1`,
            [post.id]
        );

        expect(result.rows[0]).toEqual({
            id: post.id,
            content: "New post content",
            image_url: "http://example.com/newpost.jpg",
            owner_id: ownerId,
            created_at: expect.any(Date),
        });
    });

});


/************************************** findAll */

describe("findAll", function () {

    test("works: no filters", async function () {
        const posts = await Post.findAll();
        expect(posts).toEqual([
            {
                id: expect.any(Number),
                content: "Post 1 content",
                imageUrl: "http://example.com/post1.jpg",
                ownerId: expect.any(Number),
                createdAt: expect.any(Date),
            },
            {
                id: expect.any(Number),
                content: "Post 2 content",
                imageUrl: "http://example.com/post2.jpg",
                ownerId: expect.any(Number),
                createdAt: expect.any(Date),
            },
        ]);
    });

    test("works: filter by ownerId", async function () {
        const posts = await Post.findAll({ ownerId: 1 });
        expect(posts.every((p) => p.ownerId === 1)).toBeTruthy();
    });

    test("works: filter by content", async function () {
        const posts = await Post.findAll({ content: "Post 1" });
        expect(posts.length).toEqual(1);
        expect(posts[0].content).toEqual("Post 1 content");
    });

    test("works: with pagination", async function () {
        const posts = await Post.findAll({ limit: 1, offset: 1 });
        expect(posts.length).toEqual(1);
    });

});


/************************************** get */

describe("get", function () {

    test("works", async function () {
        const posts = await Post.findAll();
        const postId = posts[0].id;

        const post = await Post.get(postId);
        expect(post).toEqual({
            id: postId,
            content: "Post 1 content",
            imageUrl: "http://example.com/post1.jpg",
            ownerId: expect.any(Number),
            ownerUsername: "testuser",
            createdAt: expect.any(Date),
        });
    });

    test("not found if no such post", async function () {
        try {
            await Post.get(0);
            fail();
        } catch (err) {
            expect(err instanceof NotFoundError).toBeTruthy();
        }
    });

});


/************************************** update */

describe("update", function () {

    const updateData = {
        content: "Updated content",
        imageUrl: "http://example.com/updated.jpg",
    };

    test("works", async function () {
        const posts = await Post.findAll();
        const postId = posts[0].id;

        const post = await Post.update(postId, updateData);
        expect(post).toEqual({
            id: postId,
            content: "Updated content",
            imageUrl: "http://example.com/updated.jpg",
            createdAt: expect.any(Date),
        });

        const result = await db.query(
            `SELECT content, image_url
         FROM posts
         WHERE id = $1`,
            [postId]
        );
        expect(result.rows[0]).toEqual({
            content: "Updated content",
            image_url: "http://example.com/updated.jpg",
        });
    });

    test("not found if no such post", async function () {
        try {
            await Post.update(0, updateData);
            fail();
        } catch (err) {
            expect(err instanceof NotFoundError).toBeTruthy();
        }
    });

    test("bad request with no data", async function () {
        try {
            const posts = await Post.findAll();
            const postId = posts[0].id;

            await Post.update(postId, {});
            fail();
        } catch (err) {
            expect(err instanceof BadRequestError).toBeTruthy();
        }
    });

});


/************************************** remove */

describe("remove", function () {

    test("works", async function () {
        const posts = await Post.findAll();
        const postId = posts[0].id;

        await Post.remove(postId);

        const result = await db.query(
            `SELECT id
         FROM posts
         WHERE id = $1`,
            [postId]
        );
        expect(result.rows.length).toEqual(0);
    });

    test("not found if no such post", async function () {
        try {
            await Post.remove(0);
            fail();
        } catch (err) {
            expect(err instanceof NotFoundError).toBeTruthy();
        }
    });

});
