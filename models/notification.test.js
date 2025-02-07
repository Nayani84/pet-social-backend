"use strict";

const db = require("../db.js");
const Notification = require("./notification.js");
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
      "SELECT id FROM users WHERE username = 'testuser'"
    );
    const userId = userRes.rows[0].id;

    // Create a new notification
    const notification = await Notification.create({
      userId,
      type: "like",
      content: "Your post was liked.",
    });

    expect(notification).toEqual({
      id: expect.any(Number),
      user_id: userId,
      type: "like",
      content: "Your post was liked.",
      is_read: false,
      created_at: expect.any(Date),
    });

    const result = await db.query(
      "SELECT content FROM notifications WHERE id = $1",
      [notification.id]
    );
    expect(result.rows[0].content).toEqual("Your post was liked.");
  });

});

/************************************** getByUserId */

describe("getByUserId", function () {

  test("works: retrieves notifications for a valid user", async function () {
    const userRes = await db.query(
      "SELECT id FROM users WHERE username = 'testuser'"
    );
    const userId = userRes.rows[0].id;

    // Create two notifications for the same user
    await Notification.create({
      userId,
      type: "like",
      content: "Your post was liked.",
    });
    await Notification.create({
      userId,
      type: "comment",
      content: "You have a new comment.",
    });

    const notifications = await Notification.getByUserId(userId);

    expect(notifications).toHaveLength(2);
    expect(notifications).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "like",
          content: "Your post was liked.",
        }),
        expect.objectContaining({
          type: "comment",
          content: "You have a new comment.",
        }),
      ])
    );
  });

  test("works: returns an empty array if no notifications exist for the user", async function () {
    const userRes = await db.query(
      "SELECT id FROM users WHERE username = 'adminuser'"
    );
    const userId = userRes.rows[0].id;

    await db.query("DELETE FROM notifications WHERE user_id = $1", [userId]);

    const notifications = await Notification.getByUserId(userId);
    expect(notifications).toEqual([]);
  });

});

/************************************** markAsRead */

describe("markAsRead", function () {

  test("works: marks a notification as read", async function () {
    const userRes = await db.query(
      "SELECT id FROM users WHERE username = 'testuser'"
    );
    const userId = userRes.rows[0].id;

    // Create a notification
    const notification = await Notification.create({
      userId,
      type: "like",
      content: "Your post was liked.",
    });
    expect(notification.is_read).toBe(false);

    // Mark the notification as read
    const updatedNotification = await Notification.markAsRead(
      notification.id
    );
    expect(updatedNotification).toEqual({
      id: notification.id,
      user_id: userId,
      type: "like",
      content: "Your post was liked.",
      is_read: true,
      created_at: expect.any(Date),
    });
  });

  test("fails: throws error if notification does not exist", async function () {
    try {
      await Notification.markAsRead(99999);
      fail();
    } catch (err) {
      expect(err.message).toEqual("Notification not found");
    }
  });

});

