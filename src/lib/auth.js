import bcrypt from 'bcryptjs';
import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { MongoClient } from 'mongodb';
import { getServerSession } from 'next-auth/next';

// Authentication utilities for API routes
export const auth = {
  // Check if user is authenticated
  isAuthenticated: async (request) => {
    const session = await getServerSession(request, null, authOptions);
    return !!session?.user;
  },
  
  // Check if user has admin role
  isAdmin: async (request) => {
    const session = await getServerSession(request, null, authOptions);
    return session?.user?.role === 'ADMIN';
  },
  
  // Get current user information
  getCurrentUser: async (request) => {
    const session = await getServerSession(request, null, authOptions);
    return session?.user || null;
  }
};

// Auth configuration that can be used with NextAuth v4
export const authOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          console.log('Missing email or password');
          return null;
        }

        // Define test accounts for development/testing
        const testAccounts = {
          'admin@blocal.bt': { 
            password: 'admin123', 
            name: 'Admin User',
            role: 'ADMIN'
          },
          'seller1@blocal.bt': { 
            password: 'seller123', 
            name: 'Test Seller',
            role: 'SELLER'
          },
          'buyer1@blocal.bt': { 
            password: 'buyer123', 
            name: 'Test Buyer',
            role: 'BUYER'
          }
        };

        // Check if this is a test account
        if (testAccounts[credentials.email]) {
          const testAccount = testAccounts[credentials.email];
          
          // Verify password for test account
          if (credentials.password === testAccount.password) {
            console.log('Authenticated test account:', credentials.email);
            
            // Return a user object for the session
            return {
              id: credentials.email,
              email: credentials.email,
              name: testAccount.name,
              role: testAccount.role
            };
          } else {
            console.log('Invalid password for test account:', credentials.email);
            return null;
          }
        }
        
        // For non-test accounts, try to use the database
        try {
          // Get MongoDB URI from environment variables
          const uri = process.env.MONGODB_URI;
          if (!uri) {
            console.error('MONGODB_URI not found in environment variables');
            return null;
          }

          console.log('Connecting to MongoDB for authentication...');
          const client = new MongoClient(uri, {
            serverSelectionTimeoutMS: 30000,
            socketTimeoutMS: 30000,
            connectTimeoutMS: 30000
          });
          
          // Try to access the database, but handle it gracefully if it fails
          let user = null;
          try {
            // Connect to MongoDB
            await client.connect();
            console.log('Connected to MongoDB successfully for auth');
            
            // Get database and users collection
            const db = client.db();
            user = await db.collection('users').findOne({ email: credentials.email });
            
            // Close the connection
            await client.close();
            console.log('MongoDB connection closed after auth check');
          } catch (dbError) {
            console.error('Database error when finding user:', dbError);
            // Try to close the connection if it was opened
            try {
              await client.close();
            } catch (closeError) {
              console.error('Error closing MongoDB connection:', closeError);
            }
            return null;
          }

          if (!user) {
            console.log('User not found:', credentials.email);
            return null;
          }

          console.log('Attempting to verify password for:', credentials.email);
          
          // Try normal password verification
          const isPasswordCorrect = await bcrypt.compare(credentials.password, user.password);

          if (!isPasswordCorrect) {
            console.log('Invalid password for:', credentials.email);
            return null;
          }

          return {
            id: user._id.toString(),
            email: user.email,
            name: user.name,
            role: user.role
          };
        } catch (error) {
          console.error('Auth error:', error);
          return null;
        }
      }
    }),
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      // Initial sign in
      if (user) {
        token.id = user.id || user._id?.toString();
        token.email = user.email;
        token.name = user.name;
        token.role = (user.role || '').trim().toUpperCase();
        token.isActive = user.isActive !== false; // Default to active if not specified
      }
      return token;
    },
    async session({ session, token }) {
      // Send properties to the client
      if (token && session.user) {
        session.user.id = token.id;
        session.user.email = token.email;
        session.user.name = token.name;
        session.user.role = (token.role || '').trim().toUpperCase();
        session.user.isActive = token.isActive;
      }
      return session;
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/signin?error=CredentialsSignin',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  debug: process.env.NODE_ENV === 'development',
  secret: process.env.NEXTAUTH_SECRET || 'dev-secret',
};

// Create the auth handlers for Next.js App Router
export const handlers = NextAuth(authOptions);

// Helper function to get the server session
export async function getServerSession() {
  const request = new Request('http://localhost');
  const response = new Response();
  
  // Create a minimal request context
  const ctx = { req: request, res: response };
  
  return await handlers.session(ctx);
}