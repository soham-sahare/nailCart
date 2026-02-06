import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Order from '@/models/Order';

export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    await dbConnect();
    const order = await Order.findById(params.id).lean();
    if (!order) {
        // Try looking up by orderId just in case
        const orderByCustomId = await Order.findOne({ orderId: params.id }).lean();
        if(orderByCustomId) {
             // Enrich with current MRP
             const Product = (await import('@/models/Product')).default;
             const productNames = orderByCustomId.items.map((i: any) => i.productName);
             const products = await Product.find({ name: { $in: productNames } }).select('name mrp').lean();
             const productMap = new Map(products.map((p: any) => [p.name, p.mrp]));
             
             orderByCustomId.items = orderByCustomId.items.map((item: any) => ({
                 ...item,
                 currentMrp: productMap.get(item.productName)
             }));

             return NextResponse.json({ success: true, data: orderByCustomId });
        }
        return NextResponse.json({ success: false, message: 'Order not found' }, { status: 404 });
    }

    // Enrich with current MRP
    const Product = (await import('@/models/Product')).default;
    const productNames = order.items.map((i: any) => i.productName);
    const products = await Product.find({ name: { $in: productNames } }).select('name mrp').lean();
    const productMap = new Map(products.map((p: any) => [p.name, p.mrp]));
    
    order.items = order.items.map((item: any) => ({
        ...item,
        currentMrp: productMap.get(item.productName)
    }));

    return NextResponse.json({ success: true, data: order });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 400 });
  }
}

export async function PUT(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    await dbConnect();
    const body = await req.json();

    // Check if we are marking a return
    if (body.status === 'RETURNED') {
      const existingOrder = await Order.findById(params.id);
      if (!existingOrder) {
        return NextResponse.json({ success: false, message: 'Order not found' }, { status: 404 });
      }

      // If already returned, don't double process
      if (existingOrder.status === 'RETURNED') {
        return NextResponse.json({ success: false, message: 'Order is already returned' }, { status: 400 });
      }

      // Add returnType to body
      body.returnType = body.restock ? 'RESTOCK' : 'REFUND_ONLY';

      // Restock items only if requested
      if (body.restock) {
        const { default: Product } = await import('@/models/Product');
        for (const item of existingOrder.items) {
            // Try to find product by Name + SKU (if available) for accuracy
            const query: any = { name: item.productName };
            if (item.sku) query.sku = item.sku;

            let product = await Product.findOne(query);
            
            if (product) {
                product.quantity += item.quantity;
                await product.save();
            }
        }
      }
    }

    const order = await Order.findByIdAndUpdate(params.id, body, {
      new: true,
      runValidators: true,
    });
    if (!order) {
      return NextResponse.json({ success: false, message: 'Order not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: order });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 400 });
  }
}

export async function DELETE(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    await dbConnect();
    const order = await Order.findByIdAndDelete(params.id);
    if (!order) {
      return NextResponse.json({ success: false, message: 'Order not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: {} });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 400 });
  }
}
