import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Product from '@/models/Product';
// Ensure Category model is registered for populate
import '@/models/Category'; 
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

    const select = searchParams.get('select');
    let productsQuery = Product.find(query);

    if (select) {
        productsQuery = productsQuery.select(select.split(',').join(' '));
    }

    let products = await productsQuery
      .populate('category', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(); // Optimize read

    const total = await Product.countDocuments(query);
    
    // 4. Check for Pending Updates/Deletes on the fetched products (ALL PAGES)
    // 4. Check for Pending Updates/Deletes on the fetched products (ALL PAGES)
    if (!status) {
         const { getPendingModifications, augmentWithPendingStatus } = require('@/lib/approvalService');
         const productIds = products.map((p: any) => p._id);
         const modificationMap = await getPendingModifications('PRODUCT', productIds);
         products = augmentWithPendingStatus(products, modificationMap);
    }

    // 5. Check for Pending/Rejected CREATES (First Page Only)
    let finalProducts: any[] = products;
    
    if (page === 1 && !search && !status) {
         // Session validated at start of function
         const role = (session?.user as any)?.role || 'STAFF';
         const { getGhostItems, mapRequestsToItems } = require('@/lib/approvalService');
         
         const { pendingCreates, rejectedCreates } = await getGhostItems('PRODUCT', role);

         const mappedPending = mapRequestsToItems(pendingCreates, 'PENDING');
         const mappedRejected = mapRequestsToItems(rejectedCreates, 'REJECTED');
         
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
            requestedBy: session?.user?.name || 'Unknown',
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
