import { getTopProducts, getTopCategories } from '@/services/dashboardService';
import TopProducts from '@/components/dashboard/TopProducts';
import CategoryHeatmap from '@/components/dashboard/CategoryHeatmap';

export default async function ProductsSection({ 
    range, from, to 
}: { 
    range: string, from?: string | null, to?: string | null 
}) {
    const [topProducts, topCategories] = await Promise.all([
        getTopProducts(range, from, to),
        getTopCategories(range, from, to)
    ]);

    return (
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', 
        gap: '1.5rem', 
      }}>
        <TopProducts data={topProducts} />
        <CategoryHeatmap data={topCategories} />
      </div>
    );
}
