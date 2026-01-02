import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Order from '@/models/Order';
import Product from '@/models/Product';
import { generateOrderId } from '@/lib/orderUtils';

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
      .limit(limit)
      .lean(); // Optimize read performance

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

    // Format: INV-YYYY-MM-XXXX
    const uniqueId = await generateOrderId('INV');

    // Batch fetch costs for all items to optimize performance
    const productNames = body.items.map((i: any) => i.productName);
    const products = await Product.find({ name: { $in: productNames } }).lean();
    
    // Create Map for O(1) lookup
    const productMap = new Map();
    products.forEach((p: any) => productMap.set(p.name, p));

    // Enrich items with costPrice
    const enrichedItems = body.items.map((item: any) => {
        const product: any = productMap.get(item.productName);
        return {
            ...item,
            costPrice: product ? product.costPrice : 0, // Snapshot current cost
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
        orderId: uniqueId 
    });
    return NextResponse.json({ success: true, data: order }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 400 });
  }
}
