import { NextAuthOptions, getServerSession } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import { query, queryOne } from '@/lib/db';
import bcrypt from 'bcryptjs';

export const authOptions: NextAuthOptions = {
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/login',
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    }),
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Invalid credentials');
        }

        const user = await queryOne<{
          id: string;
          email: string;
          name: string;
          password_hash: string;
          role: string;
          image: string;
        }>('SELECT * FROM users WHERE email = $1', [credentials.email]);

        if (!user || !user.password_hash) {
          throw new Error('User not found');
        }

        const isValidPassword = await bcrypt.compare(
          credentials.password,
          user.password_hash
        );

        if (!isValidPassword) {
          throw new Error('Invalid password');
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          image: user.image,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === 'google') {
        const { email, name, image } = user;
        if (!email) return false;

        try {
          await query(
            `
            INSERT INTO users (email, name, image, role) 
            VALUES ($1, $2, $3, 'caregiver')
            ON CONFLICT (email) 
            DO UPDATE SET name = EXCLUDED.name, image = EXCLUDED.image, updated_at = CURRENT_TIMESTAMP
            `,
            [email, name || '', image || '']
          );
          
          const dbUser = await queryOne<{ id: string; role: string }>(
            'SELECT id, role FROM users WHERE email = $1',
            [email]
          );
          
          if (dbUser) {
            user.id = dbUser.id;
            user.role = dbUser.role;
          }
          return true;
        } catch (error) {
          console.error('Error during Google sign-in:', error);
          return false;
        }
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
};

export const getAuthSession = () => getServerSession(authOptions);
