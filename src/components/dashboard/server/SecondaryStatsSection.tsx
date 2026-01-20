import { getSecondaryStats, getInventoryStats } from '@/services/dashboardService';
import TopSellers from '@/components/dashboard/TopSellers';
import { FiUsers, FiAlertCircle } from 'react-icons/fi';

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

         {/* Low Stock */}
         <div style={{ display: 'flex', flexDirection: 'column' }}>
             <div className="glass custom-scrollbar" style={{ padding: '1.5rem', borderRadius: '1.5rem', maxHeight: '350px', overflowY: 'auto' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.5rem', position: 'sticky', top: 0, background: 'rgba(0,0,0,0.8)', padding: '5px 0', zIndex: 10 }}>
                    <FiAlertCircle /> Low Stock
                </h3>
                 {inventory.lowStockProducts.length === 0 ? (
                     <div style={{ color: '#888', fontStyle: 'italic', fontSize: '0.9rem' }}>Stock levels are healthy.</div>
                 ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <tbody>
                            {inventory.lowStockProducts.map((p: any) => (
                                <tr key={String(p._id)} style={{ borderBottom: '1px solid #fcfcfc' }}>
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
    );
}
