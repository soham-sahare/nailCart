import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Category from '@/models/Category';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    const role = (session.user as any).role;

    await dbConnect();
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    const query: any = search
      ? { name: { $regex: search, $options: 'i' } }
      : {};

    if (status) {
      query.status = status;
    }

    let categories = await Category.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Category.countDocuments(query);

    // 4. Check for Pending Updates/Deletes (ALL PAGES)
    // 4. Check for Pending Updates/Deletes (ALL PAGES)
    if (!status) {
         const { getPendingModifications, augmentWithPendingStatus } = require('@/lib/approvalService');
         const categoryIds = categories.map((c: any) => c._id);
         const modificationMap = await getPendingModifications('CATEGORY', categoryIds);
         categories = augmentWithPendingStatus(categories, modificationMap);
    }

    // 5. Check for Pending/Rejected CREATES (First Page Only)
    let finalCategories: any[] = categories;

    if (page === 1 && !search && !status) {
         // Session validated at start
         const role = (session?.user as any)?.role || 'STAFF';
         const { getGhostItems, mapRequestsToItems } = require('@/lib/approvalService');
         
         const { pendingCreates, rejectedCreates } = await getGhostItems('CATEGORY', role);

         const mappedPending = mapRequestsToItems(pendingCreates, 'PENDING');
         const mappedRejected = mapRequestsToItems(rejectedCreates, 'REJECTED');

         finalCategories = [...mappedPending, ...mappedRejected, ...categories];
    }

    return NextResponse.json({
      success: true,
      data: finalCategories,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      }
    });
  } catch (error) {
    return NextResponse.json({ message: 'Error fetching categories' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const body = await req.json();

    const role = (session.user as any).role;
    if (role === 'STAFF') {
        const ApprovalRequest = require('@/models/ApprovalRequest').default;
        await ApprovalRequest.create({
            type: 'CREATE',
            model: 'CATEGORY',
            data: body,
            requestedBy: session.user.name,
            status: 'PENDING'
        });
        return NextResponse.json({ success: true, message: 'Request submitted for approval' });
    }

    const category = await Category.create(body);

    return NextResponse.json(category, { status: 201 });
  } catch (error: any) {
    if (error.code === 11000) {
      return NextResponse.json({ message: 'Category already exists' }, { status: 400 });
    }
    return NextResponse.json({ message: 'Error creating category' }, { status: 500 });
  }
}
