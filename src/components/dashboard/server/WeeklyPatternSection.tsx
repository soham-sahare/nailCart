import { getWeeklyPattern } from '@/services/dashboardService';
import WeeklyRevenueChart from '@/components/dashboard/WeeklyRevenueChart';

export default async function WeeklyPatternSection({ 
    range, from, to 
}: { 
    range: string, from?: string | null, to?: string | null 
}) {
    const weeklyPattern = await getWeeklyPattern(range, from, to);

    return (
       <div className="glass" style={{ padding: '1.5rem', borderRadius: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.5rem' }}>Busiest Days (Weekly Pattern)</h3>
            <WeeklyRevenueChart data={weeklyPattern} />
        </div>
    );
}
