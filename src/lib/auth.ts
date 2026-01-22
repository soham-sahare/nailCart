import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import bcrypt from 'bcryptjs';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          return null;
        }

        await dbConnect();

        // 1. Seed Owner if not exists
        const ownerExists = await User.findOne({ role: 'OWNER' });
        
        if (!ownerExists && 
            process.env.OWNER_USERNAME && 
            process.env.OWNER_PASSWORD && 
            credentials.username === process.env.OWNER_USERNAME
        ) {
            console.log("Seeding Owner Account...");
            const hashedPassword = await bcrypt.hash(process.env.OWNER_PASSWORD, 10);
            await User.create({
                username: process.env.OWNER_USERNAME,
                password: hashedPassword,
                role: 'OWNER',
                mustChangePassword: false
            });
            console.log("Owner Account Seeded");
        }

        const user = await User.findOne({ username: credentials.username });

        if (!user) {
          return null;
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isPasswordValid) {
          return null;
        }

        return {
          id: user._id.toString(),
          name: user.username,
          role: user.role,
          mustChangePassword: user.mustChangePassword
        };
      }
    })
  ],
  session: {
    strategy: "jwt",
    maxAge: 12 * 60 * 60, // 12 hours
  },
  pages: {
    signIn: '/admin/login',
  },
  callbacks: {
      async session({ session, token }) {
        if (session.user) {
            session.user.name = token.name;
            (session.user as any).role = token.role;
            (session.user as any).mustChangePassword = token.mustChangePassword;
        }
        return session;
    },
    async jwt({ token, user }) {
        if (user) {
            token.name = user.name;
            token.role = (user as any).role;
            token.mustChangePassword = (user as any).mustChangePassword;
            token.loginTime = Date.now();
        }
        return token;
    }
  },
  secret: process.env.NEXTAUTH_SECRET,
};
