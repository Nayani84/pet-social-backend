// socket.js
const { Server } = require("socket.io");
let io;

module.exports = {
    init: (server) => {
        if (!io) {
            io = new Server(server, {
                cors: {
                    origin: "*",  // Adjust as needed
                    methods: ["GET", "POST"]
                }
            });
        }
        return io;
    },
    getIO: () => {
        if (!io) {
            throw new Error("Socket.io not initialized!");
        }
        return io;
    }
};
