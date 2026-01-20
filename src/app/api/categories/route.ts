import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Category from '@/models/Category';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

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

    const [categories, total] = await Promise.all([
      Category.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Category.countDocuments(query)
    ]);

    // Initialize finalCategories from the fetched categories
    let finalCategories: any[] = categories;

    // 4. Check for Pending Updates/Deletes (ALL PAGES)
    // 4. Check for Pending Updates/Deletes (ALL PAGES)
    if (!status) {
         const { getPendingModifications, augmentWithPendingStatus } = require('@/lib/approvalService');
         const categoryIds = finalCategories.map((c: any) => c._id);
         const modificationMap = await getPendingModifications('CATEGORY', categoryIds);
         finalCategories = augmentWithPendingStatus(finalCategories, modificationMap);
    }

    // 5. Check for Pending/Rejected CREATES (First Page Only)
    // We reuse 'finalCategories' which was initialized from 'categories'
    // But since 'categories' is const from Promise.all, we need a mutable variable.
    
    // Fix: We can use a new variable or cast.
    // Let's use a new variable for the final list to avoid 'const' assignment issues if 'categories' was const.
    // Actually 'categories' comes from Promise.all destructuring which is const by default in my previous edit? 
    // "const [categories, total] = ..." -> yes categories is const.
    // So "finalCategories" is needed.
    
    // Let's correct line 40 first - remove redeclaration if I'm fixing the file.
    // But since I am replacing a chunk, I will rewrite the section.

    if (page === 1 && !search && !status) {
         // Session validated at start
         const role = (session?.user as any)?.role || 'STAFF';
         const { getGhostItems, mapRequestsToItems } = require('@/lib/approvalService');
         
         const { pendingCreates, rejectedCreates } = await getGhostItems('CATEGORY', role);

         const mappedPending = mapRequestsToItems(pendingCreates, 'PENDING');
         const mappedRejected = mapRequestsToItems(rejectedCreates, 'REJECTED');

         finalCategories = [...mappedPending, ...mappedRejected, ...finalCategories];
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
