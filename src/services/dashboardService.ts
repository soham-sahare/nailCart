import dbConnect from '@/lib/db';
import Order from '@/models/Order';
import Product from '@/models/Product';
import Category from '@/models/Category';
import Expense from '@/models/Expense';
import { unstable_cache } from 'next/cache';

export const getDashboardStats = unstable_cache(
  async (range: string, fromParam?: string | null, toParam?: string | null) => {
    await dbConnect();

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
        // Ensure yesterday starts at 00:00 and ends at 23:59 OF YESTERDAY
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
        startDate.setDate(1); // 1st of current month
    } else if (range === 'all_time') {
        const oldestOrder = await Order.findOne({}, { createdAt: 1 }).sort({ createdAt: 1 }).lean();
        if (oldestOrder) {
           startDate = new Date(oldestOrder.createdAt);
           startDate.setHours(0, 0, 0, 0); // Start of that day
        } else {
           startDate.setMonth(startDate.getMonth() - 1); // Default to 1 month if no orders
        }
    }

    // 2. Parallel Database Aggregations for High Performance (Flattened $facet)
    const dateFilter = { $gte: startDate, $lte: endDate };
    const saleMatch = { status: { $ne: 'CANCELLED' }, type: 'SALE', createdAt: dateFilter };

    const [
      globalMetrics,
      salesTrendRaw,
      topCustomersRaw,
      topProductsRaw,
      recentSales,
      weeklyPatternRaw,
      topSellersRaw,
      topCategoriesRaw,
      productStats,
      expenseStats
    ] = await Promise.all([
      // A. Global Metrics
      Order.aggregate([
        { $match: saleMatch }, 
        { $group: { _id: null, totalRevenue: { $sum: '$totalAmount' }, totalOrders: { $count: {} } } }
      ]),

      // B. Sales Trend (Aggregated by Date in MongoDB)
      Order.aggregate([
        { $match: { createdAt: dateFilter, status: { $ne: 'CANCELLED' } } },
        { $project: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "+05:30" } },
            totalAmount: 1,
            // Cost calculation - assuming items map has valid costPrice or default 0
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
            _id: "$date",
            sales: { 
                $sum: { 
                    $cond: [ { $eq: ["$type", "SALE"] }, "$totalAmount", 0 ] 
                } 
            },
            cost: {
                $sum: {
                     $cond: [ { $eq: ["$type", "SALE"] }, "$cost", 0 ] 
                }
            },
            orders: { 
                $sum: { 
                    $cond: [ { $eq: ["$type", "SALE"] }, 1, 0 ] 
                } 
            }
        }},
        { $addFields: {
            profit: { $subtract: ["$sales", "$cost"] },
            sellingPrice: "$sales", // Alias for frontend compatibility
            costPrice: "$cost"      // Alias for frontend compatibility
        }},
        { $sort: { _id: 1 } }
      ]),

      // C. Top Customers
      Order.aggregate([
         { $match: saleMatch },
         { $group: { 
             _id: '$mobileNumber', 
             name: { $first: '$customerName' },
             total: { $sum: '$totalAmount' }, 
             orders: { $sum: 1 } 
         }},
         { $sort: { total: -1 } },
         { $limit: 5 }
      ]),

      // D. Top Products
      Order.aggregate([
        { $match: { status: { $ne: 'CANCELLED' }, createdAt: dateFilter } },
        { $unwind: '$items' },
        { $group: {
            _id: '$items.productName',
            sales: { $sum: '$items.quantity' }
        }},
        { $sort: { sales: -1 } },
        { $limit: 5 }
      ]),

      // E. Recent Sales
      Order.find({ createdAt: dateFilter })
           .sort({ createdAt: -1 })
           .limit(5)
           .select('orderId customerName totalAmount createdAt status')
           .lean(),

      // F. Weekly Pattern
      Order.aggregate([
          { $match: saleMatch },
          { $project: { dayOfWeek: { $dayOfWeek: { date: '$createdAt', timezone: "+05:30" } }, totalAmount: 1 } },
          { $group: { _id: '$dayOfWeek', sales: { $sum: '$totalAmount' } } },
          { $sort: { _id: 1 } }
      ]),

      // G. Top Sellers
      Order.aggregate([
        { $match: saleMatch },
        { $group: { _id: '$createdBy', total: { $sum: '$totalAmount' }, count: { $sum: 1 } } },
        { $sort: { total: -1 } },
        { $limit: 5 }
      ]),

      // H. Top Categories
      Order.aggregate([
        { $match: saleMatch },
        { $unwind: '$items' },
        { 
           $group: { 
               _id: { $ifNull: ['$items.category', 'Uncategorized'] }, 
               sales: { $sum: '$items.quantity' } 
           } 
        },
        { $sort: { sales: -1 } },
        { $limit: 8 }
      ]),

      // Inventory Stats (Independent)
      Product.aggregate([
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
      ]),

      // Expense Stats
      Expense.aggregate([
        { $match: { date: dateFilter } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ])
    ]); 

    // --- Post-Processing ---
    // Cast results from Promise.all which returns unknown[]
    const metricsResult = globalMetrics[0] as any || { totalRevenue: 0, totalOrders: 0 };
    const salesTrend = salesTrendRaw as any[];
    const topCustomersList = topCustomersRaw as any[];
    const topProductsList = topProductsRaw as any[];
    const recentSalesList = recentSales as any[];
    const weeklyPatternList = weeklyPatternRaw as any[];
    const topSellersList = topSellersRaw as any[];
    const topCategoriesList = topCategoriesRaw as any[];
    const productStatsData = productStats[0] as any || {};
    const expenseStatsData = expenseStats as any[];

    const metrics = {
        totalRevenue: metricsResult.totalRevenue || 0,
        totalOrders: metricsResult.totalOrders || 0
    };
    
    // Inventory
    const invValue = productStatsData.inventoryValue?.[0]?.total || 0;
    const lowCount = productStatsData.lowStockCount?.[0]?.count || 0;

    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1; 
    const dailyAverage = Math.round(metrics.totalRevenue / diffDays);

    // Sales Trend: Now fully calculated in Mongo, returning sparse data (only days with sales)
    const formattedTrend = salesTrend.map((day: any) => ({
        date: day._id,
        sellingPrice: day.sellingPrice,
        costPrice: day.costPrice,
        profit: day.profit,
        orders: day.orders
    }));

    // Top Customers Normalization
    const normalizeMobile = (num: string) => num.replace(/^(\+91|91)/, '').replace(/\s/g, '');
    const customerMap: Record<string, {name: string, total: number, orders: number}> = {};
    topCustomersList.forEach((c: any) => {
        if (!c._id) return;
        const normalized = normalizeMobile(c._id.toString());
        if (!customerMap[normalized]) {
            customerMap[normalized] = { name: c.name || 'Unknown', total: 0, orders: 0 };
        }
        customerMap[normalized].total += c.total;
        customerMap[normalized].orders += c.orders;
    });
    
    const topCustomers = Object.values(customerMap)
        .filter(c => c.orders > 1) 
        .sort((a,b) => b.total - a.total)
        .slice(0, 5);

    const topProducts = topProductsList.map((p: any) => ({ name: p._id, sales: p.sales }));
    const topSellers = topSellersList.map((s: any) => ({ name: s._id, value: s.count, total: s.total }));
    const lowStockProducts = productStatsData.lowStock || [];
    
    const topCategories = topCategoriesList.map((c: any) => ({
        name: c._id || 'Uncategorized',
        value: c.sales
    }));

    const categories = await Category.find({}, 'name').lean();
    const catMap: Record<string, string> = {};
    categories.forEach((c: any) => catMap[c._id.toString()] = c.name);

    const categoryDistribution = (productStatsData.categoryBreakdown || []).map((c: any) => ({
        name: catMap[c._id.toString()] || 'Unknown',
        value: c.count
    }));

    const dayLabels = ['', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']; 
    const weeklyPattern = new Array(7).fill(0).map((_, i) => ({ day: dayLabels[i+1], sales: 0 }));
    weeklyPatternList.forEach((w: any) => {
        if (weeklyPattern[w._id - 1]) {
            weeklyPattern[w._id - 1].sales = w.sales;
        }
    });
    
    const totalExpenses = expenseStatsData[0]?.total || 0;
    
    // Calculate Net Profit
    // We now have accurate profit from SalesTrend aggregation
    const totalGrossProfit = formattedTrend.reduce((sum: number, day: any) => sum + (day.profit || 0), 0);
    const netProfit = totalGrossProfit - totalExpenses;

    return {
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
        recentSales: recentSalesList,
        topProducts,
        topCustomers,
        topSellers,
        topCategories,
        lowStockProducts,
        weeklyPattern
    };
  },
  ['dashboard-stats'], 
  { revalidate: 300, tags: ['dashboard'] }
);
