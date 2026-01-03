import React from 'react';
import { IconType } from 'react-icons';

interface StatCardProps {
    title: string;
    value: string | number;
    icon: IconType;
    color: string;
    bg?: string;
}

export default function StatCard({ title, value, icon: Icon, color, bg }: StatCardProps) {
    // Basic color mapping
    let colorStyle: any = { color: '#666' };
    let bgStyle: any = { background: '#f5f5f5' };
    
    // Inline style overrides for specific colors if explicitly passed or mapped via props
    if (color.includes('green')) { colorStyle = { color: '#10b981' }; bgStyle = { background: 'rgba(16, 185, 129, 0.1)' }; }
    if (color.includes('blue')) { colorStyle = { color: '#3b82f6' }; bgStyle = { background: 'rgba(59, 130, 246, 0.1)' }; }
    if (color.includes('purple')) { colorStyle = { color: '#8b5cf6' }; bgStyle = { background: 'rgba(139, 92, 246, 0.1)' }; }
    if (color.includes('red')) { colorStyle = { color: '#ef4444' }; bgStyle = { background: 'rgba(239, 68, 68, 0.1)' }; }
    if (color.includes('orange')) { colorStyle = { color: '#f97316' }; bgStyle = { background: 'rgba(249, 115, 22, 0.1)' }; }
    if (color.includes('pink')) { colorStyle = { color: '#ec4899' }; bgStyle = { background: 'rgba(236, 72, 153, 0.1)' }; }

    // Allow manual overrides if passed in props (bg prop usually holds tailwind class, but we using styles here for precise glassmorphism)
    // Actually the dashboard passed partial tailwind classes strings like "bg-green-500/10".
    // But since we using inline styles in the original component, I'll stick to the logic extracted.
    
    return (
        <div className="glass" style={{ padding: '1.25rem', borderRadius: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ 
                width: '50px', 
                height: '50px', 
                borderRadius: '1rem', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                fontSize: '1.5rem',
                ...colorStyle,
                ...bgStyle
            }}>
                <Icon />
            </div>
            <div>
                <p style={{ color: '#888', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</p>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700, lineHeight: 1.2 }}>{value}</h2>
            </div>
        </div>
    );
}
