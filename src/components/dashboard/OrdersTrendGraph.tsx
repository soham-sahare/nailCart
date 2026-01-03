'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface OrdersData {
  date: string;
  orders: number;
}

interface OrdersTrendGraphProps {
  data: OrdersData[];
  loading?: boolean;
}

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="glass" style={{ padding: '1rem', border: '1px solid var(--border)', borderRadius: '12px' }}>
          <p style={{ fontWeight: '600', marginBottom: '0.5rem', color: 'var(--foreground)' }}>{label}</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
              <span style={{ color: '#888' }}>Orders:</span>
              <span style={{ fontWeight: 600, color: 'var(--foreground)' }}>{payload[0].value}</span>
          </div>
        </div>
      );
    }
    return null;
  };

export default function OrdersTrendGraph({ data, loading }: OrdersTrendGraphProps) {
  return (
    <div className="glass" style={{ padding: '1.5rem', borderRadius: '1.5rem', height: '100%', minHeight: '400px', display: 'flex', flexDirection: 'column' }}>
      <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.5rem' }}>Total Orders</h3>
      
      <div style={{ flex: 1, minHeight: 0 }}>
        {loading ? (
             <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>Loading...</div>
        ) : (
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.5} />
                    <XAxis 
                        dataKey="date" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#888', fontSize: 12 }} 
                        dy={10}
                    />
                    <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#888', fontSize: 12 }}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--primary)', opacity: 0.1 }} />
                    <Bar dataKey="orders" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
                </BarChart>
            </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
