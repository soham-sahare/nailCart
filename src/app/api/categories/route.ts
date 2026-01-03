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
    if (!status) {
         const categoryIds = categories.map((c: any) => c._id);
         const ApprovalRequest = require('@/models/ApprovalRequest').default;
         
         const pendingModifications = await ApprovalRequest.find({
             model: 'CATEGORY',
             status: 'PENDING',
             targetId: { $in: categoryIds },
             type: { $in: ['UPDATE', 'DELETE'] }
         });

         const modificationMap = new Map();
         pendingModifications.forEach((req: any) => {
             modificationMap.set(req.targetId.toString(), req.type);
         });

         categories = categories.map((c: any) => {
             const action = modificationMap.get(c._id.toString());
             if (action) {
                 return { ...c, pendingAction: action, isPending: true };
             }
             return c;
         });
    }



    // 5. Check for Pending/Rejected CREATES (First Page Only)
    let finalCategories: any[] = categories;

    if (page === 1 && !search && !status) {
        const ApprovalRequest = require('@/models/ApprovalRequest').default;
        
        const pendingCreates = await ApprovalRequest.find({
            type: 'CREATE',
            model: 'CATEGORY',
            status: 'PENDING'
         }).sort({ requestDate: -1 });

        // ONLY FOR STAFF
        let rejectedCreates: any[] = [];
        if (role === 'STAFF') {
            rejectedCreates = await ApprovalRequest.find({
                type: 'CREATE',
                model: 'CATEGORY',
                status: 'REJECTED'
             }).sort({ requestDate: -1 });
        }

        const mapRequestToCategory = (req: any, statusOverride?: string) => ({
             ...req.data,
             _id: statusOverride === 'REJECTED' ? 'rejected_' + req._id : 'pending_' + req._id,
             requestId: req._id,
             status: statusOverride || req.status,
             isPending: statusOverride !== 'REJECTED',
             isRejected: statusOverride === 'REJECTED'
        });

        const mappedPending = pendingCreates.map((req: any) => mapRequestToCategory(req, 'PENDING'));
        const mappedRejected = rejectedCreates.map((req: any) => mapRequestToCategory(req, 'REJECTED'));

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
