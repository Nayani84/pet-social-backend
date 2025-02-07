"use strict";

const db = require("../db");
const { BadRequestError, NotFoundError } = require("../expressError");
const Pet = require("./pet");
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
        const ownerRes = await db.query(
            "SELECT id FROM users WHERE username = 'testuser'"
        );

        if (ownerRes.rows.length === 0) {
            throw new Error("Test user not found in database");
        }

        const ownerId = ownerRes.rows[0].id;

        const newPet = {
            name: "Buddy",
            type: "Dog",
            breed: "Golden Retriever",
            age: 3,
            bio: "Friendly and playful",
            photoUrl: "http://example.com/photo.jpg",
            ownerId: ownerId,
        };

        // Create the pet
        let pet = await Pet.create(newPet);

        expect(pet).toEqual({
            id: expect.any(Number),
            name: "Buddy",
            type: "Dog",
            breed: "Golden Retriever",
            age: 3,
            bio: "Friendly and playful",
            photoUrl: "http://example.com/photo.jpg",
            ownerId: ownerId,
        });

        const result = await db.query(
            `SELECT name, type, breed, age, bio, photo_url
             FROM pets
             WHERE name = $1 AND owner_id = $2`,
            ["Buddy", ownerId]
        );

        expect(result.rows).toEqual([
            {
                name: "Buddy",
                type: "Dog",
                breed: "Golden Retriever",
                age: 3,
                bio: "Friendly and playful",
                photo_url: "http://example.com/photo.jpg",
            },
        ]);
    });

});


/************************************** findAll */

describe("findAll", function () {

    test("works: all", async function () {
        const pets = await Pet.findAll();
        expect(pets.length).toBeGreaterThan(0);

    });

    test("works: by type", async function () {
        let pets = await Pet.findAll({ type: "dog" });
        expect(pets).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    type: "dog",
                }),
            ])
        );
    });

    test("works: by breed", async function () {
        let pets = await Pet.findAll({ breed: "Labrador" });
        expect(pets).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    breed: "Labrador",
                }),
            ])
        );
    });

    test("works: by name", async function () {
        let pets = await Pet.findAll({ name: "Fluffy" });
        expect(pets).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    name: "Fluffy",
                }),
            ])
        );
    });

    test("works: empty list on no match", async function () {
        await db.query("DELETE FROM pets");
        let pets = await Pet.findAll({ name: "Nonexistent Pet" });
        expect(pets).toEqual([]);
    });

});


/************************************** get */

describe("get", function () {

    test("works", async function () {
        const ownerRes = await db.query(
            "SELECT id FROM users WHERE username = 'testuser'"
        );
        const ownerId = ownerRes.rows[0].id;

        const newPet = {
            name: "Buddy",
            type: "Dog",
            breed: "Golden Retriever",
            age: 3,
            bio: "Friendly and playful",
            photoUrl: "http://example.com/photo.jpg",
            ownerId: ownerId,
        };

        // Create the pet
        let pet = await Pet.create(newPet);

        expect(pet).toEqual({
            id: expect.any(Number),
            name: "Buddy",
            type: "Dog",
            breed: "Golden Retriever",
            age: 3,
            bio: "Friendly and playful",
            photoUrl: "http://example.com/photo.jpg",
            ownerId: ownerId,
        });

        const result = await db.query(
            `SELECT name, type, breed, age, bio, photo_url
         FROM pets
         WHERE name = 'Buddy' AND owner_id = $1`,
            [ownerId]
        );
        expect(result.rows).toEqual([
            {
                name: "Buddy",
                type: "Dog",
                breed: "Golden Retriever",
                age: 3,
                bio: "Friendly and playful",
                photo_url: "http://example.com/photo.jpg",
            },
        ]);
    });

});


/************************************** update */

describe("update", function () {

    test("works", async function () {
        const ownerRes = await db.query(
            "SELECT id FROM users WHERE username = 'testuser'"
        );

        if (ownerRes.rows.length === 0) {
            throw new Error("Test user not found in database");
        }

        const ownerId = ownerRes.rows[0].id;

        // Create a new pet for testing the update
        const pet = await Pet.create({
            name: "Buddy",
            type: "Dog",
            breed: "Golden Retriever",
            age: 3,
            bio: "Friendly and playful",
            photoUrl: "http://example.com/photo.jpg",
            ownerId: ownerId,
        });

        const updateData = {
            name: "Updated Buddy",
            breed: "Labrador Retriever",
            age: 4,
            bio: "Loyal and playful",
            photoUrl: "http://example.com/updated-photo.jpg",
        };

        const updatedPet = await Pet.update(pet.id, updateData);

        expect(updatedPet).toEqual({
            id: pet.id,
            name: "Updated Buddy",
            type: "Dog",
            breed: "Labrador Retriever",
            age: 4,
            bio: "Loyal and playful",
            photoUrl: "http://example.com/updated-photo.jpg",
            ownerId: ownerId,
        });

        const result = await db.query(
            `SELECT name, breed, age, bio, photo_url
             FROM pets
             WHERE id = $1`,
            [pet.id]
        );

        expect(result.rows).toEqual([
            {
                name: "Updated Buddy",
                breed: "Labrador Retriever",
                age: 4,
                bio: "Loyal and playful",
                photo_url: "http://example.com/updated-photo.jpg",
            },
        ]);
    });

});


/************************************** remove */

describe("remove", function () {

    test("works", async function () {
        const ownerRes = await db.query(
            "SELECT id FROM users WHERE username = 'testuser'"
        );

        if (ownerRes.rows.length === 0) {
            throw new Error("Test user not found in database");
        }

        const ownerId = ownerRes.rows[0].id;

        // Create a new pet for testing the remove function
        const pet = await Pet.create({
            name: "Buddy",
            type: "Dog",
            breed: "Golden Retriever",
            age: 3,
            bio: "Friendly and playful",
            photoUrl: "http://example.com/photo.jpg",
            ownerId: ownerId,
        });

        // Remove the pet
        await Pet.remove(pet.id);

        const res = await db.query(
            "SELECT id FROM pets WHERE id = $1",
            [pet.id]
        );
        expect(res.rows.length).toEqual(0);
    });

});
