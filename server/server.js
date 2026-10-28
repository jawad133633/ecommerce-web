
require('dotenv').config();

const app = require('./app');
const connectDB = require('./config/db');

const startServer = async () => {
  await connectDB();
  const port = process.env.PORT || 5000;
  const server = app.listen(port, () => console.log(`Server running on http://localhost:${port}`));
  server.keepAliveTimeout = 65000;
  server.headersTimeout = 66000;
};
startServer().catch((error) => {
  console.error('Server startup failed:', error.message);
  process.exitCode = 1;
});

