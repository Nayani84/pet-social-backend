const db = require("../db.js");
const bcrypt = require("bcrypt");
const { BCRYPT_WORK_FACTOR } = require("../config");

async function commonBeforeAll() {
  try {
    // Truncate all tables, resetting primary keys and cascading deletes.
    await db.query(`
      TRUNCATE TABLE comments, likes, events, pets, posts, users RESTART IDENTITY CASCADE;
    `);

    // Insert test user data
    await db.query(
      `
      INSERT INTO users (username, password, name, email, profile_pic, is_admin)
      VALUES 
      ('testuser', $1, 'Test User', 'testuser@example.com', 'profilepic.jpg', false),
      ('adminuser', $2, 'Admin User', 'admin@example.com', 'adminpic.jpg', true)
    `,
      [
        await bcrypt.hash("password1", BCRYPT_WORK_FACTOR),
        await bcrypt.hash("password2", BCRYPT_WORK_FACTOR),
      ]
    );

    // Insert test post data for users
    await db.query(
      `
      INSERT INTO posts (content, image_url, owner_id)
      VALUES
      ('Post 1 content', 'http://example.com/post1.jpg', (SELECT id FROM users WHERE username = 'testuser')),
      ('Post 2 content', 'http://example.com/post2.jpg', (SELECT id FROM users WHERE username = 'adminuser'))
    `
    );

    // Insert test pet data for users
    await db.query(
      `
      INSERT INTO pets (name, type, breed, age, bio, photo_url, owner_id)
      VALUES
      ('Fluffy', 'dog', 'Labrador', 3, 'A friendly dog', 'http://example.com/fluffy.jpg', (SELECT id FROM users WHERE username = 'testuser'))
    `
    );

    // Insert test comments for posts
    await db.query(
      `
      INSERT INTO comments (post_id, owner_id, content)
      VALUES
      ((SELECT id FROM posts WHERE content = 'Post 1 content'), (SELECT id FROM users WHERE username = 'testuser'), 'Great post!'),
      ((SELECT id FROM posts WHERE content = 'Post 2 content'), (SELECT id FROM users WHERE username = 'adminuser'), 'Nice content!')
    `
    );

    // Insert test likes for posts
    await db.query(
      `
      INSERT INTO likes (post_id, owner_id)
      VALUES
      ((SELECT id FROM posts WHERE content = 'Post 1 content'), (SELECT id FROM users WHERE username = 'testuser')),
      ((SELECT id FROM posts WHERE content = 'Post 2 content'), (SELECT id FROM users WHERE username = 'adminuser'))
    `
    );

    // Insert test events
    await db.query(
      `
      INSERT INTO events (title, description, location, date, start_time, end_time, created_by)
      VALUES
      ('Pet Adoption Event', 'Join us for a fun pet adoption event!', 'Central Park', '2025-02-25', '10:00:00', '14:00:00', (SELECT id FROM users WHERE username = 'adminuser')),
      ('Animal Charity Fundraiser', 'Fundraiser event for animal shelters.', 'City Hall', '2025-03-10', '12:00:00', '16:00:00', (SELECT id FROM users WHERE username = 'testuser'))
    `
    );
  } catch (err) {
    console.error("Failed during commonBeforeAll setup:", err);
  }
}

async function commonBeforeEach() {
  await db.query("BEGIN");
}

async function commonAfterEach() {
  await db.query("ROLLBACK");
}

async function commonAfterAll() {
  await db.end();
}

module.exports = {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
};
