'use client';

import React, { useState } from 'react';
import { FiAlertCircle, FiMaximize2 } from 'react-icons/fi';
import Modal from '@/components/ui/Modal';

interface LowStockSectionProps {
    products: any[];
}

export default function LowStockSection({ products }: LowStockSectionProps) {
    const [isModalOpen, setIsModalOpen] = useState(false);

    const LowStockTable = ({ data }: { data: any[] }) => (
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <tbody>
                {data.map((p: any) => (
                    <tr key={String(p._id)} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '0.75rem 0', fontWeight: 500, fontSize: '0.9rem' }}>
                            {p.name}
                            {p.sku && (
                                <span style={{ color: '#888', fontWeight: 400, marginLeft: '5px', fontSize: '0.85rem' }}>
                                    - {p.sku}
                                </span>
                            )}
                        </td>
                        <td style={{ padding: '0.75rem 0', textAlign: 'right', color: '#ef4444', fontWeight: 700, fontSize: '1.1rem' }}>
                            {p.quantity}
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    );

    return (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="glass custom-scrollbar" style={{ borderRadius: '1.5rem', maxHeight: '350px', overflowY: 'auto' }}>
                <div style={{ 
                    position: 'sticky', 
                    top: 0, 
                    background: 'var(--glass-bg)', 
                    backdropFilter: 'blur(10px)', 
                    padding: '1.5rem 1.5rem 0.5rem 1.5rem', 
                    zIndex: 10, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                        <FiAlertCircle /> Low Stock
                    </h3>
                    {products.length > 0 && (
                        <button 
                            onClick={() => setIsModalOpen(true)}
                            style={{ 
                                background: 'transparent', 
                                border: 'none', 
                                color: '#888', 
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                padding: '5px'
                            }}
                            title="Expand List"
                        >
                            <FiMaximize2 />
                        </button>
                    )}
                </div>

                <div style={{ padding: '0 1.5rem 1.5rem 1.5rem' }}>
                    {products.length === 0 ? (
                        <div style={{ color: '#888', fontStyle: 'italic', fontSize: '0.9rem' }}>Stock levels are healthy.</div>
                    ) : (
                        <LowStockTable data={products} />
                    )}
                </div>
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title="Low Stock Items"
                width="600px"
            >
                <div style={{ maxHeight: '70vh', overflowY: 'auto', paddingRight: '10px' }} className="custom-scrollbar">
                    <LowStockTable data={products} />
                </div>
            </Modal>
        </div>
    );
}
