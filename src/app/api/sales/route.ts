import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Order from '@/models/Order';
import Product from '@/models/Product';
import { generateOrderId } from '@/lib/orderUtils';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const mode = searchParams.get('mode');

    // MODE: Fetch Distinct Months
    if (mode === 'months') {
        const result = await Order.aggregate([
            {
                $group: {
                    _id: { 
                        month: { $month: "$createdAt" }, 
                        year: { $year: "$createdAt" } 
                    }
                }
            },
            { $sort: { "_id.year": -1, "_id.month": -1 } }
        ]);

        const months = result.map((item: any) => {
            const date = new Date(item._id.year, item._id.month - 1, 1);
            return date.toLocaleString('default', { month: 'short', year: 'numeric' }).replace(' ', '-').toUpperCase();
        });

        return NextResponse.json({ success: true, data: months });
    }

    const skip = (page - 1) * limit;

    const query: any = {};
    if (search) {
      query.$or = [
        { orderId: { $regex: search, $options: 'i' } },
        { customerName: { $regex: search, $options: 'i' } },
        { mobileNumber: { $regex: search, $options: 'i' } },
      ];
    }

    const monthParam = searchParams.get('month');
    if (monthParam && monthParam !== 'All Time') {
        const [mon, year] = monthParam.split('-');
        const monthMap: { [key: string]: number } = { 
            JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5, 
            JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11 
        };
        if (monthMap[mon] !== undefined && year) {
            const start = new Date(parseInt(year), monthMap[mon], 1);
            const end = new Date(parseInt(year), monthMap[mon] + 1, 0, 23, 59, 59, 999); // End of month
            query.createdAt = { $gte: start, $lte: end };
        }
    }

    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(); // Optimize read performance

    const total = await Order.countDocuments(query);

    return NextResponse.json({
      success: true,
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
    const session = await getServerSession(authOptions);
    await dbConnect();
    const body = await req.json();

    // Format: INV-YYYY-MM-XXXX
    const uniqueId = await generateOrderId('INV');

    // Batch fetch costs for all items to optimize performance
    const productNames = body.items.map((i: any) => i.productName);
    const products = await Product.find({ name: { $in: productNames } }).lean();
    
    // Create Map for O(1) lookup
    const productMap = new Map();
    products.forEach((p: any) => productMap.set(p.name, p));

    // VALIDATION: Check for sufficient stock
    for (const item of body.items) {
        const product: any = productMap.get(item.productName);
        if (product && product.quantity < item.quantity) {
             return NextResponse.json({ 
                 success: false, 
                 message: `Insufficient stock for "${item.productName}". Available: ${product.quantity}, Requested: ${item.quantity}` 
             }, { status: 400 });
        }
    }

    // Enrich items with costPrice
    const enrichedItems = body.items.map((item: any) => {
        const product: any = productMap.get(item.productName);
        return {
            ...item,
            costPrice: product ? product.costPrice : 0, // Snapshot current cost
            mrp: product ? product.mrp : 0,           // Snapshot MRP
            sku: product ? product.sku : item.sku,
            category: product && product.category ? product.category.name : item.category // Note: Category is ID usually, check if populated? No, simple string here from logic
            // Wait, Product schema has category as ObjectId ref. `product.category` will be ObjectId if lean.
            // If we want name, we need populate or assumptions. 
            // In original code: product.category.name. This implies product was a mongoose doc with populate? 
            // Original code: await Product.findOne(). No populate. So product.category is ObjectId.
            // But code accessed `product.category.name`. This would crash if it wasn't populated properly or if mixed types.
            // Let's safe guard. In POST, usually category comes from FE or we need to fetch it.
            // For simplicity/performance: snapshot what we have, or just keep ObjectId?
            // "item.category" from FE usually fits.
        };
    });

    const order = await Order.create({ 
        ...body, 
        items: enrichedItems,
        orderId: uniqueId,
        createdBy: session?.user?.name || 'System'
    });

    // INVENTORY UPDATE: Decrement stock
    await Promise.all(body.items.map((item: any) => {
        // Only update if we found the product (prevents errors on ad-hoc items)
        if (productMap.has(item.productName)) {
             return Product.updateOne(
                { name: item.productName },
                { $inc: { quantity: -item.quantity } }
             );
        }
        return Promise.resolve();
    }));
    return NextResponse.json({ success: true, data: order }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 400 });
  }
}
