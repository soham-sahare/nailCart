import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Order from '@/models/Order';
import Product from '@/models/Product';
import Category from '@/models/Category';
import Expense from '@/models/Expense';

export const dynamic = 'force-dynamic';

// Simple In-Memory Cache
const CACHE_TTL = 60 * 1000; // 60 seconds
let cache = {
  data: null,
  timestamp: 0,
  key: '' 
};

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const frequency = searchParams.get('frequency') || '7d';
    const cacheKey = `stats-${frequency}`;

    // Valid Cache Hit?
    const now = Date.now();
    if (cache.data && cache.key === cacheKey && (now - cache.timestamp < CACHE_TTL)) {
       return NextResponse.json({ success: true, data: cache.data, cached: true });
    }

    await dbConnect();

    // 1. Database Aggregation for Metrics & Charts
    // We use $facet to run multiple aggregations in parallel on the database side
    
    // Date ranges
    const today = new Date();
    
    let days = 7;
    if (frequency === '15d') days = 15;
    if (frequency === '1m') days = 30;
    if (frequency === '3m') days = 90;
    if (frequency === '6m') days = 180;
    if (frequency === '12m') days = 365;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [statsResult] = await Order.aggregate([
      {
        $facet: {
          // A. Global Metrics (Total Revenue, Orders)
          globalMetrics: [
            { $match: { status: { $ne: 'CANCELLED' }, type: 'SALE' } }, 
            { $group: { _id: null, totalRevenue: { $sum: '$totalAmount' }, totalOrders: { $count: {} } } }
          ],
          // B. Sales Trend output
          salesTrend: [
            { $match: { createdAt: { $gte: startDate }, status: { $ne: 'CANCELLED' } } },
            { $project: {
                date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                totalAmount: 1,
                items: 1,
                type: 1,
                returnType: 1
            }},
            { $sort: { date: 1 } }
          ],
          // C. Top Customers
          topCustomers: [
             { $match: { status: { $ne: 'CANCELLED' }, type: 'SALE' } },
             { $group: { 
                 _id: '$customerName', 
                 total: { $sum: '$totalAmount' }, 
                 orders: { $sum: 1 } 
             }},
             { $sort: { total: -1 } },
             { $limit: 5 }
          ],
          // D. Top Products
          topProducts: [
            { $match: { status: { $ne: 'CANCELLED' } } },
            { $unwind: '$items' },
            { $group: {
                _id: '$items.productName',
                sales: { $sum: '$items.quantity' }
            }},
            { $sort: { sales: -1 } },
            { $limit: 5 }
          ],
          // E. Recent Sales
          recentSales: [
              { $sort: { createdAt: -1 } },
              { $limit: 5 },
              { $project: { orderId: 1, customerName: 1, totalAmount: 1, createdAt: 1, status: 1 } }
          ],
          // F. Weekly Pattern
          weeklyPattern: [
              { $match: { status: { $ne: 'CANCELLED' }, type: 'SALE' } },
              { $project: { dayOfWeek: { $dayOfWeek: '$createdAt' }, totalAmount: 1 } },
              { $group: { _id: '$dayOfWeek', sales: { $sum: '$totalAmount' } } },
              { $sort: { _id: 1 } }
          ]
        }
      }
    ]);

    // Inventory Stats
    const [productStats] = await Product.aggregate([
      {
        $facet: {
          inventoryValue: [
             { $project: { value: { $multiply: ['$costPrice', '$quantity'] } } },
             { $group: { _id: null, total: { $sum: '$value' } } }
          ],
          lowStock: [
              { $match: { quantity: { $lt: 10 } } },
              { $limit: 5 },
              { $project: { name: 1, quantity: 1 } }
          ],
          lowStockCount: [
              { $match: { quantity: { $lt: 10 } } },
              { $count: 'count' }
          ],
          categoryBreakdown: [ 
             { $group: { _id: '$category', count: { $sum: 1 } } }
          ]
        }
      }
    ]);

    // Expense Stats
    const [expenseStats] = await Expense.aggregate([
      {
         $match: { date: { $gte: startDate } }
      },
      {
         $group: { _id: null, total: { $sum: '$amount' } }
      }
    ]) || [{ total: 0 }]; // Fallback if no expenses
    
    // --- Post-Processing ---

    const metrics = statsResult.globalMetrics[0] || { totalRevenue: 0, totalOrders: 0 };
    const invValue = productStats.inventoryValue[0]?.total || 0;
    const lowCount = productStats.lowStockCount[0]?.count || 0;

    // Daily Average
    let dailyAverage = 0;
    if (metrics.totalOrders > 0) {
        const oldestOrder = await Order.findOne({}, 'createdAt').sort({ createdAt: 1 }).lean();
        if (oldestOrder) {
            const start = new Date(oldestOrder.createdAt as any);
            const diffDays = Math.max(1, Math.ceil((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
            dailyAverage = Math.round(metrics.totalRevenue / diffDays);
        }
    }

    // Process Sales Trend Logic 
    const salesMap: Record<string, { sales: number, cost: number, profit: number }> = {};
    
    // Fill Dates
    for(let i=days-1; i>=0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const isLongRange = days > 60;
        const isoKeys = d.toISOString().split('T')[0];
        salesMap[isoKeys] = { sales: 0, cost: 0, profit: 0 };
    }

    statsResult.salesTrend.forEach((order: any) => {
        const dateKey = order.date; // YYYY-MM-DD
        if (salesMap[dateKey]) {
            if (order.type === 'RETURN') {
                let returnCost = 0;
                if (order.items) {
                    order.items.forEach((item: any) => {
                         returnCost += (item.costPrice || 0) * item.quantity;
                    });
                }
                
                if (order.returnType === 'RESTOCK') {
                    salesMap[dateKey].profit -= (order.totalAmount - returnCost);
                } else {
                    salesMap[dateKey].profit -= order.totalAmount;
                }
            } else {
                let orderCost = 0;
                 if (order.items) {
                    order.items.forEach((item: any) => {
                         orderCost += (item.costPrice || 0) * item.quantity;
                    });
                }
                salesMap[dateKey].sales += order.totalAmount;
                salesMap[dateKey].profit += (order.totalAmount - orderCost);
            }
        }
    });

    // Format Trend for Frontend
    const formattedTrend = Object.keys(salesMap).sort().map(isoDate => {
        const d = new Date(isoDate);
        const isLongRange = days > 60;
        const displayDate = isLongRange 
            ? d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }) 
            : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });

        return {
            date: displayDate,
            sellingPrice: salesMap[isoDate].sales,
            costPrice: salesMap[isoDate].cost,
            profit: salesMap[isoDate].profit
        };
    });

    // Formatting other arrays
    const topCustomers = statsResult.topCustomers.map((c: any) => ({ name: c._id, total: c.total, orders: c.orders }));
    const topProducts = statsResult.topProducts.map((p: any) => ({ name: p._id, sales: p.sales }));
    const lowStockProducts = productStats.lowStock;
    
    // Category (Populate Names) 
    const categories = await Category.find({}, 'name').lean();
    const catMap: Record<string, string> = {};
    categories.forEach((c: any) => catMap[c._id.toString()] = c.name);

    const categoryDistribution = productStats.categoryBreakdown.map((c: any) => ({
        name: catMap[c._id.toString()] || 'Unknown',
        value: c.count
    }));

    // Weekly Pattern Formatting
    const dayLabels = ['', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']; 
    const weeklyPattern = new Array(7).fill(0).map((_, i) => ({ day: dayLabels[i+1], sales: 0 }));
    statsResult.weeklyPattern.forEach((w: any) => {
        if (weeklyPattern[w._id - 1]) {
            weeklyPattern[w._id - 1].sales = w.sales;
        }
    });
    
    const totalExpenses = expenseStats?.total || 0;
    
    // Calculate Gross Profit from SalesTrend Map
    let totalGrossProfit = 0;
    Object.values(salesMap).forEach(v => totalGrossProfit += v.profit);
    
    const netProfit = totalGrossProfit - totalExpenses;

    const responseData = {
        metrics: {
            totalOrders: metrics.totalOrders,
            totalRevenue: metrics.totalRevenue,
            inventoryValue: invValue,
            lowStockCount: lowCount,
            averageOrderValue: metrics.totalOrders > 0 ? Math.round(metrics.totalRevenue / metrics.totalOrders) : 0,
            dailyAverage,
            totalExpenses,
            netProfit,
            grossProfit: totalGrossProfit // Explicitly send gross profit too
        },
        salesTrend: formattedTrend,
        categoryDistribution,
        recentSales: statsResult.recentSales,
        topProducts,
        lowStockProducts,
        topCustomers,
        weeklyPattern
    };

    // Update Cache
    cache = {
        data: responseData as any,
        timestamp: now,
        key: cacheKey
    };

    return NextResponse.json({
        success: true,
        data: responseData
    });

  } catch (error: any) {
    console.error('Stats Error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
