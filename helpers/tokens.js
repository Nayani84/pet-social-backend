const jwt = require("jsonwebtoken");
const { SECRET_KEY } = require("../config");

/** return signed JWT from user data. */

function createToken(user) {

  console.assert(user.id !== undefined, "createToken passed user without id property");
  console.assert(user.isAdmin !== undefined,
    "createToken passed user without isAdmin property");

  if (user) {
    let payload = {
      id: user.id,
      username: user.username,
      isAdmin: user.isAdmin || false,
    };

    return jwt.sign(payload, SECRET_KEY);
  } else {
    return null;
  }
}


module.exports = { createToken };
