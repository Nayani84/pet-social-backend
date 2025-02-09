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
                console.log("A user connected:", socket.id);

                // Event to join a notification room
                socket.on("join", (userId) => {
                    console.log(`User ${userId} joined notifications room`);
                    socket.join(`notifications_${userId}`);
                });

                // Disconnect event
                socket.on("disconnect", () => {
                    console.log("A user disconnected:", socket.id);
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

