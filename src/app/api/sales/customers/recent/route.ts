import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Order from '@/models/Order';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';

    // Calculate cutoff: 40 days ago
    const fortyDaysAgo = new Date();
    fortyDaysAgo.setDate(fortyDaysAgo.getDate() - 40);

    // Initial Filter: Last 40 days, unique SALE type orders
    const matchStage: any = {
      createdAt: { $gte: fortyDaysAgo },
      type: 'SALE'
    };

    // Optional Search Filter 
    if (search) {
      matchStage.$or = [
        { customerName: { $regex: search, $options: 'i' } },
        { mobileNumber: { $regex: search, $options: 'i' } }
      ];
    }

    const recentCustomers = await Order.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: { 
            name: "$customerName", 
            phone: "$mobileNumber" 
          },
          lastOrder: { $max: "$createdAt" }
        }
      },
      { $sort: { lastOrder: -1 } },
      { $limit: 30 },
      {
        $project: {
          _id: 0,
          name: "$_id.name",
          phone: "$_id.phone",
          lastOrder: 1
        }
      }
    ]);

    return NextResponse.json({ success: true, data: recentCustomers });
  } catch (error: any) {
    console.error('Recent Customers API Error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
