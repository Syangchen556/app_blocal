import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { connectDB } from '@/lib/mongodb';

// GET /api/wishlist - Get user's wishlist
export async function GET(req) {
  try {
    // Authenticate user
    const session = await getServerSession(req, null, authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Connect to database
    const db = await connectDB();
    const userId = session.user.id;
    
    // Fetch wishlist
    const wishlist = await db.collection('wishlists').findOne({ userId });
    
    // Return wishlist data
    return NextResponse.json({ 
      items: wishlist?.items || [],
      _id: wishlist?._id || null
    });
  } catch (error) {
    console.error('Error in GET /api/wishlist:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST /api/wishlist - Add/remove from wishlist
export async function POST(req) {
  try {
    // Authenticate user
    const session = await getServerSession(req, null, authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body safely
    let body;
    try {
      body = await req.json();
    } catch (e) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const { productId, action } = body;
    
    // Validate input
    if (!productId) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
    }
    
    if (!action || (action !== 'add' && action !== 'remove')) {
      return NextResponse.json({ error: 'Valid action (add/remove) is required' }, { status: 400 });
    }

    // Connect to database
    const db = await connectDB();
    const userId = session.user.id;
    
    // Get or create wishlist
    let wishlist = await db.collection('wishlists').findOne({ userId });
    
    if (!wishlist) {
      // Create empty wishlist if it doesn't exist
      const result = await db.collection('wishlists').insertOne({
        userId,
        items: []
      });
      wishlist = { _id: result.insertedId, userId, items: [] };
    }

    // Ensure items array exists
    if (!wishlist.items) {
      wishlist.items = [];
    }

    if (action === 'add') {
      // Check if item already exists
      const existingItem = wishlist.items.find(item => item.productId === productId);
      
      if (!existingItem) {
        // Add to wishlist
        await db.collection('wishlists').updateOne(
          { userId },
          { $push: { items: { productId, addedAt: new Date() } } }
        );
      }
      
      return NextResponse.json({ 
        message: 'Product added to wishlist',
        success: true
      });
    } else {
      // Remove from wishlist
      await db.collection('wishlists').updateOne(
        { userId },
        { $pull: { items: { productId } } }
      );
      
      return NextResponse.json({ 
        message: 'Product removed from wishlist',
        success: true
      });
    }
  } catch (error) {
    console.error('Error in POST /api/wishlist:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
