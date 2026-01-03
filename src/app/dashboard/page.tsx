'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, BarChart, Bar
} from 'recharts';
import { FiTrendingUp, FiBox, FiAlertCircle, FiShoppingBag, FiArrowRight, FiActivity, FiUsers, FiCalendar } from 'react-icons/fi';
import { FaRupeeSign } from 'react-icons/fa';
import Link from 'next/link';
import { formatDateIST } from '@/lib/dateUtils';
import dynamic from 'next/dynamic';
import StatCard from '@/components/dashboard/StatCard';
import FilterBar from '@/components/dashboard/FilterBar';
import TopSellers from '@/components/dashboard/TopSellers';
import TopProducts from '@/components/dashboard/TopProducts';
import CategoryHeatmap from '@/components/dashboard/CategoryHeatmap';
import OrdersTrendGraph from '@/components/dashboard/OrdersTrendGraph';

const SalesTrendGraph = dynamic(() => import('@/components/dashboard/SalesTrendGraph'), {
  loading: () => <div className="glass" style={{ height: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '16px' }}>Loading Graph...</div>,
  ssr: false // Graph is client-side heavy, disable SSR for it to speed up initial HTML
});

// Define types for API response
interface DashboardStats {
  metrics: {
    totalOrders: number;
    totalRevenue: number;
    inventoryValue: number;
    lowStockCount: number;
    averageOrderValue: number;
    dailyAverage: number;
    totalExpenses?: number;
    netProfit?: number;
    grossProfit?: number;
  };
  salesTrend: { date: string; sellingPrice: number; costPrice: number; profit: number; orders: number }[];
  categoryDistribution: { name: string; value: number }[];
  recentSales: any[];
  topProducts: { name: string; sales: number }[];
  topSellers: { name: string; value: number; total: number }[];
  topCategories: { name: string; value: number }[];
  lowStockProducts: { name: string; quantity: number; _id: string }[];
  topCustomers: { name: string; total: number; orders: number }[];
  weeklyPattern: { day: string; sales: number }[];
}

const COLORS = ['#fc6bba', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];

export default function DashboardPage() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState('this_month');
  const [customRange, setCustomRange] = useState({ from: '', to: '' });
  const [graphLoading, setGraphLoading] = useState(false);

  useEffect(() => {
    // If range is custom, we wait for user to click Apply (which calls fetchStats manually? or we check valid dates)
    // Actually FilterBar usually triggers fetch on Apply for custom.
    // For others, it triggers immediately.
    if (range !== 'custom') {
        fetchStats();
    }
  }, [range]);

  const fetchStats = async () => {
    if (stats) setGraphLoading(true);
    try {
      let query = `range=${range}`;
      if (range === 'custom') {
          if (!customRange.from || !customRange.to) return; // Don't fetch if incomplete
          query += `&from=${customRange.from}&to=${customRange.to}`;
      }

      const res = await fetch(`/api/dashboard/stats?${query}`);
      const data = await res.json();
      if (res.ok) {
        setStats(data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setGraphLoading(false);
    }
  };

  if (loading && !stats) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading Analytics...</div>;
  }

  // Safe fallback if stats null but loading false (error case)
  if (!stats) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header */}
      <div>
        <h1 className="gradient-text" style={{ fontSize: '2rem', marginBottom: '0.5rem', fontWeight: 800 }}>
          Dashboard
        </h1>
        <p style={{ color: '#666', fontSize: '1.1rem' }}>
          Welcome back, <strong>{session?.user?.name}</strong>! Here's what's happening.
        </p>
      </div>

      {/* Filter Bar */}
      <FilterBar 
        range={range} 
        setRange={setRange} 
        customRange={customRange} 
        setCustomRange={setCustomRange} 
        onApply={fetchStats}
      />
      
      {/* 1. Metrics Grid */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: '1.5rem', 
      }}>
        <StatCard 
            title="Total Revenue" 
            value={`₹${stats.metrics.totalRevenue.toLocaleString()}`} 
            icon={FaRupeeSign}
            color="text-green-500"
            bg="bg-green-500/10"
        />
        <StatCard 
            title="Profit" 
            value={`₹${stats.metrics.grossProfit?.toLocaleString() || 0}`} 
            icon={FiActivity}
            color="text-teal-500"
            bg="bg-teal-500/10"
        />
         <StatCard 
            title="Total Expenses" 
            value={`₹${stats.metrics.totalExpenses?.toLocaleString() || 0}`} 
            icon={FiArrowRight}
            color="text-red-500"
            bg="bg-red-500/10"
        />
        <StatCard 
            title="Daily Avg Sales" 
            value={`₹${stats.metrics.dailyAverage.toLocaleString()}`} 
            icon={FiCalendar}
            color="text-pink-500"
            bg="bg-pink-500/10"
        />
        <StatCard 
            title="Avg Order Value" 
            value={`₹${stats.metrics.averageOrderValue.toLocaleString()}`} 
            icon={FiActivity}
            color="text-orange-500"
            bg="bg-orange-500/10"
        />
        <StatCard 
            title="Total Orders" 
            value={stats.metrics.totalOrders} 
            icon={FiShoppingBag}
            color="text-blue-500"
            bg="bg-blue-500/10"
        />
      </div>

      {/* 2. Charts: Sales + Orders */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', 
        gap: '1.5rem', 
      }}>
        <div style={{ minHeight: '400px' }}>
             <SalesTrendGraph 
                data={stats.salesTrend} 
                frequency={range} 
                onFrequencyChange={() => {}} 
                loading={graphLoading} 
            />
        </div>
        <div style={{ minHeight: '400px' }}>
            <OrdersTrendGraph 
                data={stats.salesTrend.map(d => ({ date: d.date, orders: d.orders || 0 }))} 
                loading={graphLoading} 
            />
        </div>
      </div>

       {/* 3. Products & Heatmap */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', 
        gap: '1.5rem', 
      }}>
        <TopProducts data={stats.topProducts} />
        <CategoryHeatmap data={stats.topCategories} />
      </div>

       {/* 4. Sellers, Customers, Low Stock */}
       <div style={{ 
         display: 'grid', 
         gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', 
         gap: '1.5rem', 
       }}>
        {/* Top Sellers */}
        <TopSellers data={stats.topSellers} />

        {/* Top Customers */}
        <div className="glass" style={{ padding: '1.5rem', borderRadius: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FiUsers className="text-blue-500" /> Top Customers
            </h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                    <tr style={{ borderBottom: '1px solid #eee' }}>
                        <th style={{ padding: '0.75rem', color: '#888', fontSize: '0.75rem' }}>NAME</th>
                        <th style={{ padding: '0.75rem', color: '#888', fontSize: '0.75rem', textAlign: 'center' }}>ORDERS</th>
                        <th style={{ padding: '0.75rem', color: '#888', fontSize: '0.75rem', textAlign: 'right' }}>TOTAL</th>
                    </tr>
                </thead>
                <tbody>
                    {stats.topCustomers.map((c, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #fcfcfc' }}>
                            <td style={{ padding: '0.75rem', fontWeight: 500 }}>{c.name}</td>
                            <td style={{ padding: '0.75rem', textAlign: 'center', color: '#666' }}>{c.orders}</td>
                            <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 600 }}>₹{c.total.toLocaleString()}</td>
                        </tr>
                    ))}
                    {stats.topCustomers.length === 0 && (
                        <tr><td colSpan={3} style={{padding: '1rem', textAlign:'center', color:'#888', fontStyle:'italic'}}>No repeat customers in this period</td></tr>
                    )}
                </tbody>
            </table>
        </div>

         {/* Low Stock */}
         <div style={{ display: 'flex', flexDirection: 'column' }}>
             <div className="glass custom-scrollbar" style={{ padding: '1.5rem', borderRadius: '1.5rem', maxHeight: '350px', overflowY: 'auto' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.5rem', position: 'sticky', top: 0, background: 'rgba(0,0,0,0.8)', padding: '5px 0', zIndex: 10 }}>
                    <FiAlertCircle /> Low Stock
                </h3>
                 {stats.lowStockProducts.length === 0 ? (
                     <div style={{ color: '#888', fontStyle: 'italic', fontSize: '0.9rem' }}>Stock levels are healthy.</div>
                 ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <tbody>
                            {stats.lowStockProducts.map((p) => (
                                <tr key={p._id} style={{ borderBottom: '1px solid #fcfcfc' }}>
                                    <td style={{ padding: '0.5rem 0', fontWeight: 500, fontSize: '0.9rem' }}>{p.name}</td>
                                    <td style={{ padding: '0.5rem 0', textAlign: 'right', color: '#ef4444', fontWeight: 700, fontSize: '0.9rem' }}>{p.quantity} left</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                 )}
            </div>
         </div>
      </div>
      
       {/* 5. Weekly Pattern */}
       <div className="glass" style={{ padding: '1.5rem', borderRadius: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.5rem' }}>Busiest Days (Weekly Pattern)</h3>
            <div style={{ height: '250px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.weeklyPattern}>
                         <CartesianGrid strokeDasharray="3 3" stroke="#eee" vertical={false} />
                         <XAxis dataKey="day" stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
                         <YAxis stroke="#888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `₹${val}`} />
                         <Tooltip 
                            cursor={{fill: 'transparent'}}
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                            formatter={(value: any) => [`₹${value}`, 'Revenue']}
                         />
                         <Bar dataKey="sales" fill="#a78bfa" radius={[4, 4, 0, 0]} barSize={40} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>

    </div>
  );
}


