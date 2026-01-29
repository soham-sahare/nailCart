import React from 'react';
import styles from './Pagination.module.css';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export default function Pagination({ currentPage, totalPages, onPageChange, className = '' }: PaginationProps) {
  if (totalPages <= 1) return null;

  const generatePages = () => {
      const pages = [];
      const delta = 1; // Number of pages to show around current page
      
      // Always show first page
      pages.push(1);

      // Add dots if gap is large
      if (currentPage - delta > 2) {
          pages.push('...');
      }

      // Add pages around current
      for (let i = Math.max(2, currentPage - delta); i <= Math.min(totalPages - 1, currentPage + delta); i++) {
          pages.push(i);
      }

      // Add dots before last page if gap is large
      if (currentPage + delta < totalPages - 1) {
          pages.push('...');
      }

      // Always show last page
      if (totalPages > 1) {
          pages.push(totalPages);
      }

      return pages;
  };

  const pages = generatePages();

  return (
    <div className={`${styles.pagination} ${className}`}>
      <button 
        className={styles.pageBtn} 
        disabled={currentPage === 1}
        onClick={() => onPageChange(currentPage - 1)}
      >
        &lt;
      </button>
      
      {pages.map((p, idx) => (
         p === '...' ? (
            <span key={`dots-${idx}`} className={styles.dots}>...</span>
         ) : (
            <button
                key={p}
                className={`${styles.pageBtn} ${currentPage === p ? styles.active : ''}`}
                onClick={() => onPageChange(Number(p))}
            >
                {p}
            </button>
         )
      ))}

      <button 
        className={styles.pageBtn}
        disabled={currentPage === totalPages}
        onClick={() => onPageChange(currentPage + 1)}
      >
        &gt;
      </button>
    </div>
  );
}
