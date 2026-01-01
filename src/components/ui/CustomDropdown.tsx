'use client';

import { useState, useRef, useEffect } from 'react';
import { FiChevronDown } from 'react-icons/fi';
import styles from './CustomDropdown.module.css';

interface Option {
  value: string;
  label: string;
}

interface CustomDropdownProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchable?: boolean;
}

export default function CustomDropdown({ options, value, onChange, placeholder = 'Select...', searchable = false }: CustomDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
    setSearchQuery('');
  };

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
    }
  }, [isOpen]);

  const filteredOptions = options.filter(opt => 
    opt.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <div className={styles.container} ref={dropdownRef}>
      <button 
        type="button" 
        className={`${styles.trigger} ${isOpen ? styles.open : ''}`} 
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>{selectedOption ? selectedOption.label : placeholder}</span>
        <FiChevronDown className={styles.chevron} style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} />
      </button>

      {isOpen && (
        <div className={styles.menu}>
          {searchable && (
            <div className={styles.searchContainer} onClick={(e) => e.stopPropagation()}>
              <input
                type="text"
                placeholder="Search..."
                className={styles.searchInput}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
            </div>
          )}
          
          <div className={styles.optionsList}>
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => (
                <div
                  key={option.value}
                  className={`${styles.option} ${value === option.value ? styles.selected : ''}`}
                  onClick={() => handleSelect(option.value)}
                >
                  {option.label}
                </div>
              ))
            ) : (
              <div className={styles.noResults}>No results found</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
