import { getSalesTrend } from '@/services/dashboardService';
import { SalesChartWrapper, OrdersChartWrapper } from '@/components/dashboard/DashboardCharts';

export default async function SalesChartsSection({ 
    range, from, to 
}: { 
    range: string, from?: string | null, to?: string | null 
}) {
    const salesTrend = await getSalesTrend(range, from, to);

    return (
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr', 
        gap: '2rem', 
      }}>
        <div style={{ minHeight: '400px' }}>
             <SalesChartWrapper 
                data={salesTrend} 
                frequency={range} 
            />
        </div>
        <div style={{ minHeight: '400px' }}>
            <OrdersChartWrapper 
                data={salesTrend.map(d => ({ date: d.date, orders: d.orders || 0 }))} 
            />
        </div>
      </div>
    );
}
