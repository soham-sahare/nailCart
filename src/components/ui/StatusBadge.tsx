'use client';
import React from 'react';
import styles from './StatusBadge.module.css';

interface StatusBadgeProps {
  status: string;
  variant?: 'success' | 'warning' | 'error' | 'neutral';
}

export default function StatusBadge({ status, variant }: StatusBadgeProps) {
  let badgeStyle = styles.neutral;

  // Auto-detect variant if not provided
  if (!variant) {
      const s = (status || '').toUpperCase();
      if (['ACTIVE', 'CLEARED', 'COMPLETED', 'PAID'].includes(s)) badgeStyle = styles.success;
      else if (['PENDING', 'INACTIVE', 'PARTIAL', 'RETURNED', 'REFUNDED'].includes(s)) badgeStyle = styles.warning;
      else if (['CANCELLED', 'DELETED'].includes(s)) badgeStyle = styles.error;
  } else {
      badgeStyle = styles[variant];
  }

  return (
    <span className={`${styles.badge} ${badgeStyle}`}>
      {status}
    </span>
  );
}
