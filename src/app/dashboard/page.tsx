import { Suspense } from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import FilterBar from '@/components/dashboard/FilterBar';

// Granular Server Components
import MetricsGrid from '@/components/dashboard/server/MetricsGrid';
import SalesChartsSection from '@/components/dashboard/server/SalesChartsSection';
import ProductsSection from '@/components/dashboard/server/ProductsSection';
import SecondaryStatsSection from '@/components/dashboard/server/SecondaryStatsSection';
import WeeklyPatternSection from '@/components/dashboard/server/WeeklyPatternSection';

// Skeleton Fallbacks
const MetricsSkeleton = () => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
    {[...Array(6)].map((_, i) => (
      <div key={i} className="glass animate-pulse" style={{ height: '120px', borderRadius: '1rem' }}></div>
    ))}
  </div>
);

const SectionSkeleton = ({ height = '400px' }: { height?: string }) => (
  <div className="glass animate-pulse" style={{ height, borderRadius: '1.5rem', width: '100%' }}></div>
);

export default async function DashboardPage(props: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const session = await getServerSession(authOptions);
  
  // Parse Search Params
  const searchParams = await props.searchParams;
  const range = searchParams.range || 'this_month';
  const fromParam = searchParams.from || null;
  const toParam = searchParams.to || null;
  
  const filterProps = { range, from: fromParam, to: toParam };

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

      {/* Filter Bar - Client Component */}
      <FilterBar />
      
      {/* 1. Metrics Grid (Critical Data - Should load fast) */}
      <Suspense fallback={<MetricsSkeleton />}>
          <MetricsGrid {...filterProps} />
      </Suspense>

      {/* 2. Charts: Sales + Orders */}
      <Suspense fallback={<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem' }}><SectionSkeleton /><SectionSkeleton /></div>}>
          <SalesChartsSection {...filterProps} />
      </Suspense>

       {/* 3. Products & Heatmap */}
      <Suspense fallback={<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}><SectionSkeleton /><SectionSkeleton /></div>}>
          <ProductsSection {...filterProps} />
      </Suspense>

       {/* 4. Sellers, Customers, Low Stock */}
      <Suspense fallback={<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem' }}><SectionSkeleton /><SectionSkeleton /><SectionSkeleton /></div>}>
          <SecondaryStatsSection {...filterProps} />
      </Suspense>
       
       {/* 5. Weekly Pattern */}
      <Suspense fallback={<SectionSkeleton height="300px" />}>
         <WeeklyPatternSection {...filterProps} />
      </Suspense>
    </div>
  );
}



