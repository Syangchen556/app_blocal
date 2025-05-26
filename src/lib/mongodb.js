// lib/mongodb.js
import { MongoClient } from "mongodb";
import mongoose from 'mongoose';

// Get MongoDB URI from environment variables
let uri;
try {
  // Make sure we're getting the environment variable correctly
  uri = process.env.MONGODB_URI;
  
  // Log the first part of the URI for debugging (hiding credentials)
  if (uri) {
    console.log('MongoDB URI found in environment:', uri.substring(0, 20) + '...');
  } else {
    console.warn('MONGODB_URI not found in environment, using fallback');
    uri = "mongodb://localhost:27017/blocal";
  }
} catch (error) {
  console.error('Error accessing MONGODB_URI:', error);
  uri = "mongodb://localhost:27017/blocal";
}

const options = {
  serverSelectionTimeoutMS: 30000, // Increase timeout to 30 seconds
  socketTimeoutMS: 30000,
  connectTimeoutMS: 30000
};

let client;
let clientPromise;

if (!uri) {
  throw new Error("MongoDB URI is required. Please check your .env.local file");
}

console.log('Using MongoDB URI starting with:', uri.substring(0, 15) + '...');

// MongoDB client for NextAuth and direct MongoDB operations
if (!global._mongoClientPromise) {
  try {
    console.log('Initializing MongoDB client connection...');
    client = new MongoClient(uri, options);
    global._mongoClientPromise = client.connect()
      .then((client) => {
        console.log('MongoDB client connected successfully');
        return client;
      })
      .catch((err) => {
        console.error('MongoDB client connection error:', err);
        // Reset the promise so we can try again next time
        global._mongoClientPromise = null;
        throw err;
      });
  } catch (err) {
    console.error('Error creating MongoDB client:', err);
    throw new Error(`Failed to create MongoDB client: ${err.message}`);
  }
}

clientPromise = global._mongoClientPromise;

// Mongoose connection for models
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function dbConnect() {
  try {
    if (cached.conn) {
      console.log('Using existing mongoose connection');
      return cached.conn;
    }

    if (!cached.promise) {
      console.log('Creating new mongoose connection...');
      cached.promise = mongoose.connect(uri, {
        serverSelectionTimeoutMS: 30000,
        socketTimeoutMS: 30000,
        connectTimeoutMS: 30000,
        bufferCommands: false, // Disable buffering to prevent timeout issues
      }).then(mongoose => {
        console.log('MongoDB connected successfully via Mongoose');
        return mongoose;
      }).catch(err => {
        console.error('Mongoose connection error:', err);
        cached.promise = null; // Reset the promise on error
        throw err;
      });
    }
    
    cached.conn = await cached.promise;
    return cached.conn;
  } catch (error) {
    console.error('Error in dbConnect:', error);
    throw new Error(`Database connection failed: ${error.message}`);
  }
}

// Connect to MongoDB using the MongoDB client
export async function connectDB() {
  try {
    console.log('Connecting to MongoDB via client...');
    const client = await clientPromise;
    const db = client.db(); // defaults to the database in your URI
    console.log('Successfully connected to MongoDB database');
    return db;
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    throw new Error(`Failed to connect to MongoDB: ${error.message}`);
  }
}

// Connect to MongoDB using Mongoose
export { dbConnect };

// Export the clientPromise for NextAuth
export { clientPromise };
