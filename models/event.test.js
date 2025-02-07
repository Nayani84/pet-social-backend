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

const db = require("../db");
const { BadRequestError, NotFoundError } = require("../expressError");
const Event = require("./event");
// const moment = require('moment');
const moment = require('moment-timezone');
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
        const createdBy = userRes.rows[0].id;

        const newEvent = {
            title: "Pet Adoption Event",
            description: "Join us for a fun pet adoption event!",
            location: "Central Park",
            date: "2025-02-25",
            startTime: "10:00 AM",
            endTime: "2:00 PM",
            createdBy,

        };

        const event = await Event.create(newEvent);

        expect(event).toEqual({
            id: expect.any(Number),
            title: "Pet Adoption Event",
            description: "Join us for a fun pet adoption event!",
            location: "Central Park",
            date: "2025-02-25",
            startTime: "10:00:00",
            endTime: "14:00:00",
            createdBy,
            lat: null,
            lng: null,
        });

        const result = await db.query(
            `SELECT id, title, description, location, TO_CHAR(date, 'YYYY-MM-DD') AS date, start_time, end_time, created_by
             FROM events
             WHERE id = $1`,
            [event.id]
        );

        expect(result.rows[0]).toEqual({
            id: event.id,
            title: "Pet Adoption Event",
            description: "Join us for a fun pet adoption event!",
            location: "Central Park",
            date: "2025-02-25",
            start_time: "10:00:00",
            end_time: "14:00:00",
            created_by: createdBy,
        });
    });

});

/************************************** findAll */

describe("findAll", function () {

    test("works: no filters", async function () {
        const events = await Event.findAll();
        expect(events).toEqual([
            {
                id: expect.any(Number),
                title: "Pet Adoption Event",
                description: "Join us for a fun pet adoption event!",
                location: "Central Park",
                date: "2025-02-25",
                startTime: "10:00",
                endTime: "14:00",
                createdBy: expect.any(Number),
                lat: null,
                lng: null,
            },
            {
                id: expect.any(Number),
                title: "Animal Charity Fundraiser",
                description: "Fundraiser event for animal shelters.",
                location: "City Hall",
                date: "2025-03-10",
                startTime: "12:00",
                endTime: "16:00",
                createdBy: expect.any(Number),
                lat: null,
                lng: null,
            },
        ]);
    });

    test("works: filter by title", async function () {
        const events = await Event.findAll({ title: "Pet Adoption Event", option: "1" });
        expect(events.length).toEqual(1);
        expect(events[0].title).toEqual("Pet Adoption Event");
    });

    test("works: filter by createdBy", async function () {
        const userRes = await db.query(
            `SELECT id FROM users WHERE username = 'testuser'`
        );
        const createdBy = userRes.rows[0].id;

        const events = await Event.findAll({ createdBy });
        expect(events.every((e) => e.createdBy === createdBy)).toBeTruthy();
    });

    test("works: filter by date range", async function () {
        const events = await Event.findAll({ startDate: "2025-02-01", endDate: "2025-03-01" });
        expect(events.length).toEqual(1);
        expect(events[0].title).toEqual("Pet Adoption Event");
    });

});

/************************************** get */

describe("get", function () {

    test("works", async function () {
        const events = await Event.findAll();
        const eventId = events[0].id;

        const event = await Event.get(eventId);
        expect(event).toEqual({
            id: eventId,
            title: "Pet Adoption Event",
            description: "Join us for a fun pet adoption event!",
            location: "Central Park",
            date: "2025-02-25",
            startTime: "10:00",
            endTime: "14:00",
            createdBy: expect.any(Number),
        });
    });

    test("not found if no such event", async function () {
        try {
            await Event.get(0);
            fail();
        } catch (err) {
            expect(err instanceof NotFoundError).toBeTruthy();
        }
    });

});

/************************************** update */

describe("update", function () {

    const updateData = {
        title: "Updated Event Title",
        description: "Updated event description",
        location: "Updated Location",
        date: "2025-03-15",
        startTime: "11:00 AM",
        endTime: "3:00 PM",
    };

    test("works", async function () {
        const events = await Event.findAll();
        const eventId = events[0].id;

        const event = await Event.update(eventId, updateData);
        expect(event).toEqual({
            id: eventId,
            title: "Updated Event Title",
            description: "Updated event description",
            location: "Updated Location",
            date: "2025-03-15",
            startTime: "11:00:00",
            endTime: "15:00:00",
            createdBy: expect.any(Number),
        });

        const result = await db.query(
            `SELECT title, description, location, TO_CHAR(date, 'YYYY-MM-DD') AS date, start_time, end_time
             FROM events
             WHERE id = $1`,
            [eventId]
        );
        expect(result.rows[0]).toEqual({
            title: "Updated Event Title",
            description: "Updated event description",
            location: "Updated Location",
            date: "2025-03-15",
            start_time: "11:00:00",
            end_time: "15:00:00",
        });
    });

    test("not found if no such event", async function () {
        try {
            await Event.update(0, updateData);
            fail();
        } catch (err) {
            expect(err instanceof NotFoundError).toBeTruthy();
        }
    });

});

/************************************** remove */

describe("remove", function () {

    test("works", async function () {
        const events = await Event.findAll();
        const eventId = events[0].id;

        await Event.remove(eventId);

        const result = await db.query(
            `SELECT id
             FROM events
             WHERE id = $1`,
            [eventId]
        );
        expect(result.rows.length).toEqual(0);
    });

    test("not found if no such event", async function () {
        try {
            await Event.remove(0);
            fail();
        } catch (err) {
            expect(err instanceof NotFoundError).toBeTruthy();
        }
    });

});
