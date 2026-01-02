import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Order from '@/models/Order';
import Product from '@/models/Product';
import { generateOrderId } from '@/lib/orderUtils';

export async function POST(req: Request) {
  try {
    await dbConnect();
    const body = await req.json();
    const { originalOrderId, items, returnType } = body;

    // 1. Generate Return/Refund Invoice ID
    const idPrefix = returnType === 'REFUND_ONLY' ? 'REF' : 'RET';
    const newId = await generateOrderId(idPrefix);

    // 2. Calculate Refund Amount
    let refundAmount = 0;
    
    // 3. Process Items & Stock match
    const returnItems = [];
    
    for (const item of items) {
        // Check for Cost Price from Product for accurate Profit calculation on returns
        // We need to know the cost of the item being returned.
        const product = await Product.findOne({ name: item.productName });
        
        refundAmount += (item.price * item.quantity);
        returnItems.push({
            productName: item.productName,
            quantity: item.quantity,
            price: item.price,
            costPrice: product ? product.costPrice : 0, // Save cost price for profit calculation
            sku: item.sku,
            category: item.category
        });

        // Update Stock if RESTOCK
        if (returnType === 'RESTOCK' && product) {
             product.quantity += item.quantity;
             await product.save();
        }
    }

    // 4. Create Return Order
    // We need customer details from original order, fetch it
    const originalOrder = await Order.findOne({ orderId: originalOrderId });
    if (!originalOrder) {
        return NextResponse.json({ success: false, message: 'Original order not found' }, { status: 404 });
    }

    // Check if already returned
    if (originalOrder.hasReturn) {
         return NextResponse.json({ success: false, message: 'This order has already been returned/refunded.' }, { status: 400 });
    }

    const newReturnOrder = await Order.create({
        orderId: newId,
        customerName: originalOrder.customerName,
        mobileNumber: originalOrder.mobileNumber,
        items: returnItems,
        totalAmount: refundAmount, // This acts as the refund amount
        discount: 0, // No discount on return usually, or calculate proportional? Simplicity -> 0
        status: returnType === 'REFUND_ONLY' ? 'REFUNDED' : 'RETURNED',
        type: 'RETURN',
        originalOrderId: originalOrderId,
        returnType: returnType
    });

    // 5. Update Original Order Status to prevent future returns
    // originalOrder.status = 'RETURNED'; // Removed per user request
    originalOrder.hasReturn = true;
    // originalOrder.returnType = returnType; // We can keep this if needed for record, or just rely on the linked return order
    await originalOrder.save();

    return NextResponse.json({ success: true, data: newReturnOrder });

  } catch (error: any) {
    console.error('Return Error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 400 });
  }
}
