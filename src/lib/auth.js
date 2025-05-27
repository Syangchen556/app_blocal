import bcrypt from 'bcryptjs';
import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { MongoClient } from 'mongodb';
import { getServerSession } from 'next-auth/next';

export const auth = {
  isAuthenticated: async (request) => {
    const session = await getServerSession(request, null, authOptions);
    return !!session?.user;
  },
  
  isAdmin: async (request) => {
    const session = await getServerSession(request, null, authOptions);
    return session?.user?.role === 'ADMIN';
  },
  
  getCurrentUser: async (request) => {
    const session = await getServerSession(request, null, authOptions);
    return session?.user || null;
  }
};

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

        if (testAccounts[credentials.email]) {
          const testAccount = testAccounts[credentials.email];
          
          if (credentials.password === testAccount.password) {
            console.log('Authenticated test account:', credentials.email);
            
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
        
        try {
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
          
          let user = null;
          try {
            await client.connect();
            console.log('Connected to MongoDB successfully for auth');
            
            const db = client.db();
            user = await db.collection('users').findOne({ email: credentials.email });
            
            await client.close();
            console.log('MongoDB connection closed after auth check');
          } catch (dbError) {
            console.error('Database error when finding user:', dbError);
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
      if (user) {
        token.id = user.id || user._id?.toString();
        token.email = user.email;
        token.name = user.name;
        token.role = (user.role || '').trim().toUpperCase();
        token.isActive = user.isActive !== false;
      }
      return token;
    },
    async session({ session, token }) {
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

export const handlers = NextAuth(authOptions);

// Helper function to get the server session
export async function getServerSession() {
  const request = new Request('http://localhost');
  const response = new Response();
  
  // Create a minimal request context
  const ctx = { req: request, res: response };
  
  return await handlers.session(ctx);
}