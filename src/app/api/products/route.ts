import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Product from '@/models/Product';
// Ensure Category model is registered for populate
import '@/models/Category'; 
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
      ? { 
          $or: [
            { name: { $regex: search, $options: 'i' } },
            { sku: { $regex: search, $options: 'i' } }
          ]
        }
      : {};

    if (status) {
      query.status = status;
    }

    let products = await Product.find(query)
      .populate('category', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(); // Optimize read

    const total = await Product.countDocuments(query);
    
    // 4. Check for Pending Updates/Deletes on the fetched products (ALL PAGES)
    if (!status) { // Only checking if not filtering by specific status (Dashboard mode)
         const productIds = products.map((p: any) => p._id);
         const ApprovalRequest = require('@/models/ApprovalRequest').default;
         
         const pendingModifications = await ApprovalRequest.find({
             model: 'PRODUCT',
             status: 'PENDING',
             targetId: { $in: productIds },
             type: { $in: ['UPDATE', 'DELETE'] }
         });

         const modificationMap = new Map();
         pendingModifications.forEach((req: any) => {
             modificationMap.set(req.targetId.toString(), req.type);
         });

         products = products.map((p: any) => {
             const action = modificationMap.get(p._id.toString());
             if (action) {
                 return { ...p, pendingAction: action, isPending: true }; // isPending tag for UI styling
             }
             return p;
         });
    }

    // 5. Check for Pending/Rejected CREATES (First Page Only)
    let finalProducts: any[] = products;
    
    if (page === 1 && !search && !status) {
         const ApprovalRequest = require('@/models/ApprovalRequest').default;
         
         // Fetch Pending Creates
         const pendingCreates = await ApprovalRequest.find({
            type: 'CREATE',
            model: 'PRODUCT',
            status: 'PENDING'
         }).sort({ requestDate: -1 });

         // Fetch Rejected Creates (Ghost items) - ONLY FOR STAFF
         let rejectedCreates: any[] = [];
         if (role === 'STAFF') {
             rejectedCreates = await ApprovalRequest.find({
                type: 'CREATE',
                model: 'PRODUCT',
                status: 'REJECTED'
             }).sort({ requestDate: -1 });
         }

         const mapRequestToProduct = (req: any, statusOverride?: string) => ({
             ...req.data,
             _id: statusOverride === 'REJECTED' ? 'rejected_' + req._id : 'pending_' + req._id,
             // Store original request ID for deletion/references
             requestId: req._id, 
             status: statusOverride || req.status,
             isPending: statusOverride !== 'REJECTED', // Only pending if not rejected
             isRejected: statusOverride === 'REJECTED',
             category: req.data.categoryId ? { _id: req.data.categoryId, name: 'Pending...' } : null
         });

         const mappedPending = pendingCreates.map((req: any) => mapRequestToProduct(req, 'PENDING'));
         const mappedRejected = rejectedCreates.map((req: any) => mapRequestToProduct(req, 'REJECTED'));
         
         finalProducts = [...mappedPending, ...mappedRejected, ...products];
    }

    return NextResponse.json({
      success: true,
      data: finalProducts,
      pagination: {
        total, // Total DB records (excluding pending for accurate pagination of DB items)
        page,
        limit,
        pages: Math.ceil(total / limit),
      }
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Error fetching products' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const body = await req.json();

    const role = (session.user as any).role;

    if (role === 'STAFF') {
        // Create Approval Request
        await import('@/models/ApprovalRequest'); // Ensure model is loaded
        const ApprovalRequest = require('@/models/ApprovalRequest').default;

        await ApprovalRequest.create({
            type: 'CREATE',
            model: 'PRODUCT',
            data: body,
            requestedBy: session.user.name,
            status: 'PENDING'
        });

        return NextResponse.json({ success: true, message: 'Request submitted for approval' }, { status: 200 });
    }

    const product = await Product.create(body);

    return NextResponse.json(product, { status: 201 });
  } catch (error: any) {
    if (error.code === 11000) {
      return NextResponse.json({ message: 'Product SKU already exists' }, { status: 400 });
    }
    return NextResponse.json({ message: 'Error creating product' }, { status: 500 });
  }
}
