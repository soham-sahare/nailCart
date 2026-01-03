import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function POST(req: Request) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.name) {
        return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    // Check if there are ANY owners yet. If NO owners exist, allow upgrading the current user.
    const ownerCount = await User.countDocuments({ role: 'OWNER' });
    
    if (ownerCount > 0) {
         // If owners exist, check if current user is owner (idempotent)
         // Actually, if owners exist, we shouldn't allow random upgrades.
         // But for migration: If the USER is the one calling this, and valid session...
         // Let's restrict: Only allow if count is 0.
         return NextResponse.json({ success: false, message: 'Owner already exists using this method.' }, { status: 403 });
    }

    const updatedUser = await User.findOneAndUpdate(
        { username: session.user.name },
        { role: 'OWNER' },
        { new: true }
    );

    return NextResponse.json({ success: true, message: 'Upgraded to OWNER', user: updatedUser });

  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
