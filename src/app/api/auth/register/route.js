// app/api/auth/register/route.js
import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';
import bcrypt from 'bcryptjs';

export async function POST(req) {
  try {
    const { name, email, password, role } = await req.json();
    console.log('Registration attempt for:', email, 'with role:', role);

    if (!name || !email || !password) {
      console.log('Missing required fields');
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get MongoDB URI from environment variables
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      console.error('MONGODB_URI not found in environment variables');
      return NextResponse.json({ error: 'Database configuration missing' }, { status: 500 });
    }

    console.log('Connecting to MongoDB...');
    const client = new MongoClient(uri, {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 30000,
      connectTimeoutMS: 30000
    });

    try {
      // Connect to MongoDB
      await client.connect();
      console.log('Connected to MongoDB successfully');
      
      // Get database and users collection
      const db = client.db();
      const usersCollection = db.collection('users');
      
      // Check if user already exists
      const existingUser = await usersCollection.findOne({ email });
      if (existingUser) {
        console.log('User already exists:', email);
        await client.close();
        return NextResponse.json({ error: 'User already exists' }, { status: 400 });
      }
      
      console.log('No existing user found, proceeding with registration');
      
      // Hash password
      console.log('Hashing password...');
      const hashedPassword = await bcrypt.hash(password, 10);

      // Use the provided role or default to BUYER if not specified
      const userRole = role ? role.toUpperCase() : 'BUYER';
      console.log('Setting user role to:', userRole);
      
      // Create user object
      const user = {
        name,
        email,
        password: hashedPassword,
        role: userRole,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Insert user into database
      console.log('Inserting user into database...');
      const result = await usersCollection.insertOne(user);
      
      console.log('User inserted successfully:', result.insertedId);
      
      // Close the connection
      await client.close();
      console.log('MongoDB connection closed');
      
      return NextResponse.json({ 
        message: 'User created successfully', 
        userId: result.insertedId.toString() 
      }, { status: 201 });
    } catch (dbError) {
      console.error('Database operation error:', dbError);
      
      // Make sure to close the connection in case of error
      try {
        await client.close();
        console.log('MongoDB connection closed after error');
      } catch (closeError) {
        console.error('Error closing MongoDB connection:', closeError);
      }
      
      return NextResponse.json({ error: 'Database operation failed' }, { status: 500 });
    }
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
  }
}
