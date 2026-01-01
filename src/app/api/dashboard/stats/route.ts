import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Order from '@/models/Order';
import Product from '@/models/Product';
import Category from '@/models/Category';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await dbConnect();

    // 1. Key Metrics
    const totalOrders = await Order.countDocuments();
    
    // Revenue & Today's Sales
    const allOrders = await Order.find({}, 'totalAmount discount createdAt');
    const totalRevenue = allOrders.reduce((acc, order) => acc + (order.totalAmount || 0), 0);
    
    // InventoryStats
    const allProducts = await Product.find({}, 'costPrice quantity category name');
    const inventoryValue = allProducts.reduce((acc, p) => acc + ((p.costPrice || 0) * (p.quantity || 0)), 0);
    const lowStockCount = allProducts.filter((p: any) => p.quantity < 10).length; // Low stock threshold 10

    // 2. Sales Trend (Last 7 Days)
    // Group orders by date (YYYY-MM-DD)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recentOrders = allOrders.filter((o: any) => new Date(o.createdAt) >= sevenDaysAgo);
    
    const salesMap: Record<string, number> = {};
    // Initialize last 7 days with 0
    for(let i=6; i>=0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }); // "02 Jan"
        salesMap[dateStr] = 0;
    }

    recentOrders.forEach((order: any) => {
        const dateStr = new Date(order.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
        if (salesMap[dateStr] !== undefined) {
            salesMap[dateStr] += order.totalAmount;
        }
    });

    const salesTrend = Object.keys(salesMap).map(date => ({
        date,
        sales: salesMap[date]
    }));

    // 3. Category Distribution
    // We need to group products by category and count them
    // Or we can show Sales by category (requires joining, maybe purely product count is faster for now)
    const categoryMap: Record<string, number> = {};
    const categories = await Category.find();
    const catIdToName: Record<string, string> = {};
    categories.forEach((c: any) => catIdToName[c._id.toString()] = c.name);

    allProducts.forEach((p: any) => {
        const catName = catIdToName[p.category?.toString()] || 'Unknown';
        categoryMap[catName] = (categoryMap[catName] || 0) + 1;
    });

    const categoryDistribution = Object.keys(categoryMap).map(name => ({
        name,
        value: categoryMap[name]
    }));

    // 4. Recent Sales (Last 5)
    // Fetch specifically with populated fields if needed, or re-use basic find
    const latestSales = await Order.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .select('orderId customerName totalAmount createdAt status');

    // 5. Advanced Metrics
    const averageOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;
    
    // Low Stock List (Details)
    const lowStockProducts = allProducts
        .filter((p: any) => p.quantity < 10)
        .map((p: any) => ({ name: p.name, quantity: p.quantity, _id: p._id }))
        .slice(0, 5); // Limit to top 5 urgent

    // Top Selling Products (requires parsing items from orders)
    // Fetch items field which we didn't before
    const ordersWithItems = await Order.find({}, 'items');
    const productSalesMap: Record<string, number> = {};

    ordersWithItems.forEach((order: any) => {
        order.items?.forEach((item: any) => {
            productSalesMap[item.productName] = (productSalesMap[item.productName] || 0) + item.quantity;
        });
    });

    const topProducts = Object.keys(productSalesMap)
        .map(name => ({ name, sales: productSalesMap[name] }))
        .sort((a, b) => b.sales - a.sales)
        .slice(0, 5);

    // 6. Top Customers (by Total Spend)
    const customerSpendMap: Record<string, { name: string, total: number, orders: number }> = {};
    
    allOrders.forEach((order: any) => {
        // Use mobileNumber as unique key if available, else name
        const key = order.mobileNumber || order.customerName; 
        if (!customerSpendMap[key]) {
            customerSpendMap[key] = { 
                name: order.customerName, 
                total: 0, 
                orders: 0 
            };
        }
        customerSpendMap[key].total += (order.totalAmount || 0);
        customerSpendMap[key].orders += 1;
    });

    const topCustomers = Object.values(customerSpendMap)
        .sort((a, b) => b.total - a.total)
        .slice(0, 5);

    // 7. Weekly Sales Pattern (Day of Week)
    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const weeklyPatternMap = new Array(7).fill(0);

    allOrders.forEach((order: any) => {
        const date = new Date(order.createdAt);
        const dayIndex = date.getDay(); // 0 = Sun, 6 = Sat
        weeklyPatternMap[dayIndex] += (order.totalAmount || 0);
    });

    const weeklyPattern = daysOfWeek.map((day, index) => ({
        day,
        sales: weeklyPatternMap[index]
    }));

    // Daily Average (approximate based on first order date)
    let dailyAverage = 0;
    if (allOrders.length > 0) {
        const firstOrderDate = new Date(allOrders[allOrders.length - 1].createdAt); // Sorted desc by default? No, find returns natural order usually, but we haven't sorted allOrders. 
        // Let's find min date reliably
        const oldestOrder = await Order.findOne({}, {}, { sort: { 'createdAt': 1 } });
        if (oldestOrder) {
            const start = new Date(oldestOrder.createdAt);
            const now = new Date();
            const diffTime = Math.abs(now.getTime() - start.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
            dailyAverage = Math.round(totalRevenue / diffDays);
        }
    }


    return NextResponse.json({
        success: true,
        data: {
            metrics: {
                totalOrders,
                totalRevenue,
                inventoryValue,
                lowStockCount,
                averageOrderValue,
                dailyAverage
            },
            salesTrend,
            categoryDistribution,
            recentSales: latestSales,
            topProducts,
            lowStockProducts,
            topCustomers,
            weeklyPattern
        }
    });

  } catch (error: any) {
    console.error('Stats Error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
