import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import ApprovalRequest from '@/models/ApprovalRequest';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const { id } = await params;

    const request = await ApprovalRequest.findById(id);
    if (!request) {
      return NextResponse.json({ message: 'Request not found' }, { status: 404 });
    }

    const role = (session.user as any).role;
    const username = (session.user as any).name;

    // Owner can delete any. Staff can only delete their own.
    if (role !== 'OWNER' && request.requestedBy !== username) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
    }

    await ApprovalRequest.findByIdAndDelete(id);

    return NextResponse.json({ success: true, message: 'Request deleted' });
  } catch (error: any) {
    return NextResponse.json({ message: error.message || 'Error deleting request' }, { status: 500 });
  }
}
