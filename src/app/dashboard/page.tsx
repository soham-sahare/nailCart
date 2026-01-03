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
  salesTrend: { date: string; sellingPrice: number; costPrice: number; profit: number }[];
  categoryDistribution: { name: string; value: number }[];
  recentSales: any[];
  topProducts: { name: string; sales: number }[];
  lowStockProducts: { name: string; quantity: number; _id: string }[];
  topCustomers: { name: string; total: number; orders: number }[];
  weeklyPattern: { day: string; sales: number }[];
}

const COLORS = ['#fc6bba', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];

export default function DashboardPage() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [frequency, setFrequency] = useState('7d');
  const [graphLoading, setGraphLoading] = useState(false);

  useEffect(() => {
    fetchStats();
  }, [frequency]); // Refetch when frequency changes

  const fetchStats = async () => {
    if (stats) setGraphLoading(true); // Show loading only on graph if already loaded once
    try {
      const res = await fetch(`/api/dashboard/stats?frequency=${frequency}`);
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

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading Analytics...</div>;
  }

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
            title="Net Profit" 
            value={`₹${stats.metrics.netProfit?.toLocaleString() || 69}`} 
            icon={FiTrendingUp}
            color="text-purple-500"
            bg="bg-purple-500/10"
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

      {/* 2. Charts Section Row 1 */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', 
        gap: '1.5rem', 
      }}>
        {/* Sales Trend */}
        <SalesTrendGraph 
            data={stats.salesTrend} 
            frequency={frequency} 
            onFrequencyChange={setFrequency}
            loading={graphLoading} 
        />

        {/* Weekly Pattern */}
        <div className="glass" style={{ padding: '1.5rem', borderRadius: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.5rem' }}>Busiest Days (Weekly Pattern)</h3>
            <div style={{ height: '300px', width: '100%' }}>
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
                         <Bar dataKey="sales" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={30} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
      </div>

       {/* 3. Tables/Lists Row */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', 
        gap: '1.5rem', 
      }}>
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
                </tbody>
            </table>
        </div>

        {/* Top Products */}
        <div className="glass" style={{ padding: '1.5rem', borderRadius: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>Top Selling Products</h3>
            <div style={{ height: '220px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.topProducts} layout="vertical" margin={{ left: 0, right: 30 }}>
                         <CartesianGrid strokeDasharray="3 3" stroke="#eee" horizontal={false} />
                         <XAxis type="number" stroke="#888" fontSize={10} tickLine={false} axisLine={false} />
                         <YAxis dataKey="name" type="category" stroke="#888" fontSize={11} tickLine={false} axisLine={false} width={100} />
                         <Tooltip 
                            cursor={{fill: 'transparent'}}
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                         />
                         <Bar dataKey="sales" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={15} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>

         {/* Category & Low Stock */}
         <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
             <div className="glass" style={{ padding: '1.5rem', borderRadius: '1.5rem', flex: 1 }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
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

    </div>
  );
}


