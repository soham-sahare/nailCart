import { getSecondaryStats, getInventoryStats } from '@/services/dashboardService';
import TopSellers from '@/components/dashboard/TopSellers';
import { FiUsers } from 'react-icons/fi';
import LowStockSection from '@/components/dashboard/LowStockSection';

export default async function SecondaryStatsSection({ 
    range, from, to 
}: { 
    range: string, from?: string | null, to?: string | null 
}) {
    const [secondary, inventory] = await Promise.all([
        getSecondaryStats(range, from, to),
        getInventoryStats()
    ]);

    return (
       <div style={{ 
         display: 'grid', 
         gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', 
         gap: '1.5rem', 
       }}>
        {/* Top Sellers */}
        <TopSellers data={secondary.topSellers} />

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
                    {secondary.topCustomers.map((c, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #fcfcfc' }}>
                            <td style={{ padding: '0.75rem', fontWeight: 500 }}>{c.name}</td>
                            <td style={{ padding: '0.75rem', textAlign: 'center', color: '#666' }}>{c.orders}</td>
                            <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 600 }}>₹{c.total.toLocaleString()}</td>
                        </tr>
                    ))}
                    {secondary.topCustomers.length === 0 && (
                        <tr><td colSpan={3} style={{padding: '1rem', textAlign:'center', color:'#888', fontStyle:'italic'}}>No repeat customers in this period</td></tr>
                    )}
                </tbody>
            </table>
        </div>

         {/* Low Stock Component (Client Component) */}
         <LowStockSection products={inventory.lowStockProducts} />
      </div>
    );
}
