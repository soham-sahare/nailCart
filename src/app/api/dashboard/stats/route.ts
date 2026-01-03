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
    const range = searchParams.get('range') || 'this_month';
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');

    // 1. Determine Date Range
    let startDate = new Date();
    let endDate = new Date(); // Defaults to now/today
    
    // Reset times for accurate day-based filtering
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);

    if (range === 'custom' && fromParam && toParam) {
        startDate = new Date(fromParam);
        startDate.setHours(0, 0, 0, 0);
        
        endDate = new Date(toParam);
        endDate.setHours(23, 59, 59, 999);
    } else if (range === '1d') {
        // Today: Start 00:00 to End 23:59
    } else if (range === 'yesterday') {
        startDate.setDate(startDate.getDate() - 1);
        endDate.setDate(endDate.getDate() - 1);
    } else if (range === '3d') {
        startDate.setDate(startDate.getDate() - 2); 
    } else if (range === '7d') {
        startDate.setDate(startDate.getDate() - 6);
    } else if (range === '15d') {
        startDate.setDate(startDate.getDate() - 14);
    } else if (range === '1m' || range === '30d') {
        startDate.setDate(startDate.getDate() - 29);
    } else if (range === 'this_month') {
        startDate.setDate(1); // 1st of current month
    } else if (range === 'all_time') {
        startDate = new Date(0); // Epoch (1970) to include everything
    }

    const cacheKey = `stats-${range}-${startDate.toISOString()}-${endDate.toISOString()}`;

    // Valid Cache Hit?
    const now = Date.now();
    if (cache.data && cache.key === cacheKey && (now - cache.timestamp < CACHE_TTL)) {
       return NextResponse.json({ success: true, data: cache.data, cached: true });
    }

    await dbConnect();

    // 2. Database Aggregation
    const dateFilter = { $gte: startDate, $lte: endDate };

    const [statsResult] = await Order.aggregate([
      {
        $facet: {
          // A. Global Metrics
          globalMetrics: [
            { $match: { 
                status: { $ne: 'CANCELLED' }, 
                type: 'SALE',
                createdAt: dateFilter 
            }}, 
            { $group: { _id: null, totalRevenue: { $sum: '$totalAmount' }, totalOrders: { $count: {} } } }
          ],
          // B. Sales Trend (Raw Data for JS processing)
          salesTrend: [
            { $match: { createdAt: dateFilter, status: { $ne: 'CANCELLED' } } },
            { $project: {
                date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "+05:30" } },
                totalAmount: 1,
                items: 1,
                type: 1,
                returnType: 1
            }},
            { $sort: { date: 1 } }
          ],
          // C. Top Customers (By Mobile, raw fetch for JS normalization)
          topCustomers: [
             { $match: { status: { $ne: 'CANCELLED' }, type: 'SALE', createdAt: dateFilter } },
             { $group: { 
                 _id: '$mobileNumber', 
                 name: { $first: '$customerName' },
                 total: { $sum: '$totalAmount' }, 
                 orders: { $sum: 1 } 
             }},
             { $sort: { total: -1 } },
             { $limit: 20 } // Fetch more to allow for merging/filtering
          ],
          // D. Top Products
          topProducts: [
            { $match: { status: { $ne: 'CANCELLED' }, createdAt: dateFilter } },
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
              { $match: { createdAt: dateFilter } },
              { $sort: { createdAt: -1 } },
              { $limit: 5 },
              { $project: { orderId: 1, customerName: 1, totalAmount: 1, createdAt: 1, status: 1 } }
          ],
          // F. Weekly Pattern
          weeklyPattern: [
              { $match: { status: { $ne: 'CANCELLED' }, type: 'SALE', createdAt: dateFilter } },
              { $project: { dayOfWeek: { $dayOfWeek: { date: '$createdAt', timezone: "+05:30" } }, totalAmount: 1 } },
              { $group: { _id: '$dayOfWeek', sales: { $sum: '$totalAmount' } } },
              { $sort: { _id: 1 } }
          ],
          // G. Top Sellers
          topSellers: [
            { $match: { status: { $ne: 'CANCELLED' }, type: 'SALE', createdAt: dateFilter } },
            { $group: { _id: '$createdBy', total: { $sum: '$totalAmount' }, count: { $sum: 1 } } },
            { $sort: { total: -1 } },
            { $limit: 5 }
          ],
          // H. Top Categories
// H. Top Categories
          topCategories: [
            { $match: { status: { $ne: 'CANCELLED' }, type: 'SALE', createdAt: dateFilter } },
            { $unwind: '$items' },
            // 1. Lookup Product
            {
               $lookup: {
                  from: 'products', 
                  localField: 'items.productName',
                  foreignField: 'name',
                  as: 'productInfo'
               }
            },
            { $unwind: { path: '$productInfo', preserveNullAndEmptyArrays: true } },
            // 2. Lookup Category (using Product's category ID)
            {
               $lookup: {
                  from: 'categories',
                  localField: 'productInfo.category',
                  foreignField: '_id',
                  as: 'categoryInfo'
               }
            },
            // 3. Resolve Name
            {
               $project: {
                  categoryName: {
                      $cond: {
                          if: { $gt: [{ $strLenCP: { $ifNull: ["$items.category", ""] } }, 0] },
                          then: "$items.category",
                          else: { $arrayElemAt: ["$categoryInfo.name", 0] }
                      }
                  },
                  quantity: '$items.quantity'
               }
            },
            { $group: { _id: { $ifNull: ['$categoryName', 'Uncategorized'] }, sales: { $sum: '$quantity' } } },
            { $sort: { sales: -1 } },
            { $limit: 8 }
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
              { $match: { quantity: { $lte: 6 } } },
              { $project: { name: 1, quantity: 1 } }
          ],
          lowStockCount: [
              { $match: { quantity: { $lte: 6 } } },
              { $count: 'count' }
          ],
          categoryBreakdown: [ 
             { $group: { _id: '$category', count: { $sum: 1 } } }
          ]
        }
      }
    ]);

    // Expense Stats (Date Dependent)
    const expenseStats = await Expense.aggregate([
      {
         $match: { date: dateFilter }
      },
      {
         $group: { _id: null, total: { $sum: '$amount' } }
      }
    ]); 
    
    // --- Post-Processing ---

    const metrics = statsResult.globalMetrics[0] || { totalRevenue: 0, totalOrders: 0 };
    const invValue = productStats.inventoryValue[0]?.total || 0;
    const lowCount = productStats.lowStockCount[0]?.count || 0;

    // Daily Average (over the selected range duration)
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1; 
    // Note: for 'today', diff is <1 day if we use Date.now(), but we set hours 0-23. So diff is ~1 day (23.99 hrs). 
    // Math.ceil will make it 1. 
    const dailyAverage = Math.round(metrics.totalRevenue / diffDays);

    // Process Sales Trend & Profit
    const salesMap: Record<string, { sales: number, cost: number, profit: number, orders: number }> = {};
    
    // Pre-fill dates for continuous graph
    let currentDateLoop = new Date(startDate);
    while (currentDateLoop <= endDate) {
        // Use Local Date String (IST) to match aggregation
        const year = currentDateLoop.getFullYear();
        const month = String(currentDateLoop.getMonth() + 1).padStart(2, '0');
        const day = String(currentDateLoop.getDate()).padStart(2, '0');
        const dateKey = `${year}-${month}-${day}`;
        
        salesMap[dateKey] = { sales: 0, cost: 0, profit: 0, orders: 0 };
        currentDateLoop.setDate(currentDateLoop.getDate() + 1);
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
                salesMap[dateKey].orders += 1;
            }
        }
    });

    // Format Trend for Frontend
    const formattedTrend = Object.keys(salesMap).sort().map(isoDate => {
        const d = new Date(isoDate);
        return {
            date: d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
            sellingPrice: salesMap[isoDate].sales,
            costPrice: salesMap[isoDate].cost,
            profit: salesMap[isoDate].profit,
            orders: salesMap[isoDate].orders
        };
    });

    // Top Customers Normalization
    const normalizeMobile = (num: string) => {
        return num.replace(/^(\+91|91)/, '').replace(/\s/g, ''); // Remove +91, 91 and spaces
    };

    const customerMap: Record<string, {name: string, total: number, orders: number}> = {};
    statsResult.topCustomers.forEach((c: any) => {
        if (!c._id) return;
        const normalized = normalizeMobile(c._id.toString());
        if (!customerMap[normalized]) {
            customerMap[normalized] = { name: c.name || 'Unknown', total: 0, orders: 0 };
        }
        customerMap[normalized].total += c.total;
        customerMap[normalized].orders += c.orders;
    });
    
    const topCustomers = Object.values(customerMap)
        .filter(c => c.orders > 1) // Only repeated
        .sort((a,b) => b.total - a.total)
        .slice(0, 5);

    const topProducts = statsResult.topProducts.map((p: any) => ({ name: p._id, sales: p.sales }));
    const topSellers = statsResult.topSellers.map((s: any) => ({ name: s._id, value: s.count, total: s.total }));
    const lowStockProducts = productStats.lowStock;
    
    // Category Heatmap data
    const topCategories = statsResult.topCategories.map((c: any) => ({
        name: c._id || 'Uncategorized',
        value: c.sales
    }));

    // Category Distribution (Inventory) - Keep existing logic or replace? 
    // Existing logic uses `productStats` which is INVENTORY based. 
    // User requested "heatmap of top categories". I assume sales based (which I fetched in topCategories).
    // I will pass `topCategories` separately for heatmap.
    
    // Populate Names for Inventory Distribution (existing code)
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
    
    const totalExpenses = expenseStats[0]?.total || 0;
    
    // Calculate Total Gross Profit from SalesTrend Map (aggregated)
    let totalGrossProfit = 0;
    Object.values(salesMap).forEach(v => totalGrossProfit += v.profit);
    
    const netProfit = totalGrossProfit - totalExpenses;

    const responseData = {
        metrics: {
            totalOrders: metrics.totalOrders,
            totalRevenue: metrics.totalRevenue,
            grossProfit: totalGrossProfit, 
            netProfit: netProfit,
            totalExpenses: totalExpenses,
            inventoryValue: invValue,
            lowStockCount: lowCount,
            averageOrderValue: metrics.totalOrders > 0 ? Math.round(metrics.totalRevenue / metrics.totalOrders) : 0,
            dailyAverage
        },
        salesTrend: formattedTrend,
        categoryDistribution,
        recentSales: statsResult.recentSales,
        topProducts,
        topCustomers,
        topSellers,
        topCategories, // New
        lowStockProducts,
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
