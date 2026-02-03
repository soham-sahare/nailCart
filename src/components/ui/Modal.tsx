'use client';
import React from 'react';
import { FiX } from 'react-icons/fi';
import styles from './Modal.module.css';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  width?: string;
  className?: string;
}

export default function Modal({ isOpen, onClose, title, children, width, className = '' }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div 
        className={`${styles.modal} ${className}`} 
        style={width ? { maxWidth: width } : {}}
        onClick={e => e.stopPropagation()}
      >
        <div className={styles.modalHeader}>
          {title && <h2 className={styles.title}>{title}</h2>}
          <button className={styles.closeBtn} onClick={onClose}>
            <FiX />
          </button>
        </div>
        
        {children}
      </div>
    </div>
  );
}
