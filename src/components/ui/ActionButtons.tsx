'use client';
import React from 'react';
import { FiEye, FiEdit2, FiTrash2 } from 'react-icons/fi';
import styles from './ActionButtons.module.css';

interface ActionButtonsProps {
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  customActions?: React.ReactNode;
}

export default function ActionButtons({ onView, onEdit, onDelete, customActions }: ActionButtonsProps) {
  return (
    <div className={styles.actions}>
      {customActions}
      
      {onView && (
        <button 
          className={`${styles.actionBtn} ${styles.btnView}`}
          onClick={(e) => { e.stopPropagation(); onView(); }}
          title="View Details"
        >
          <FiEye size={16} />
        </button>
      )}

      {onEdit && (
        <button 
          className={`${styles.actionBtn} ${styles.btnEdit}`}
          onClick={(e) => { e.stopPropagation(); onEdit(); }}
          title="Edit"
        >
          <FiEdit2 size={16} />
        </button>
      )}

      {onDelete && (
        <button 
          className={`${styles.actionBtn} ${styles.btnDelete}`}
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          title="Delete"
        >
          <FiTrash2 size={16} />
        </button>
      )}
    </div>
  );
}
