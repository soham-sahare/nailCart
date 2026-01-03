import React, { useState, useRef, useEffect } from 'react';
import { FiCalendar, FiFilter, FiChevronDown } from 'react-icons/fi';

interface FilterBarProps {
    range: string;
    setRange: (range: string) => void;
    customRange: { from: string; to: string };
    setCustomRange: (range: { from: string; to: string }) => void;
    onApply: () => void;
}

export default function FilterBar({ range, setRange, customRange, setCustomRange, onApply }: FilterBarProps) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const filters = [
        { id: '1d', label: 'Today' },
        { id: '3d', label: '3 Days' },
        { id: '7d', label: '7 Days' },
        { id: '15d', label: '15 Days' },
        { id: 'this_month', label: 'This Month' },
        { id: 'custom', label: 'Custom Range' },
        { id: 'all_time', label: 'All Time' }
    ];

    const currentLabel = filters.find(f => f.id === range)?.label || 'Filter';

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className="glass" style={{ padding: '0.75rem 1.5rem', display: 'flex', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'center', justifyContent: 'flex-end', borderRadius: '1rem' }}>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ color: '#888', fontSize: '0.9rem', fontWeight: 500 }}>Show:</span>
                
                <div style={{ position: 'relative' }} ref={dropdownRef}>
                    <button
                        onClick={() => setIsOpen(!isOpen)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.5rem 1.25rem',
                            background: '#1f1f1f', // Dark background like image
                            color: '#fff',
                            borderRadius: '2rem',
                            border: '1px solid rgba(255,255,255,0.1)',
                            fontSize: '0.9rem',
                            cursor: 'pointer',
                            minWidth: '140px',
                            justifyContent: 'space-between'
                        }}
                    >
                        <span>{currentLabel}</span>
                        <FiChevronDown />
                    </button>

                    {isOpen && (
                        <div className="glass" style={{
                            position: 'absolute',
                            top: '120%',
                            right: 0,
                            zIndex: 50,
                            minWidth: '160px',
                            padding: '0.5rem',
                            borderRadius: '1rem',
                            border: '1px solid var(--border)',
                            background: 'var(--card-bg)',
                            boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
                        }}>
                             {filters.map(f => (
                                <button
                                    key={f.id}
                                    onClick={() => {
                                        setRange(f.id);
                                        setIsOpen(false);
                                    }}
                                    style={{
                                        display: 'block',
                                        width: '100%',
                                        textAlign: 'left',
                                        padding: '0.75rem 1rem',
                                        borderRadius: '0.75rem',
                                        background: range === f.id ? 'var(--primary)' : 'transparent',
                                        color: range === f.id ? '#fff' : 'var(--foreground)',
                                        border: 'none',
                                        marginBottom: '0.25rem',
                                        fontSize: '0.9rem',
                                        cursor: 'pointer'
                                    }}
                                >
                                    {f.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {range === 'custom' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', animation: 'fadeIn 0.2s ease' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.25rem 0.5rem', background: 'var(--card-bg-light)', borderRadius: '0.5rem', border: '1px solid var(--border)' }}>
                        <span style={{fontSize: '0.8rem', opacity: 0.6}}>From</span>
                        <input 
                            type="date" 
                            value={customRange.from}
                            onChange={(e) => setCustomRange({...customRange, from: e.target.value})}
                            style={{ background: 'transparent', border: 'none', fontSize: '0.9rem', outline: 'none', color: 'var(--foreground)' }}
                        />
                    </div>
                    <span style={{opacity:0.4}}>-</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.25rem 0.5rem', background: 'var(--card-bg-light)', borderRadius: '0.5rem', border: '1px solid var(--border)' }}>
                         <span style={{fontSize: '0.8rem', opacity: 0.6}}>To</span>
                        <input 
                            type="date" 
                            value={customRange.to}
                            onChange={(e) => setCustomRange({...customRange, to: e.target.value})}
                            style={{ background: 'transparent', border: 'none', fontSize: '0.9rem', outline: 'none', color: 'var(--foreground)' }}
                        />
                    </div>
                    <button 
                        onClick={onApply}
                        className="btn-primary"
                        style={{ padding: '0.5rem 1rem', fontSize: '0.9rem', borderRadius: '0.5rem' }}
                    >
                        Apply
                    </button>
                </div>
            )}
        </div>
    );
}

