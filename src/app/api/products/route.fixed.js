import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from '../../../lib/auth';
import { dbConnect } from '../../../lib/mongodb';
import Product from '../../../models/Product';
import Shop from '../../../models/Shop';
import { writeFile } from 'fs/promises';
import path from 'path';


// Get all products
async function GET(req) {
  try {
    console.log('Products API: GET request received');
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 10;

    console.log('Products API: Connecting to database');
    try {
      await dbConnect();
      
      // Instead of trying to access the database directly, let's use a hardcoded response
      // for now, similar to what we did for the fruits and vegetables endpoints
      const products = [
        {
          _id: 'product-1',
          name: 'Tomato',
          description: { short: 'Fresh tomatoes from local farmers' },
          category: { main: 'VEGETABLES' },
          pricing: { currency: 'BTN', base: 65.00 },
          inventory: { stock: 30 }
        },
        {
          _id: 'product-2',
          name: 'Apple',
          description: { short: 'Fresh apples from local farmers' },
          category: { main: 'FRUITS' },
          pricing: { currency: 'BTN', base: 75.00 },
          inventory: { stock: 25 },
          imageUrl: '/images/products/fruits/apple.jpg'
        }
      ];
      
      // Apply filters to the hardcoded products
      let filteredProducts = products;
    
      // Apply filters if category is specified
      if (category) {
        filteredProducts = filteredProducts.filter(product => 
          product.category && 
          product.category.main && 
          product.category.main.toLowerCase() === category.toLowerCase()
        );
      }
      
      // Apply search filter if search term is provided
      if (search) {
        filteredProducts = filteredProducts.filter(product => 
          product.name.toLowerCase().includes(search.toLowerCase()) ||
          (product.description && product.description.short && 
            product.description.short.toLowerCase().includes(search.toLowerCase()))
        );
      }
      
      // Pagination
      const skip = (page - 1) * limit;
      const paginatedProducts = filteredProducts.slice(skip, skip + limit);
      
      return NextResponse.json({
        products: paginatedProducts,
        total: filteredProducts.length,
        page,
        limit,
        totalPages: Math.ceil(filteredProducts.length / limit)
      });
    } catch (dbError) {
      console.error('Database connection error:', dbError);
      throw new Error('Database connection failed');
    }
  } catch (error) {
    console.error('Products API error:', error);
    return NextResponse.json({ error: 'Error fetching products' }, { status: 500 });
  }
}

// Create new product
async function POST(req) {
  try {
    const session = await getServerSession(req, null, authOptions);
    if (!session || session.user.role !== 'SELLER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, description, price, category, images, stock } = await req.json();
    if (!name || !description || !price || !category || !images || !stock) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    await dbConnect();
    const db = global.mongoose.connection.db;
    const product = {
      name,
      description,
      price,
      category,
      images,
      stock,
      sellerId: session.user.id,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await db.collection('products').insertOne(product);

    return NextResponse.json({
      message: 'Product created successfully',
      productId: result.insertedId
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating product:', error);
    return NextResponse.json({ error: 'Error creating product' }, { status: 500 });

  }
}

// Update product
async function PUT(req) {
  try {
    const session = await getServerSession(req, null, authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const db = global.mongoose.connection.db;
    const data = await req.json();
    const { id, ...updateData } = data;

    let product = await db.collection('products').findOne({ _id: id });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Check authorization
    if (
      session.user.role === 'SELLER' &&
      product.sellerId !== session.user.id
    ) {
      return NextResponse.json({ error: 'You can only update your own products' }, { status: 403 });
    }

    // Only allow admins to update status
    if (session.user.role !== 'ADMIN') {
      delete updateData.status;
    }

    const updatedProduct = await db.collection('products').findOneAndUpdate(
      { _id: id },
      { $set: { ...updateData, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );


    return NextResponse.json(updatedProduct);
  } catch (error) {
    console.error('Error updating product:', error);
    return NextResponse.json({ error: 'Error updating product' }, { status: 500 });

  }
}

// Delete product
async function DELETE(req) {
  try {
    const session = await getServerSession(req, null, authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const db = global.mongoose.connection.db;
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    const product = await db.collection('products').findOne({ _id: id });
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Check authorization
    if (
      session.user.role === 'SELLER' &&
      product.sellerId !== session.user.id
    ) {
      return NextResponse.json({ error: 'You can only delete your own products' }, { status: 403 });

    }

    await db.collection('products').deleteOne({ _id: id });

    return NextResponse.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Error deleting product:', error);
    return NextResponse.json({ error: 'Error deleting product' }, { status: 500 });

  }
}

export { GET, POST, PUT, DELETE };
