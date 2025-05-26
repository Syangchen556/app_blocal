// test-db-connection.js
require('dotenv').config({ path: './.env.local' });
const { MongoClient } = require('mongodb');

// Get the MongoDB URI from environment variables
const uri = process.env.MONGODB_URI;
console.log('MongoDB URI (first 20 chars):', uri ? uri.substring(0, 20) + '...' : 'Not found');

async function testConnection() {
  console.log('Testing MongoDB connection...');
  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 30000,
    socketTimeoutMS: 30000,
    connectTimeoutMS: 30000
  });

  try {
    console.log('Connecting to MongoDB...');
    await client.connect();
    console.log('Successfully connected to MongoDB');
    
    // Test database access
    const db = client.db();
    console.log('Database name:', db.databaseName);
    
    // List collections
    const collections = await db.listCollections().toArray();
    console.log('Collections:', collections.map(c => c.name));
    
    // Close the connection
    await client.close();
    console.log('Connection closed');
    return true;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    return false;
  }
}

// Run the test
testConnection()
  .then(success => {
    console.log('Connection test result:', success ? 'SUCCESS' : 'FAILED');
    process.exit(success ? 0 : 1);
  })
  .catch(err => {
    console.error('Unexpected error:', err);
    process.exit(1);
  });
