'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from 'recharts';

interface TopProductsProps {
  data: { name: string; sales: number; sku?: string }[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="glass" style={{ padding: '1rem', border: '1px solid var(--border)', borderRadius: '12px' }}>
             <p style={{ fontWeight: '600', marginBottom: '0.25rem', color: 'var(--foreground)' }}>{label}</p>
             <p style={{ color: '#3b82f6', fontWeight: 600 }}>sales : {payload[0].value}</p>
        </div>
      );
    }
    return null;
  };

export default function TopProducts({ data }: TopProductsProps) {
  return (
    <div className="glass" style={{ padding: '1.5rem', borderRadius: '1.5rem', height: '100%', minHeight: '400px' }}>
      <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.5rem' }}>Top Selling Products</h3>
      <div style={{ height: '320px', width: '100%' }}>
        <ResponsiveContainer width="100%" height="100%">
            <BarChart 
                data={data} 
                layout="vertical" 
                margin={{ top: 5, right: 30, left: 160, bottom: 5 }}
            >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#333" />
                <XAxis type="number" stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis 
                    dataKey="name" 
                    type="category" 
                    width={150} // Increased width for longer labels
                    stroke="#888" 
                    fontSize={11} 
                    tickLine={false} 
                    axisLine={false} 
                    tick={(props) => {
                        const { x, y, payload } = props;
                        const item = data.find(d => d.name === payload.value);
                        return (
                            <g transform={`translate(${x},${y})`}>
                                <text x={-10} y={0} dy={4} textAnchor="end" fill="var(--foreground)" fontWeight={500}>
                                    {payload.value.length > 20 ? `${payload.value.slice(0, 17)}...` : payload.value}
                                </text>
                                {item?.sku && (
                                    <text x={-10} y={12} dy={4} textAnchor="end" fill="#888" fontSize={10} fontWeight={400}>
                                        {item.sku}
                                    </text>
                                )}
                            </g>
                        );
                    }}
                />
                <Tooltip content={<CustomTooltip />} cursor={{fill: 'transparent'}} />
                <Bar dataKey="sales" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20} background={{ fill: 'transparent' }} />
            </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
