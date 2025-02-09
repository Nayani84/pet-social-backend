// server.js
const http = require('http');
const app = require('./app');
const socketConfig = require('./socket');
const server = http.createServer(app);
const { PORT } = require('./config');

// Initialize Socket.IO
socketConfig.init(server);

// Start the server
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
