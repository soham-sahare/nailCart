import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Order from '@/models/Order';

export async function GET(req: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const skip = (page - 1) * limit;

    const query: any = {};
    if (search) {
      query.$or = [
        { orderId: { $regex: search, $options: 'i' } },
        { customerName: { $regex: search, $options: 'i' } },
        { mobileNumber: { $regex: search, $options: 'i' } },
      ];
    }

    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Order.countDocuments(query);

    return NextResponse.json({
      data: orders,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        page,
        limit
      }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await dbConnect();
    const body = await req.json();

    // Format: INV{YYYY}_(SEQUENCE)
    const currentYear = new Date().getFullYear();
    const prefix = `INV${currentYear}_`;

    // Find the latest order for the CURRENT YEAR to ensure sequence resets/continues correctly per year
    const latestOrder = await Order.findOne({ 
      orderId: { $regex: `^${prefix}` } 
    }).sort({ createdAt: -1 });

    let nextSequence = 0;
    if (latestOrder && latestOrder.orderId) {
      // Extract sequence part (everything after the prefix)
      // e.g. INV2026_0005 -> 0005
      const parts = latestOrder.orderId.split('_');
      if (parts.length === 2) {
        const lastSeq = parseInt(parts[1], 10);
        if (!isNaN(lastSeq)) {
          nextSequence = lastSeq + 1;
        }
      }
    }

    // Format as at least 4 digits: 0000, 0001 ... 9999, 10000
    const sequenceStr = nextSequence.toString().padStart(4, '0');
    const uniqueId = `${prefix}${sequenceStr}`;

    const order = await Order.create({ ...body, orderId: uniqueId });
    return NextResponse.json({ success: true, data: order }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 400 });
  }
}
