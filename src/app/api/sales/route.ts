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

    const gstOnly = searchParams.get('gstOnly');
    if (gstOnly === 'true') {
        query.isGstBill = true;
    }

    const [orders, total] = await Promise.all([
      Order.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Order.countDocuments(query)
    ]);

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

    // Batch fetch products using Name + SKU combination
    // We construct an OR query to match exact Name/SKU pairs
    const queryConditions = body.items.map((i: any) => ({
        name: i.productName,
        ...(i.sku ? { sku: i.sku } : {}) 
    }));
    
    const products = await Product.find({ $or: queryConditions })
        .populate('category', 'name')
        .lean();
    
    // Create Map for O(1) lookup using Composite Key: "Name|SKU"
    // If SKU is missing in DB (legacy), we use "Name|undefined" or just "Name|"
    const productMap = new Map();
    products.forEach((p: any) => {
        const key = `${p.name}|${p.sku || ''}`;
        productMap.set(key, p);
    });

    // VALIDATION: Check for sufficient stock
    for (const item of body.items) {
        const key = `${item.productName}|${item.sku || ''}`;
        
        // Fallback: If exact match fails (maybe legacy item sent without SKU?), try name match?
        // But for new items, we expect strict match.
        let product: any = productMap.get(key);

        if (product && product.quantity < item.quantity) {
             return NextResponse.json({ 
                 success: false, 
                 message: `Insufficient stock for "${item.productName}" (SKU: ${item.sku || '-'}). Available: ${product.quantity}, Requested: ${item.quantity}` 
             }, { status: 400 });
        }
    }

    // Enrich items with costPrice
    const enrichedItems = body.items.map((item: any) => {
        const key = `${item.productName}|${item.sku || ''}`;
        const product: any = productMap.get(key);
        
        return {
            ...item,
            costPrice: product ? product.costPrice : 0, // Snapshot current cost
            mrp: (product && product.mrp) ? product.mrp : (product ? product.sellingPrice : item.price), // Snapshot MRP or fallback to price
            sku: product ? product.sku : item.sku,
            // Item 8: Denormalize Category Name
            category: product && product.category && (product.category as any).name 
                ? (product.category as any).name 
                : item.category 
        };
    });

    // RECALCULATE GST AND TOTAL FOR INTEGRITY (Inclusive Rule)
    let calculatedGst = 0;
    if (body.isGstBill) {
        enrichedItems.forEach((item: any) => {
            const isShills = (item.productName || '').toUpperCase().includes('SHILLS') || 
                           (item.sku || '').toUpperCase().includes('SHILLS');
            
            if (isShills) {
                const itemQty = Number(item.quantity) || 0;
                const itemPrice = Number(item.price) || 0;
                const itemCost = Number(item.costPrice) || 0;

                // Inclusive Rule: Price includes tax. Derived Base = 250 / 1.18. Tax = 250 - 211.86.
                const potentialGstPerUnit = itemPrice * (0.18 / 1.18);
                const cappedGstPerUnit = Math.min(potentialGstPerUnit, itemCost);
                
                calculatedGst += (cappedGstPerUnit * itemQty);
            }
        });
    }

    const itemSum = enrichedItems.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);
    const calculatedTotal = Math.max(0, itemSum - (body.discount || 0) + (body.courierFees || 0));

    const order = await Order.create({ 
        ...body, 
        items: enrichedItems,
        gstAmount: calculatedGst,
        totalAmount: calculatedTotal,
        orderId: uniqueId,
        createdBy: session?.user?.name || 'System'
    });

    // Handle Ledger Entry
    if (body.addToLedger && body.balance > 0) {
        const Ledger = (await import('@/models/Ledger')).default;
        await Ledger.create({
            partyName: body.customerName,
            description: `Balance for Bill #${uniqueId}`,
            type: 'RECEIVABLE',
            amount: body.balance,
            status: 'PENDING',
            date: new Date(),
            paymentMethod: body.paymentMethod === 'CASH' ? 'CASH' : 'UPI' // Default to payment method used
        });
        
        // Update order to reflect ledger status
        order.isLedger = true;
        await order.save();
    }

    // INVENTORY UPDATE: Atomic Decrement (Safe against race conditions)
    await Promise.all(body.items.map(async (item: any) => {
        const key = `${item.productName}|${item.sku || ''}`;
        if (productMap.has(key)) {
             const filter: any = { name: item.productName };
             if(item.sku) filter.sku = item.sku;
             
             // Ensure quantity doesn't go below requested amount
             filter.quantity = { $gte: item.quantity };

             const updateResult = await Product.updateOne(
                filter,
                { $inc: { quantity: -item.quantity } }
             );

             if (updateResult.modifiedCount === 0) {
                 // Even though we validated at start, another concurrent request 
                 // might have snatched the stock. 
                 throw new Error(`Inventory race condition: Stock for "${item.productName}" was depleted by another session.`);
             }
        }
    }));
    return NextResponse.json({ success: true, data: order }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 400 });
  }
}
