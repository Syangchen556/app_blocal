import { NextResponse } from 'next/server';

import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import Contact from '@/models/Contact';

export async function GET(request) {
  try {
    await connectDB();

    const contacts = await Contact.find()
      .sort({ createdAt: -1 })
      .populate('user', 'name email');

    return NextResponse.json({ contacts });
  } catch (error) {
    console.error('Error fetching contacts:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 