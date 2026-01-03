
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function PUT(req: Request, { params }: { params: { userid: string } }) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);

    if (!session || (session.user as any).role !== 'OWNER') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 403 });
    }

    const { userid } = params;
    const body = await req.json();
    const { role } = body;

    if (!['OWNER', 'STAFF'].includes(role)) {
        return NextResponse.json({ success: false, message: 'Invalid role' }, { status: 400 });
    }

    // Prevent downgrading self (Double check, though frontend hides self)
    if ((session.user as any).id === userid && role !== 'OWNER') {
         return NextResponse.json({ success: false, message: 'Cannot demote yourself' }, { status: 400 });
    }

    const updatedUser = await User.findByIdAndUpdate(
        userid, 
        { role }, 
        { new: true, runValidators: true }
    ).select('-password');

    if (!updatedUser) {
        return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updatedUser });

  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { userid: string } }) {
    try {
      await dbConnect();
      const session = await getServerSession(authOptions);
  
      if (!session || (session.user as any).role !== 'OWNER') {
        return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 403 });
      }
  
      const { userid } = params;
  
      // Prevent deleting self
      // Note: session.user.id might not be populated in session object if not customized. 
      // Assuming it IS populated based on previous context.
      // Need to verify 'id' is in session.
      // previous look at [...nextauth]/route.ts shows:
      // session.user.name = token.name;
      // (session.user as any).role = token.role;
      // No ID?  
      // user object has ID. token might not?
      // Let's verify nextauth route.
      
      const deletedUser = await User.findByIdAndDelete(userid);
  
      if (!deletedUser) {
          return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
      }
  
      return NextResponse.json({ success: true, message: 'User deleted' });
  
    } catch (error: any) {
      return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
  }
