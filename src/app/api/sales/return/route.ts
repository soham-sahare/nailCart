import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Order from '@/models/Order';
import Product from '@/models/Product';
import { generateOrderId } from '@/lib/orderUtils';

export async function POST(req: Request) {
  try {
    await dbConnect();
    const body = await req.json();
    const { originalOrderId, items, returnType, paymentMethod, upiAmount, cashAmount } = body;

    // 1. Generate Return/Refund Invoice ID
    const idPrefix = returnType === 'REFUND_ONLY' ? 'REF' : 'RET';
    const newId = await generateOrderId(idPrefix);

    // 2. Calculate Refund Amount
    let refundAmount = 0;
    
    // 3. Process Items & Stock match
    const returnItems = [];
    const originalOrder = await Order.findOne({ orderId: originalOrderId });
    if (!originalOrder) {
        return NextResponse.json({ success: false, message: 'Original order not found' }, { status: 404 });
    }

    for (const item of items) {
        // Find the matching item in the original order to get its COST PRICE snapshot
        const originalItem = (originalOrder.items as any[]).find((oi: any) => 
            oi.productName === item.productName && (oi.sku || "") === (item.sku || "")
        );

        const productQuery: any = { name: item.productName };
        if (item.sku) productQuery.sku = item.sku;
        
        const product = await Product.findOne(productQuery).lean() as any;
        
        refundAmount += (item.price * item.quantity);
        returnItems.push({
            productName: item.productName,
            quantity: item.quantity,
            price: item.price,
            // PRIORITY: use original cost snapshot, fallback to current product, fallback to 0
            costPrice: originalItem?.costPrice ?? product?.costPrice ?? 0, 
            sku: item.sku,
            category: item.category
        });

        // Update Stock if RESTOCK (ATOMIC UPDATE)
        if (returnType === 'RESTOCK') {
             await Product.updateOne(
                productQuery,
                { $inc: { quantity: item.quantity } }
             );
        }
    }

    // 4. Create Return Order
    const newReturnOrder = await Order.create({
        orderId: newId,
        customerName: originalOrder.customerName,
        mobileNumber: originalOrder.mobileNumber,
        items: returnItems,
        totalAmount: refundAmount, 
        discount: 0, 
        paymentMethod: paymentMethod || 'CASH',
        upiAmount: upiAmount || 0,
        cashAmount: cashAmount || 0,
        status: returnType === 'REFUND_ONLY' ? 'REFUNDED' : 'RETURNED',
        type: 'RETURN',
        originalOrderId: originalOrderId,
        returnType: returnType
    });

    // 5. Update Original Order Status
    originalOrder.hasReturn = true;
    await originalOrder.save();

    return NextResponse.json({ success: true, data: newReturnOrder });

  } catch (error: any) {
    console.error('Return Error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 400 });
  }
}
