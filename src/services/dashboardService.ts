import dbConnect from '@/lib/db';
import Order from '@/models/Order';
import Product from '@/models/Product';
import Category from '@/models/Category';
import Expense from '@/models/Expense';
import { unstable_cache } from 'next/cache';

// Shared Helper for Date Range
function getDateRange(range: string, fromParam?: string | null, toParam?: string | null) {
    let startDate = new Date();
    let endDate = new Date(); 
    
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);

    if (range === 'custom' && fromParam && toParam) {
        startDate = new Date(fromParam);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(toParam);
        endDate.setHours(23, 59, 59, 999);
    } else if (range === '1d') {
        // Today
    } else if (range === 'yesterday') {
        startDate.setDate(startDate.getDate() - 1);
        endDate.setDate(endDate.getDate() - 1);
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
    } else if (range === '3d') {
        startDate.setDate(startDate.getDate() - 2); 
    } else if (range === '7d') {
        startDate.setDate(startDate.getDate() - 6);
    } else if (range === '15d') {
        startDate.setDate(startDate.getDate() - 14);
    } else if (range === '1m' || range === '30d') {
        startDate.setDate(startDate.getDate() - 29);
    } else if (range === 'this_month') {
        startDate.setDate(1); 
    } else if (range === 'all_time') {
        // Must handle async separately if using await inside helper, 
        // but for simplicity we'll just set a far past date or rely on caller to refine
        // NOTE: For 'all_time' with dynamic DB fetch, it's better handled inside functions
        startDate = new Date('2023-01-01'); // Fallback default
    }
    return { startDate, endDate };
}

// 1. Global Metrics
export const getGlobalMetrics = async (range: string, from?: string | null, to?: string | null) => {
    await dbConnect();
    const { startDate, endDate } = getDateRange(range, from, to);
    
    // Handle All Time Dynamic Start
    if (range === 'all_time') {
         const oldestOrder = await Order.findOne({}, { createdAt: 1 }).sort({ createdAt: 1 }).lean() as any;
         if (oldestOrder && oldestOrder.createdAt) {
             const d = new Date(oldestOrder.createdAt);
             d.setHours(0,0,0,0);
             // Mutate local var for query
             startDate.setTime(d.getTime());
         }
    }

    const dateFilter = { $gte: startDate, $lte: endDate };
    const orderMatch = { status: { $ne: 'CANCELLED' }, createdAt: dateFilter };
    
    const [stats, expenseStats, profitAgg] = await Promise.all([
        Order.aggregate([
            { $match: orderMatch }, 
            { $group: { 
                _id: null, 
                totalRevenue: { 
                    $sum: { $cond: [{ $eq: ["$type", "SALE"] }, "$totalAmount", { $multiply: ["$totalAmount", -1] }] } 
                },
                totalOrders: { 
                    $sum: { $cond: [{ $eq: ["$type", "SALE"] }, 1, 0] } 
                } 
            }}
        ]),
        Expense.aggregate([
            { $match: { date: dateFilter } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]),
        // Profit Calculation (Sales Profit - Return Refund loss)
        Order.aggregate([
            { $match: orderMatch },
            { $project: {
                type: 1,
                items: 1, 
                totalAmount: 1
            }},
            { $project: {
                revenue: { $cond: [{ $eq: ["$type", "SALE"] }, "$totalAmount", { $multiply: ["$totalAmount", -1] }] },
                cost: { 
                     $sum: { 
                        $map: { 
                            input: "$items", 
                            as: "item", 
                            in: { $multiply: [ { $ifNull: ["$$item.costPrice", 0] }, "$$item.quantity" ] } 
                        } 
                    } 
                },
                type: 1
            }},
            { $group: { 
                _id: null, 
                totalProfit: { 
                    $sum: { 
                        $cond: [
                            { $eq: ["$type", "SALE"] }, 
                            { $subtract: ["$revenue", "$cost"] }, // Profit from sale
                            { $subtract: ["$revenue", { $multiply: ["$cost", -1] }] } // Loss from return
                        ] 
                    } 
                } 
            }}
        ])
    ]);

    const metrics = stats[0] || { totalRevenue: 0, totalOrders: 0 };
    const totalExpenses = expenseStats[0]?.total || 0;
    const totalGrossProfit = profitAgg[0]?.totalProfit || 0;

    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1; 
    const dailyAverage = Math.round(metrics.totalRevenue / diffDays);
    const netProfit = totalGrossProfit - totalExpenses;

    return {
        totalOrders: metrics.totalOrders,
        totalRevenue: metrics.totalRevenue,
        grossProfit: totalGrossProfit, 
        netProfit: netProfit,
        totalExpenses: totalExpenses,
        inventoryValue: 0, // Fetched in Inventory Stats
        lowStockCount: 0,  // Fetched in Inventory Stats
        averageOrderValue: metrics.totalOrders > 0 ? Math.round(metrics.totalRevenue / metrics.totalOrders) : 0,
        dailyAverage
    };
};

// 2. Sales Trend
export const getSalesTrend = async (range: string, from?: string | null, to?: string | null) => {
    await dbConnect();
    const { startDate, endDate } = getDateRange(range, from, to);
     // Handle All Time
    if (range === 'all_time') {
         const oldestOrder = await Order.findOne({}, { createdAt: 1 }).sort({ createdAt: 1 }).lean() as any;
         if (oldestOrder && oldestOrder.createdAt) {
             const d = new Date(oldestOrder.createdAt);
             d.setHours(0,0,0,0);
             startDate.setTime(d.getTime());
         }
    }
    
    const dateFilter = { $gte: startDate, $lte: endDate };

    const salesTrend = await Order.aggregate([
        { $match: { createdAt: dateFilter, status: { $ne: 'CANCELLED' } } },
        { $project: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "+05:30" } },
            totalAmount: 1,
            type: 1,
            cost: { 
                $sum: { $map: { input: "$items", as: "item", in: { $multiply: [ { $ifNull: ["$$item.costPrice", 0] }, "$$item.quantity" ] } } } 
            },
        }},
        { $group: {
            _id: "$date",
            sales: { 
                $sum: { 
                    $cond: [ 
                        { $eq: ["$type", "SALE"] }, 
                        "$totalAmount", 
                        { $multiply: ["$totalAmount", -1] } 
                    ] 
                } 
            },
            cost: { 
                $sum: { 
                    $cond: [ 
                        { $eq: ["$type", "SALE"] }, 
                        "$cost", 
                        { $multiply: ["$cost", -1] } 
                    ] 
                } 
            },
            orders: { $sum: { $cond: [ { $eq: ["$type", "SALE"] }, 1, 0 ] } }
        }},
        { $addFields: {
            profit: { $subtract: ["$sales", "$cost"] },
            sellingPrice: "$sales",
            costPrice: "$cost"
        }},
        { $sort: { _id: 1 } }
    ]);

    return salesTrend.map((day: any) => ({
        date: day._id,
        sellingPrice: day.sellingPrice,
        costPrice: day.costPrice,
        profit: day.profit,
        orders: day.orders
    }));
};

// 3. Top Products
export const getTopProducts = async (range: string, from?: string | null, to?: string | null) => {
    await dbConnect();
    const { startDate, endDate } = getDateRange(range, from, to);
    if (range === 'all_time') { /* logic same as above if needed, but simplified */ }
    
    const dateFilter = { $gte: startDate, $lte: endDate };
    
    const topProducts = await Order.aggregate([
        { $match: { status: { $ne: 'CANCELLED' }, createdAt: dateFilter } },
        { $unwind: '$items' },
        { $group: { _id: '$items.productName', sales: { $sum: '$items.quantity' }, sku: { $first: '$items.sku' } } },
        { $sort: { sales: -1 } },
        { $limit: 5 }
    ]);
    
    return topProducts.map((p: any) => ({ name: p._id, sales: p.sales, sku: p.sku }));
};

// 4. Inventory Stats (OPTIMIZED: NO FACET)
export const getInventoryStats = async () => {
    await dbConnect();
    
    // Run independent efficient queries 
    const categories = await Category.find({}, 'name').lean() as any[];
    const blockedCatIds = categories
        .filter(c => ['GEL POLISH KIT', 'GEL POLISHES'].includes(c.name))
        .map(c => c._id);

    const [inventorySum, lowStockItems, lowStockCount, categoryStats] = await Promise.all([
        // A. Total Value
        Product.aggregate([
            { $project: { value: { $multiply: ['$costPrice', '$quantity'] } } },
            { $group: { _id: null, total: { $sum: '$value' } } }
        ]),
        // B. Low Stock List (Filtered)
        Product.find({ 
            quantity: { $lte: 5 },
            category: { $nin: blockedCatIds }
        }).select('name quantity sku').lean(),
        // C. Low Stock Count
        Product.countDocuments({ 
            quantity: { $lte: 5 },
            category: { $nin: blockedCatIds }
        }),
        // D. Category Breakdown
        Product.aggregate([
            { $group: { _id: '$category', count: { $sum: 1 } } }
        ])
    ]);


    // Ensure _id is a string for Client Components
    const serializedLowStock = lowStockItems.map((p: any) => ({
        ...p,
        _id: p._id.toString()
    }));

    
    const totalValue = inventorySum[0]?.total || 0;
    const lowStockCountFinal = lowStockCount;
    
    const catMap: Record<string, string> = {};
    categories.forEach((c: any) => catMap[c._id.toString()] = c.name);

    const categoryBreakdown = categoryStats.map((c: any) => ({
        name: catMap[c._id.toString()] || 'Unknown',
        value: c.count
    }));

    return {
        inventoryValue: totalValue,
        lowStockCount: lowStockCountFinal,
        lowStockProducts: serializedLowStock,
        categoryBreakdown
    };

};

// 5. Lists (Customers, Top Sellers, Recent)
export const getSecondaryStats = async (range: string, from?: string | null, to?: string | null) => {
    await dbConnect();
    const { startDate, endDate } = getDateRange(range, from, to);
    const dateFilter = { $gte: startDate, $lte: endDate };
    const orderMatch = { status: { $ne: 'CANCELLED' }, createdAt: dateFilter };

    const [topCustomersRaw, topSellersRaw, recentSalesRaw] = await Promise.all([
         Order.aggregate([
             { $match: orderMatch },
             { $group: { 
                 _id: '$mobileNumber', 
                 name: { $first: '$customerName' }, 
                 total: { 
                     $sum: { $cond: [{ $eq: ["$type", "SALE"] }, "$totalAmount", { $multiply: ["$totalAmount", -1] }] } 
                 }, 
                 orders: { $sum: { $cond: [{ $eq: ["$type", "SALE"] }, 1, 0] } } 
             } },
             { $sort: { total: -1 } },
             { $limit: 5 }
         ]),
         Order.aggregate([
            { $match: orderMatch },
            { $group: { 
                _id: '$createdBy', 
                total: { 
                    $sum: { $cond: [{ $eq: ["$type", "SALE"] }, "$totalAmount", { $multiply: ["$totalAmount", -1] }] } 
                }, 
                count: { $sum: { $cond: [{ $eq: ["$type", "SALE"] }, 1, 0] } } 
            } },
            { $sort: { total: -1 } },
            { $limit: 5 }
         ]),
         Order.find({ createdAt: dateFilter })
            .sort({ createdAt: -1 })
            .limit(5)
            .select('orderId customerName totalAmount createdAt status')
            .lean()
    ]);

    // Ensure _id is a string for Client Components
    const serializedRecentSales = recentSalesRaw.map((s: any) => ({
        ...s,
        _id: s._id.toString()
    }));


    // Normalize Customers
    const normalizeMobile = (num: string) => num.replace(/^(\+91|91)/, '').replace(/\s/g, '');
    const customerMap: Record<string, {name: string, total: number, orders: number}> = {};
    topCustomersRaw.forEach((c: any) => {
        if (!c._id) return;
        const normalized = normalizeMobile(c._id.toString());
        if (!customerMap[normalized]) {
            customerMap[normalized] = { name: c.name || 'Unknown', total: 0, orders: 0 };
        }
        customerMap[normalized].total += c.total;
        customerMap[normalized].orders += c.orders;
    });
    
    return {
        topCustomers: Object.values(customerMap).filter(c => c.orders > 1).sort((a,b) => b.total - a.total).slice(0, 5),
        topSellers: topSellersRaw.map((s: any) => ({ name: s._id, value: s.count, total: s.total })),
        recentSales: serializedRecentSales
    };

};

// 6. Top Categories
export const getTopCategories = async (range: string, from?: string | null, to?: string | null) => {
    await dbConnect();
    const { startDate, endDate } = getDateRange(range, from, to);
    const dateFilter = { $gte: startDate, $lte: endDate };

    const cats = await Order.aggregate([
        { $match: { status: { $ne: 'CANCELLED' }, createdAt: dateFilter } },
        { $unwind: '$items' },
        { $group: { 
            _id: { $ifNull: ['$items.category', 'Uncategorized'] }, 
            sales: { 
                $sum: { $cond: [{ $eq: ["$type", "SALE"] }, "$items.quantity", { $multiply: ["$items.quantity", -1] }] } 
            } 
        } },
        { $sort: { sales: -1 } },
        { $limit: 8 }
    ]);
    
    return cats.map((c: any) => ({ name: c._id, value: c.sales }));
};

// 7. Weekly Pattern
export const getWeeklyPattern = async (range: string, from?: string | null, to?: string | null) => {
    await dbConnect();
    const { startDate, endDate } = getDateRange(range, from, to);
    
    const pattern = await Order.aggregate([
          { $match: { status: { $ne: 'CANCELLED' }, createdAt: { $gte: startDate, $lte: endDate } } },
          { $project: { 
              dayOfWeek: { $dayOfWeek: { date: '$createdAt', timezone: "+05:30" } }, 
              amount: { $cond: [{ $eq: ["$type", "SALE"] }, "$totalAmount", { $multiply: ["$totalAmount", -1] }] }
          } },
          { $group: { _id: '$dayOfWeek', sales: { $sum: '$amount' } } },
          { $sort: { _id: 1 } }
    ]);
    
    const dayLabels = ['', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']; 
    const result = new Array(7).fill(0).map((_, i) => ({ day: dayLabels[i+1], sales: 0 }));
    pattern.forEach((w: any) => {
        if (result[w._id - 1]) result[w._id - 1].sales = w.sales;
    });
    return result;
};


// Legacy Wrapper (Deprecated but kept for compat if needed, though we will refactor page)
export const getDashboardStats = unstable_cache(
  async (range: string, fromParam?: string | null, toParam?: string | null) => {
    
    // Parallel Execution of Granular Functions
    const [metrics, trend, topProds, inv, secondary, topCats, pattern] = await Promise.all([
        getGlobalMetrics(range, fromParam, toParam),
        getSalesTrend(range, fromParam, toParam),
        getTopProducts(range, fromParam, toParam),
        getInventoryStats(),
        getSecondaryStats(range, fromParam, toParam),
        getTopCategories(range, fromParam, toParam),
        getWeeklyPattern(range, fromParam, toParam)
    ]);

    return {
        metrics: {
            ...metrics,
            inventoryValue: inv.inventoryValue,
            lowStockCount: inv.lowStockCount
        },
        salesTrend: trend,
        categoryDistribution: inv.categoryBreakdown,
        recentSales: secondary.recentSales,
        topProducts: topProds,
        topCustomers: secondary.topCustomers,
        topSellers: secondary.topSellers,
        topCategories: topCats,
        lowStockProducts: inv.lowStockProducts,
        weeklyPattern: pattern
    };
  },
  ['dashboard-stats'], 
  { revalidate: 300, tags: ['dashboard'] }
);
