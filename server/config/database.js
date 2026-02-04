/**
 * Database Configuration
 * MongoDB connection setup with Mongoose
 * Includes connection pooling, error handling, and reconnection logic
 */

const mongoose = require('mongoose');

// Connection options for production-ready MongoDB connection
const connectionOptions = {
  maxPoolSize: 10, // Maintain up to 10 socket connections
  serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
  socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
  family: 4, // Use IPv4, skip trying IPv6
};

/**
 * Connect to MongoDB database
 * @returns {Promise<typeof mongoose>} Mongoose connection instance
 */
const connectDatabase = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/saramart-referral';
    
    if (!mongoUri) {
      throw new Error('MONGODB_URI environment variable is not defined');
    }

    // Connect to MongoDB
    const conn = await mongoose.connect(mongoUri, connectionOptions);

    console.log(`MongoDB Connected: ${conn.connection.host}:${conn.connection.port}/${conn.connection.name}`);
    
    return conn;
  } catch (error) {
    console.error('MongoDB Connection Error:', error.message);
    process.exit(1);
  }
};

/**
 * Disconnect from MongoDB database
 * Used for graceful shutdown
 */
const disconnectDatabase = async () => {
  try {
    await mongoose.connection.close();
    console.log('MongoDB Disconnected');
  } catch (error) {
    console.error('MongoDB Disconnection Error:', error.message);
    process.exit(1);
  }
};

/**
 * Check if database connection is healthy
 * @returns {boolean} Connection status
 */
const isDatabaseConnected = () => {
  return mongoose.connection.readyState === 1; // 1 = connected
};

/**
 * Get database connection stats
 * @returns {Object} Connection statistics
 */
const getConnectionStats = () => {
  return {
    readyState: mongoose.connection.readyState,
    host: mongoose.connection.host,
    port: mongoose.connection.port,
    name: mongoose.connection.name,
    models: Object.keys(mongoose.models),
  };
};

// Handle connection events
mongoose.connection.on('connected', () => {
  console.log('Mongoose connected to database');
});

mongoose.connection.on('error', (err) => {
  console.error('Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('Mongoose disconnected from database');
});

// Handle process termination - graceful shutdown
process.on('SIGINT', async () => {
  await disconnectDatabase();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await disconnectDatabase();
  process.exit(0);
});

module.exports = mongoose;
