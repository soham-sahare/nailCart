'use client';

import { useSession } from 'next-auth/react';

export default function DashboardPage() {
  const { data: session } = useSession();

  return (
    <div>
      <h1 className="gradient-text" style={{ fontSize: '2rem', marginBottom: '1rem' }}>
        Dashboard Overview
      </h1>
      <p style={{ color: '#666', fontSize: '1.1rem' }}>
        Welcome back, <strong>{session?.user?.name}</strong>!
      </p>
      
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
        gap: '1.5rem', 
        marginTop: '2rem' 
      }}>
        <div className="glass" style={{ padding: '1.5rem', borderRadius: 'var(--radius)' }}>
          <h3 style={{ color: '#888', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Get Started</h3>
          <p style={{ fontWeight: 600 }}>Manage Categories</p>
        </div>
        <div className="glass" style={{ padding: '1.5rem', borderRadius: 'var(--radius)' }}>
          <h3 style={{ color: '#888', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Keep Track</h3>
          <p style={{ fontWeight: 600 }}>Manage Products</p>
        </div>
      </div>
    </div>
  );
}
