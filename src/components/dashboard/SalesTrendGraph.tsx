'use client';

import { useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import styles from './SalesTrendGraph.module.css';

interface SalesData {
  date: string;
  sellingPrice: number;
  costPrice: number;
  profit: number;
}

interface SalesTrendGraphProps {
  data: SalesData[];
  frequency: string;
  onFrequencyChange: (freq: string) => void;
  loading?: boolean;
}

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="glass" style={{ padding: '1rem', border: '1px solid var(--border)', borderRadius: '12px', minWidth: '150px' }}>
          <p style={{ fontWeight: '600', marginBottom: '0.5rem', color: 'var(--foreground)' }}>{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem', fontSize: '0.9rem' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: entry.color }}></div>
                <span style={{ color: '#888' }}>{entry.name}:</span>
                <span style={{ marginLeft: 'auto', fontWeight: 600, color: 'var(--foreground)' }}>
                    ₹{entry.value.toLocaleString('en-IN')}
                </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

export default function SalesTrendGraph({ data, frequency, onFrequencyChange, loading }: SalesTrendGraphProps) {
  const frequencies = [
    { label: '7 Days', value: '7d' },
    { label: '15 Days', value: '15d' },
    { label: '1 Month', value: '1m' },
    { label: '3 Months', value: '3m' },
    { label: '6 Months', value: '6m' },
    { label: '1 Year', value: '12m' },
  ];

  return (
    <div className={`glass ${styles.container}`}>
      <div className={styles.header}>
        <h3 className={styles.title}>Sales & Profit Trend</h3>
        <div className={styles.controls}>
            {frequencies.map((freq) => (
                <button
                    key={freq.value}
                    className={`${styles.freqBtn} ${frequency === freq.value ? styles.active : ''}`}
                    onClick={() => onFrequencyChange(freq.value)}
                >
                    {freq.label}
                </button>
            ))}
        </div>
      </div>

      <div className={styles.chartContainer}>
        {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                Loading Chart...
            </div>
        ) : (
            <ResponsiveContainer width="100%" height="100%">
            <AreaChart
                data={data}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
                <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                     <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.5} />
                <XAxis 
                    dataKey="date" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#888', fontSize: 12 }} 
                    dy={10}
                />
                <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#888', fontSize: 12 }}
                    tickFormatter={(value) => `₹${value}`}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'var(--border)', strokeWidth: 1, strokeDasharray: '3 3' }} />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                
                <Area 
                    type="monotone" 
                    dataKey="sellingPrice" 
                    name="Sales" 
                    stroke="var(--primary)" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorSales)" 
                />
                 <Area 
                    type="monotone" 
                    dataKey="profit" 
                    name="Profit" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorProfit)" 
                />
                 <Area 
                    type="monotone" 
                    dataKey="costPrice" 
                    name="Cost" 
                    stroke="#ef4444" 
                    strokeWidth={1}
                    fillOpacity={1} 
                    fill="url(#colorCost)" 
                    strokeDasharray="5 5"
                />
            </AreaChart>
            </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
