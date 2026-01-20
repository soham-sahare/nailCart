import { getGlobalMetrics, getInventoryStats } from '@/services/dashboardService';
import StatCard from '@/components/dashboard/StatCard';
import { FiActivity, FiArrowRight, FiCalendar, FiShoppingBag } from 'react-icons/fi';
import { FaRupeeSign } from 'react-icons/fa';

export default async function MetricsGrid({ 
    range, from, to 
}: { 
    range: string, from?: string | null, to?: string | null 
}) {
    const [metrics, inventory] = await Promise.all([
        getGlobalMetrics(range, from, to),
        getInventoryStats() // Inventory might be independent of date range for "current stock", but usually "value" is current.
    ]);

    return (
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: '1.5rem', 
      }}>
        <StatCard 
            title="Total Revenue" 
            value={`₹${metrics.totalRevenue.toLocaleString()}`} 
            icon={FaRupeeSign}
            color="text-green-500"
            bg="bg-green-500/10"
        />
        <StatCard 
            title="Profit" 
            value={`₹${metrics.grossProfit?.toLocaleString() || 0}`} 
            icon={FiActivity}
            color="text-teal-500"
            bg="bg-teal-500/10"
        />
         <StatCard 
            title="Total Expenses" 
            value={`₹${metrics.totalExpenses?.toLocaleString() || 0}`} 
            icon={FiArrowRight}
            color="text-red-500"
            bg="bg-red-500/10"
        />
        <StatCard 
            title="Daily Avg Sales" 
            value={`₹${metrics.dailyAverage.toLocaleString()}`} 
            icon={FiCalendar}
            color="text-pink-500"
            bg="bg-pink-500/10"
        />
        <StatCard 
            title="Avg Order Value" 
            value={`₹${metrics.averageOrderValue.toLocaleString()}`} 
            icon={FiActivity}
            color="text-orange-500"
            bg="bg-orange-500/10"
        />
        <StatCard 
            title="Total Orders" 
            value={metrics.totalOrders} 
            icon={FiShoppingBag}
            color="text-blue-500"
            bg="bg-blue-500/10"
        />
      </div>
    );
}
