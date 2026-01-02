'use client';

import { useState, useEffect } from 'react';
import { FiArrowLeft, FiFilter, FiRefreshCw } from 'react-icons/fi';
import styles from '../ledger.module.css'; // Reusing Ledger styles
import { useRouter } from 'next/navigation';

interface PartySummary {
  partyName: string;
  totalReceivable: number;
  totalPayable: number;
  netBalance: number;
}

export default function LedgerSummaryPage() {
  const [summary, setSummary] = useState<PartySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchSummary = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/ledger/summary');
      const data = await res.json();
      if (data.success) {
        setSummary(data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button 
                onClick={() => router.push('/dashboard/ledger')}
                className={styles.closeBtn}
                style={{ width: '40px', height: '40px', border: '1px solid var(--border)' }}
            >
                <FiArrowLeft />
            </button>
            <h1 className={styles.title}>Party Summary</h1>
        </div>
      </div>

      <div className={`${styles.statsCard} glass`} style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '1rem' }}>
        <h3 style={{ color: '#888', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Overview</h3>
        <p style={{ color: 'var(--foreground)', lineHeight: '1.6' }}>
            This page shows the net outstanding balance for each party based on <strong style={{color: 'var(--primary)'}}>PENDING</strong> transactions only.
        </p>
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Party Name</th>
              <th>To Receive (Pending)</th>
              <th>To Pay (Pending)</th>
              <th>Net Balance</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: '3rem' }}>Loading...</td></tr>
            ) : summary.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: '3rem' }}>No pending balances found</td></tr>
            ) : (
              summary.map((item, index) => {
                const isReceivable = item.netBalance > 0;
                const isPayable = item.netBalance < 0;
                const netLabel = isReceivable ? 'To Receive' : isPayable ? 'To Pay' : 'Settled';
                const netColor = isReceivable ? '#10b981' : isPayable ? '#ef4444' : '#888';
                
                return (
                  <tr key={index}>
                    <td style={{ fontWeight: 600 }}>{item.partyName}</td>
                    <td style={{ color: '#10b981' }}>₹{item.totalReceivable}</td>
                    <td style={{ color: '#ef4444' }}>₹{item.totalPayable}</td>
                    <td>
                        <span style={{ 
                            fontWeight: 700, 
                            color: netColor,
                            padding: '0.35rem 0.75rem',
                            borderRadius: '9999px',
                            background: `${netColor}20`,
                            border: `1px solid ${netColor}40`,
                            fontSize: '0.85rem'
                        }}>
                            {Math.abs(item.netBalance)} ({netLabel})
                        </span>
                    </td>
                    <td>
                        <button 
                             className={`${styles.actionBtn} ${styles.btnView}`}
                             onClick={() => router.push(`/dashboard/ledger?party=${encodeURIComponent(item.partyName)}`)}
                             title="View Transactions"
                             style={{ width: 'auto', padding: '0 1rem', gap: '0.5rem' }}
                        >
                            <FiFilter size={16} /> View
                        </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
