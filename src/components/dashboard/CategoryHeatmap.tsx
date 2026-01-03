'use client';

import { ResponsiveContainer, Treemap, Tooltip } from 'recharts';

interface CategoryHeatmapProps {
  data: { name: string; value: number }[];
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass" style={{ padding: '0.5rem 1rem', border: 'none', borderRadius: '8px', background: 'rgba(0,0,0,0.8)', color: '#fff' }}>
        <p style={{ fontWeight: 600 }}>{payload[0].payload.name}</p>
        <p style={{ fontSize: '0.9rem', opacity: 0.8 }}>Sales: {payload[0].value}</p>
      </div>
    );
  }
  return null;
};

const CustomContent = (props: any) => {
    const { root, depth, x, y, width, height, index, colors, name, value } = props;
    
    return (
      <g>
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          style={{
            fill: index % 2 === 0 ? '#8b5cf6' : '#a78bfa', // Alternating purples
            stroke: '#fff',
            strokeWidth: 2 / (depth + 1e-10),
            strokeOpacity: 1 / (depth + 1e-10),
          }}
        />
        {width > 50 && height > 30 && (
          <text
            x={x + width / 2}
            y={y + height / 2}
            textAnchor="middle"
            fill="#fff"
            fontSize={12}
            fontWeight={600}
          >
            {name}
          </text>
        )}
         {width > 50 && height > 50 && (
          <text
            x={x + width / 2}
            y={y + height / 2 + 16}
            textAnchor="middle"
            fill="rgba(255,255,255,0.8)"
            fontSize={10}
          >
            {value}
          </text>
        )}
      </g>
    );
  };

export default function CategoryHeatmap({ data }: CategoryHeatmapProps) {
  // If no data, show empty state
  if (!data || data.length === 0) {
      return (
          <div className="glass" style={{ padding: '1.5rem', borderRadius: '1.5rem', height: '100%', minHeight: '300px', display:'flex', alignItems:'center', justifyContent:'center', color:'#888' }}>
              No Category Data
          </div>
      )
  }

  return (
    <div className="glass" style={{ padding: '1.5rem', borderRadius: '1.5rem', height: '100%', minHeight: '300px' }}>
      <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.5rem' }}>Top Categories (Heatmap)</h3>
      <div style={{ height: '250px', width: '100%' }}>
        <ResponsiveContainer width="100%" height="100%">
          <Treemap
            data={data}
            dataKey="value"
            aspectRatio={4 / 3}
            stroke="#fff"
            content={<CustomContent />}
            isAnimationActive={false} // Performance
          >
            <Tooltip content={<CustomTooltip />} />
          </Treemap>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
