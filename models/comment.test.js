"use strict";

const db = require("../db.js");
const { NotFoundError, ForbiddenError } = require("../expressError");
const Comment = require("./comment.js");
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

/************************************** getCommentsForPost */

describe("getCommentsForPost", function () {

    test("works: retrieves comments for a valid post", async function () {
        const posts = await db.query("SELECT id FROM posts");
        const postId = posts.rows[0].id;

        const comments = await Comment.getCommentsForPost(postId);
        expect(comments).toEqual([
            {
                id: expect.any(Number),
                content: "Great post!",
                createdAt: expect.any(Date),
                username: "testuser",
                profilePic: "profilepic.jpg",
            },
        ]);
    });

    test("works: no comments for post", async function () {
        const result = await db.query(
            `SELECT id FROM posts WHERE content = 'Non-existent Post Content'`
        );
        const postId = result.rows[0]?.id || -1; // Ensure a valid postId is used or a non-existent one

        const comments = await Comment.getCommentsForPost(postId);
        expect(comments).toEqual([]); // Verify no comments exist for the specific postId
    });

});

/************************************** createComment */

describe("createComment", function () {

    test("works: valid input", async function () {
        const postRes = await db.query("SELECT id FROM posts WHERE content = 'Post 1 content'");
        const postId = postRes.rows[0].id;

        const comment = await Comment.createComment("testuser", postId, "New test comment");

        expect(comment).toEqual({
            id: expect.any(Number),
            postId,
            ownerId: expect.any(Number),
            content: "New test comment",
            createdAt: expect.any(Date),
        });

        const result = await db.query("SELECT content FROM comments WHERE id = $1", [comment.id]);
        expect(result.rows[0].content).toEqual("New test comment");
    });

});

/************************************** updateComment */

describe("updateComment", function () {

    test("works: valid update", async function () {
        const comments = await db.query("SELECT id FROM comments WHERE content = 'Great post!'");
        const commentId = comments.rows[0].id;

        const updatedComment = await Comment.updateComment(commentId, "testuser", "Updated comment");

        expect(updatedComment).toEqual({
            id: commentId,
            postId: expect.any(Number),
            ownerId: expect.any(Number),
            content: "Updated comment",
            createdAt: expect.any(Date),
        });

        const result = await db.query("SELECT content FROM comments WHERE id = $1", [commentId]);
        expect(result.rows[0].content).toEqual("Updated comment");
    });

    test("fails: unauthorized update", async function () {
        const comments = await db.query("SELECT id FROM comments WHERE content = 'Great post!'");
        const commentId = comments.rows[0].id;

        try {
            await Comment.updateComment(commentId, "adminuser", "Unauthorized update");
            fail();
        } catch (err) {
            expect(err instanceof ForbiddenError).toBeTruthy();
        }
    });

});

/************************************** deleteComment */

describe("deleteComment", function () {

    test("works: valid delete", async function () {
        const comments = await db.query("SELECT id FROM comments WHERE content = 'Great post!'");
        const commentId = comments.rows[0].id;

        await Comment.deleteComment(commentId, "testuser");

        const result = await db.query("SELECT id FROM comments WHERE id = $1", [commentId]);
        expect(result.rows.length).toEqual(0);
    });

    test("fails: unauthorized delete", async function () {
        const comments = await db.query("SELECT id FROM comments WHERE content = 'Nice content!'");
        const commentId = comments.rows[0].id;

        try {
            await Comment.deleteComment(commentId, "testuser");
            fail();
        } catch (err) {
            expect(err instanceof ForbiddenError).toBeTruthy();
        }
    });

});
