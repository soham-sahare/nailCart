'use client';

import { FiUser } from 'react-icons/fi';

interface TopSellersProps {
  data: { name: string; value: number; total: number }[];
}

export default function TopSellers({ data }: TopSellersProps) {
  return (
    <div className="glass" style={{ padding: '1.5rem', borderRadius: '1.5rem', height: '100%' }}>
      <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
         <FiUser className="text-purple-500" /> Top Sellers
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {data.map((seller, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', background: 'var(--card-bg-light)', borderRadius: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#8b5cf6', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: '0.9rem' }}>
                        {i + 1}
                    </div>
                    <div>
                        <p style={{ fontWeight: 600, fontSize: '0.95rem' }}>{seller.name || 'System'}</p>
                        <p style={{ fontSize: '0.8rem', color: '#888' }}>{seller.value} Orders</p>
                    </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <p style={{ fontWeight: 700, color: 'var(--primary)' }}>₹{seller.total.toLocaleString()}</p>
                </div>
            </div>
        ))}
        {data.length === 0 && <p style={{ color: '#888', fontStyle: 'italic' }}>No sales data found.</p>}
      </div>
    </div>
  );
}
