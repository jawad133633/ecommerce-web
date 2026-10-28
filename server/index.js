require('dotenv').config();

const serverless = require('serverless-http');
const app = require('./app');
const connectDB = require('./config/db');

const handler = serverless(app);
let databaseConnection;

module.exports = async (req, res) => {
  try {
    if (!databaseConnection) {
      databaseConnection = connectDB().catch((error) => {
        databaseConnection = null;
        throw error;
      });
    }
    await databaseConnection;
    return handler(req, res);
  } catch (error) {
    console.error('Serverless request unavailable:', error.message);
    res.statusCode = 503;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Retry-After', '5');
    res.end(JSON.stringify({ success: false, message: 'Service temporarily unavailable. Please retry shortly.' }));
  }
};
