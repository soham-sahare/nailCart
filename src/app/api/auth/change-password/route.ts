import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const { password } = await req.json();

        if (!password || password.length < 6) {
            return NextResponse.json({ message: 'Invalid password' }, { status: 400 });
        }

        await dbConnect();

        // Find user by username from session
        const user = await User.findOne({ username: session.user.name });

        if (!user) {
            return NextResponse.json({ message: 'User not found' }, { status: 404 });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        user.password = hashedPassword;
        user.mustChangePassword = false;
        await user.save();

        return NextResponse.json({ message: 'Password updated' });

    } catch (error) {
        console.error("Change Password Error:", error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
