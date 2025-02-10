// socket.js
const { Server } = require("socket.io");
let io;

module.exports = {
    init: (server) => {
        if (!io) {
            io = new Server(server, {
                cors: {
                    origin: process.env.FRONTEND_URL || 'https://pet-social-frontend.onrender.com',
                    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
                    credentials: true
                }
            });

            // Handle connection events
            io.on("connection", (socket) => {

                // Event to join a notification room
                socket.on("join", (userId) => {
                    socket.join(`notifications_${userId}`);
                });

                // Disconnect event
                socket.on("disconnect", () => {
                });
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

