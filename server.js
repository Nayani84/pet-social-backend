// server.js
const http = require('http');
const app = require('./app');
const socketConfig = require('./socket');
const server = http.createServer(app);
const { PORT } = require('./config');

socketConfig.init(server);  // Initialize socket.io with the server

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
