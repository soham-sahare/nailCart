import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import ApprovalRequest from '@/models/ApprovalRequest';
import Product from '@/models/Product';
import Category from '@/models/Category';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function GET(req: Request) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);

    if (!session || (session.user as any).role !== 'OWNER') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 403 });
    }

    const requests = await ApprovalRequest.find({ status: 'PENDING' }).sort({ createdAt: 1 });

    // Enrich requests with current data for UPDATE types
    const enrichedRequests = await Promise.all(requests.map(async (req) => {
        const requestObj = req.toObject();
        
        if (req.type === 'UPDATE' && req.targetId) {
            const Model = req.model === 'PRODUCT' ? Product : Category;
            const currentData = await Model.findById(req.targetId).lean();
            if (currentData) {
                requestObj.currentData = currentData;
            }
        }
        return requestObj;
    }));

    return NextResponse.json({ success: true, data: enrichedRequests });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);

    if (!session || (session.user as any).role !== 'OWNER') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 403 });
    }

    const body = await req.json();
    const { requestId, action } = body; // action: 'APPROVE' | 'REJECT'

    const request = await ApprovalRequest.findById(requestId);
    if (!request) {
        return NextResponse.json({ success: false, message: 'Request not found' }, { status: 404 });
    }
    
    if (request.status !== 'PENDING') {
         return NextResponse.json({ success: false, message: 'Request already processed' }, { status: 400 });
    }

    if (action === 'REJECT') {
        request.status = 'REJECTED';
        await request.save();
        return NextResponse.json({ success: true, message: 'Request Rejected' });
    }

    if (action === 'APPROVE') {
        // Execute the operation
        const Model = request.model === 'PRODUCT' ? Product : Category;
        
        if (request.type === 'CREATE') {
            await Model.create(request.data);
        } else if (request.type === 'UPDATE') {
            await Model.findByIdAndUpdate(request.targetId, request.data, { new: true });
        } else if (request.type === 'DELETE') {
            await Model.findByIdAndDelete(request.targetId);
        }
        
        request.status = 'APPROVED';
        await request.save();
        return NextResponse.json({ success: true, message: 'Request Approved & Executed' });
    }

    return NextResponse.json({ success: false, message: 'Invalid action' }, { status: 400 });

  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
