"use strict";

const {
    NotFoundError,
    BadRequestError,
    UnauthorizedError,
} = require("../expressError");
const db = require("../db.js");
const User = require("./user.js");
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


/************************************** authenticate */
describe("authenticate", function () {

    test("works", async function () {
        const user = await User.authenticate("testuser", "password1");
        const { id, ...userWithoutId } = user;

        expect(userWithoutId).toEqual({
            username: "testuser",
            name: "Test User",
            email: "testuser@example.com",
            profilePic: "profilepic.jpg",
            isAdmin: false,
        });
    });

    test("unauth if no such user", async function () {
        try {
            await User.authenticate("nope", "password");
            fail();
        } catch (err) {
            expect(err instanceof UnauthorizedError).toBeTruthy();
        }
    });

    test("unauth if wrong password", async function () {
        try {
            await User.authenticate("c1", "wrong");
            fail();
        } catch (err) {
            expect(err instanceof UnauthorizedError).toBeTruthy();
        }
    });

});


/************************************** register */

describe("register", function () {

    const newUser = {
        username: "newuser",
        name: "New User",
        email: "newuser@example.com",
        profilePic: "newpic.jpg",
        isAdmin: false
    };

    test("works", async function () {
        const user = await User.register({
            ...newUser,
            password: "password",
        });

        const { id, password, ...userWithoutId } = user;

        expect(userWithoutId).toEqual({
            ...newUser,
        });

        const found = await db.query("SELECT * FROM users WHERE username = $1", [newUser.username]);
        expect(found.rows.length).toEqual(1);
        expect(found.rows[0].is_admin).toEqual(false);
        expect(found.rows[0].password.startsWith("$2b$")).toEqual(true);
    });

    test("works: adds admin", async function () {
        const user = await User.register({
            ...newUser,
            password: "password",
            isAdmin: true,
        });

        const { id, password, ...userWithoutId } = user;

        expect(userWithoutId).toEqual({
            ...newUser,
            isAdmin: true,
        });

        const found = await db.query("SELECT * FROM users WHERE username = $1", [newUser.username]);

        expect(found.rows.length).toEqual(1);
        expect(found.rows[0].is_admin).toEqual(true);
        expect(found.rows[0].password.startsWith("$2b$")).toEqual(true);
    });

    test("bad request with dup data", async function () {
        try {
            await User.register({
                ...newUser,
                password: "password",
            });
            await User.register({
                ...newUser,
                password: "password",
            });
            fail();
        } catch (err) {
            expect(err instanceof BadRequestError).toBeTruthy();
        }
    });

});


/************************************** findAll */

describe("findAll", function () {

    test("works", async function () {
        const users = await User.findAll();

        const expectedUsers = [
            {
                username: "testuser",
                name: "Test User",
                email: "testuser@example.com",
                profilePic: "profilepic.jpg",
                isAdmin: false,
            },
            {
                username: "adminuser",
                name: "Admin User",
                email: "admin@example.com",
                profilePic: "adminpic.jpg",
                isAdmin: true
            },
        ];
        const sortByUsername = (a, b) => a.username.localeCompare(b.username);

        expect(users.sort(sortByUsername)).toEqual(expectedUsers.sort(sortByUsername));
    });

});


/************************************** get */

describe("get", function () {

    test("works", async function () {
        let user = await User.get("testuser");

        expect(user).toEqual({
            id: expect.any(Number),
            username: "testuser",
            name: "Test User",
            email: "testuser@example.com",
            profilePic: "profilepic.jpg",
            isAdmin: false,
            posts: [
                {
                    "content": "Post 1 content",
                    "createdAt": expect.any(Date),
                    "id": expect.any(Number),
                    "imageUrl": "http://example.com/post1.jpg",
                }
            ]

        });
    });

    test("not found if no such user", async function () {
        try {
            await User.get("nope");
            fail();
        } catch (err) {
            expect(err instanceof NotFoundError).toBeTruthy();
        }
    });

});


/************************************** update */

describe("update", function () {

    const updateData = {
        name: "New Test User",
        email: "newtestuser@example.com",
        profilePic: "newprofilepic.jpg",
        isAdmin: true,
    };

    test("works", async function () {
        let user = await User.update("testuser", updateData);

        expect(user).toEqual({
            username: "testuser",
            ...updateData,
        });
    });

    test("works: set password", async function () {
        let user = await User.update("testuser", {
            password: "new",
        });

        expect(user).toEqual({
            username: "testuser",
            name: "Test User",
            email: "testuser@example.com",
            profilePic: "profilepic.jpg",
            isAdmin: false,
        });
        const found = await db.query("SELECT * FROM users WHERE username = 'testuser'");
        expect(found.rows.length).toEqual(1);
        expect(found.rows[0].password.startsWith("$2b$")).toEqual(true);
    });

    test("not found if no such user", async function () {
        try {
            await User.update("nope", {
                name: "test",
            });
            fail();
        } catch (err) {
            expect(err instanceof NotFoundError).toBeTruthy();
        }
    });

    test("bad request if no data", async function () {
        expect.assertions(1);
        try {
            await User.update("c1", {});
            fail();
        } catch (err) {
            expect(err instanceof BadRequestError).toBeTruthy();
        }
    });

});


/************************************** remove */

describe("remove", function () {

    test("works", async function () {
        await User.remove("testuser");
        const res = await db.query(
            "SELECT * FROM users WHERE username='testuser'");
        expect(res.rows.length).toEqual(0);
    });

    test("not found if no such user", async function () {
        try {
            await User.remove("nope");
            fail();
        } catch (err) {
            expect(err instanceof NotFoundError).toBeTruthy();
        }
    });

});
