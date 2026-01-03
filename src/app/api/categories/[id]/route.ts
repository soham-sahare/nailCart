import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Category from '@/models/Category';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const body = await req.json();
    const { id } = await params;

    const role = (session.user as any).role;
    if (role === 'STAFF') {
        const ApprovalRequest = require('@/models/ApprovalRequest').default;
        await ApprovalRequest.create({
            type: 'UPDATE',
            model: 'CATEGORY',
            data: body,
            targetId: id,
            requestedBy: session.user.name,
            status: 'PENDING'
        });
        return NextResponse.json({ success: true, message: 'Update request submitted for approval' });
    }

    const category = await Category.findByIdAndUpdate(
      id,
      body,
      { new: true, runValidators: true }
    );

    if (!category) {
      return NextResponse.json({ message: 'Category not found' }, { status: 404 });
    }

    return NextResponse.json(category);
  } catch (error) {
    return NextResponse.json({ message: 'Error updating category' }, { status: 500 });
  }
}

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
  ) {
    try {
      const session = await getServerSession(authOptions);
      if (!session || !session.user) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
      }
  
      await dbConnect();
      const { id } = await params;

      const role = (session.user as any).role;
      if (role === 'STAFF') {
          const ApprovalRequest = require('@/models/ApprovalRequest').default;
          await ApprovalRequest.create({
              type: 'DELETE',
              model: 'CATEGORY',
              targetId: id,
              requestedBy: session.user.name,
              status: 'PENDING'
          });
          return NextResponse.json({ success: true, message: 'Delete request submitted for approval' });
      }
      
      const category = await Category.findByIdAndDelete(id);
  
      if (!category) {
        return NextResponse.json({ message: 'Category not found' }, { status: 404 });
      }
  
      return NextResponse.json({ message: 'Category deleted' });
    } catch (error) {
      return NextResponse.json({ message: 'Error deleting category' }, { status: 500 });
    }
  }
