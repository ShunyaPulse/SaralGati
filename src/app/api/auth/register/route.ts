import { NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { query, queryOne } from '@/lib/db';

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = registerSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0].message },
        { status: 400 }
      );
    }

    const { name, email, password } = result.data;

    // Check if user already exists
    const existingUser = await queryOne<{ id: string }>(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user
    const newUser = await queryOne<{ id: string; email: string; name: string }>(
      `
      INSERT INTO users (name, email, password_hash, role)
      VALUES ($1, $2, $3, 'user')
      RETURNING id, email, name
      `,
      [name, email, hashedPassword]
    );

    if (!newUser) {
      throw new Error('Failed to create user');
    }

    return NextResponse.json(
      { success: true, user: newUser },
      { status: 201 }
    );
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
