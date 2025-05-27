import NextAuth from "../../../../lib/auth";

// NextAuth v4 handler for App Router
export const GET = NextAuth;
export const POST = NextAuth;

// This is required for App Router in NextAuth v4
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';