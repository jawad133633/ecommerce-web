
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) throw new Error('MONGO_URI environment variable is required');

    if (mongoose.connection.readyState === 1) return;
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 10000,
      // Keep one bounded pool per process/serverless instance. The pool is
      // reused by warm function invocations rather than opened per request.
      maxPoolSize: Number(process.env.MONGO_MAX_POOL_SIZE) || 20,
      minPoolSize: 0,
      maxIdleTimeMS: 60000,
    });

    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection failed:', error.message);
    throw error;
  }
};

module.exports = connectDB;

