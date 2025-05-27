import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { connectDB } from '@/lib/mongodb';

// GET /api/cart - Get user's cart
export async function GET(request) {
  try {
    const session = await getServerSession(request, null, authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
      const db = await connectDB();
      
      // Handle both ObjectId and email-based user IDs
      let userId = session.user.id;
      
      const cart = await db.collection('carts').findOne({ userId: userId });
  
      return NextResponse.json({ items: cart?.items || [] });
    } catch (dbError) {
      console.error('Database error in GET /api/cart:', dbError);
      return NextResponse.json({ 
        error: 'Database connection error', 
        details: dbError.message 
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error in GET /api/cart:', error);
    return NextResponse.json({ 
      error: 'Internal Server Error', 
      details: error.message 
    }, { status: 500 });
  }
}

// POST /api/cart - Add item to cart
export async function POST(request) {
  try {
    const session = await getServerSession(request, null, authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
      // Use .json() with a try/catch to handle potential JSON parsing errors
      const requestData = await request.json().catch(error => {
        console.error('Error parsing JSON:', error);
        return {};
      });
      
      const { productId, quantity } = requestData;
      const productDetails = requestData.product || {};
      
      if (!productId || !quantity) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
      }
  
      const db = await connectDB();
      
      // Handle both ObjectId and email-based user IDs
      let userId = session.user.id;
      
      // Find or create cart
      let cart = await db.collection('carts').findOne({ userId: userId });
  
      if (!cart) {
        // Create new cart
        await db.collection('carts').insertOne({
          userId: userId,
          items: [{ productId, quantity, product: productDetails }],
        });
      } else {
        // Ensure items array exists
        if (!cart.items) {
          cart.items = [];
        }
        
        const existingItem = cart.items.find(item => item.productId === productId);
  
        if (existingItem) {
          // Update quantity and product details
          await db.collection('carts').updateOne(
            { userId: userId, 'items.productId': productId },
            { 
              $set: { 
                'items.$.quantity': existingItem.quantity + quantity,
                'items.$.product': productDetails
              } 
            }
          );
        } else {
          // Add item
          await db.collection('carts').updateOne(
            { userId: userId },
            { $push: { items: { productId, quantity, product: productDetails } } }
          );
        }
      }
  
      return NextResponse.json({ message: 'Cart updated successfully' });
    } catch (dbError) {
      console.error('Database error in POST /api/cart:', dbError);
      return NextResponse.json({ 
        error: 'Database error', 
        details: dbError.message 
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error in POST /api/cart:', error);
    return NextResponse.json({ 
      error: 'Internal Server Error',
      details: error.message
    }, { status: 500 });
  }
}

// PUT /api/cart - Update item quantity
export async function PUT(request) {
  try {
    const session = await getServerSession(request, null, authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
      // Use .json() with a try/catch to handle potential JSON parsing errors
      const body = await request.json().catch(error => {
        console.error('Error parsing JSON:', error);
        return {};
      });
      
      const { productId, quantity } = body;
      
      if (!productId || !quantity) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
      }
  
      const db = await connectDB();
      
      // Handle both ObjectId and email-based user IDs
      let userId = session.user.id;
      
      await db.collection('carts').updateOne(
        { userId: userId, 'items.productId': productId },
        { $set: { 'items.$.quantity': quantity } }
      );
  
      return NextResponse.json({ message: 'Cart updated successfully' });
    } catch (dbError) {
      console.error('Database error in PUT /api/cart:', dbError);
      return NextResponse.json({ 
        error: 'Database error', 
        details: dbError.message 
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error in PUT /api/cart:', error);
    return NextResponse.json({ 
      error: 'Internal Server Error',
      details: error.message
    }, { status: 500 });
  }
}

// DELETE /api/cart - Clear cart or remove item
export async function DELETE(request) {
  try {
    const session = await getServerSession(request, null, authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
      // For DELETE requests, we need to carefully handle the body
      let data = {};
      try {
        data = await request.json();
      } catch (error) {
        // If there's no body or it can't be parsed, use empty object
        console.log('No body in DELETE request or parsing error');
      }
      
      const { productId } = data;
      
      const db = await connectDB();
      
      // Handle both ObjectId and email-based user IDs
      let userId = session.user.id;
  
      if (productId) {
        // Remove specific item
        await db.collection('carts').updateOne(
          { userId: userId },
          { $pull: { items: { productId } } }
        );
      } else {
        // Clear cart
        await db.collection('carts').deleteOne({ userId: userId });
      }
  
      return NextResponse.json({ message: 'Cart updated successfully' });
    } catch (dbError) {
      console.error('Database error in DELETE /api/cart:', dbError);
      return NextResponse.json({ 
        error: 'Database error', 
        details: dbError.message 
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error in DELETE /api/cart:', error);
    return NextResponse.json({ 
      error: 'Internal Server Error',
      details: error.message
    }, { status: 500 });
  }
}
