'use client';

import dynamic from 'next/dynamic';

const SalesTrendGraph = dynamic(() => import('@/components/dashboard/SalesTrendGraph'), { 
  ssr: false,
  loading: () => <div className="glass" style={{ height: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '16px' }}>Loading Graph...</div>
});

const OrdersTrendGraph = dynamic(() => import('@/components/dashboard/OrdersTrendGraph'), { 
  ssr: false,
  loading: () => <div className="glass" style={{ minHeight: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '16px' }}>Loading...</div>
});

export function SalesChartWrapper({ data, frequency }: { data: any[], frequency: string }) {
    return (
        <SalesTrendGraph 
            data={data} 
            frequency={frequency} 
            onFrequencyChange={() => {}} 
            loading={false} 
        />
    );
}

export function OrdersChartWrapper({ data }: { data: any[] }) {
    return (
        <OrdersTrendGraph 
            data={data} 
            loading={false} 
        />
    );
}
