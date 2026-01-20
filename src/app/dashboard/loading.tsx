
export default function DashboardLoading() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header Skeleton */}
      <div>
        <div className="skeleton" style={{ height: '3rem', width: '200px', marginBottom: '0.5rem', borderRadius: '8px' }}></div>
        <div className="skeleton" style={{ height: '1.5rem', width: '300px', borderRadius: '8px' }}></div>
      </div>

      {/* Filter Bar Skeleton */}
      <div className="skeleton glass" style={{ height: '60px', borderRadius: '1rem', width: '100%' }}></div>
      
      {/* Metrics Grid Skeleton */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
        {[...Array(6)].map((_, i) => (
            <div key={i} className="skeleton glass" style={{ height: '120px', borderRadius: '1rem' }}></div>
        ))}
      </div>

      {/* Charts Skeleton */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem' }}>
        <div className="skeleton glass" style={{ height: '400px', borderRadius: '1rem' }}></div>
        <div className="skeleton glass" style={{ height: '400px', borderRadius: '1rem' }}></div>
      </div>

      {/* Bottom Grid Skeleton */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
        <div className="skeleton glass" style={{ height: '300px', borderRadius: '1rem' }}></div>
        <div className="skeleton glass" style={{ height: '300px', borderRadius: '1rem' }}></div>
      </div>
      
      <style>{`
        .skeleton {
            background: rgba(255, 255, 255, 0.05);
            animation: pulse 1.5s infinite;
        }
        @keyframes pulse {
            0% { opacity: 0.6; }
            50% { opacity: 0.3; }
            100% { opacity: 0.6; }
        }
      `}</style>
    </div>
  );
}
