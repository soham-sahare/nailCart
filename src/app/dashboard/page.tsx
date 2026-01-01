'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, BarChart, Bar
} from 'recharts';
import { FiTrendingUp, FiBox, FiAlertCircle, FiDollarSign, FiShoppingBag, FiArrowRight, FiActivity, FiUsers, FiCalendar } from 'react-icons/fi';
import Link from 'next/link';
import { formatDateIST } from '@/lib/dateUtils';

// Define types for API response
interface DashboardStats {
  metrics: {
    totalOrders: number;
    totalRevenue: number;
    inventoryValue: number;
    lowStockCount: number;
    averageOrderValue: number;
    dailyAverage: number;
  };
  salesTrend: { date: string; sales: number }[];
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

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/dashboard/stats');
      const data = await res.json();
      if (res.ok) {
        setStats(data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
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
            icon={FiDollarSign}
            color="text-green-500"
            bg="bg-green-500/10"
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
        {/*
        <StatCard 
            title="Inventory Value" 
            value={`₹${stats.metrics.inventoryValue.toLocaleString()}`} 
            icon={FiBox}
            color="text-purple-500"
            bg="bg-purple-500/10"
        /> */}
      </div>

      {/* 2. Charts Section Row 1 */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', 
        gap: '1.5rem', 
      }}>
        {/* Sales Trend */}
        <div className="glass" style={{ padding: '1.5rem', borderRadius: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.5rem' }}>Revenue Trend (7 Days)</h3>
            <div style={{ height: '300px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={stats.salesTrend}>
                        <defs>
                            <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#fc6bba" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#fc6bba" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                        <XAxis dataKey="date" stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="#888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `₹${val}`} />
                        <Tooltip 
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                            formatter={(value: number) => [`₹${value}`, 'Sales']}
                        />
                        <Area type="monotone" dataKey="sales" stroke="#fc6bba" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>

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

function StatCard({ title, value, icon: Icon, color, bg }: any) {
    // Basic color mapping
    let colorStyle: any = { color: '#666' };
    let bgStyle: any = { background: '#f5f5f5' };
    
    // Inline style overrides for specific colors
    if (color.includes('green')) { colorStyle = { color: '#10b981' }; bgStyle = { background: 'rgba(16, 185, 129, 0.1)' }; }
    if (color.includes('blue')) { colorStyle = { color: '#3b82f6' }; bgStyle = { background: 'rgba(59, 130, 246, 0.1)' }; }
    if (color.includes('purple')) { colorStyle = { color: '#8b5cf6' }; bgStyle = { background: 'rgba(139, 92, 246, 0.1)' }; }
    if (color.includes('red')) { colorStyle = { color: '#ef4444' }; bgStyle = { background: 'rgba(239, 68, 68, 0.1)' }; }
    if (color.includes('orange')) { colorStyle = { color: '#f97316' }; bgStyle = { background: 'rgba(249, 115, 22, 0.1)' }; }
    if (color.includes('pink')) { colorStyle = { color: '#ec4899' }; bgStyle = { background: 'rgba(236, 72, 153, 0.1)' }; }

    return (
        <div className="glass" style={{ padding: '1.25rem', borderRadius: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ 
                width: '50px', 
                height: '50px', 
                borderRadius: '1rem', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                fontSize: '1.5rem',
                ...colorStyle,
                ...bgStyle
            }}>
                <Icon />
            </div>
            <div>
                <p style={{ color: '#888', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</p>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700, lineHeight: 1.2 }}>{value}</h2>
            </div>
        </div>
    );
}
