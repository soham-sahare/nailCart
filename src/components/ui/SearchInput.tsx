import React from 'react';
import { FiSearch } from 'react-icons/fi';
import styles from './SearchInput.module.css';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export default function SearchInput({ value, onChange, placeholder = 'Search...', className = '' }: SearchInputProps) {
  return (
    <div className={`${styles.searchGroup} ${className}`}>
      <FiSearch color="#888" size={20} />
      <input
        type="text"
        placeholder={placeholder}
        className={styles.searchInput}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
