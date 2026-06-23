import React from 'react';
import type { OrderStatus } from '@/types';

const cfg: Record<OrderStatus, { label: string; bg: string; text: string; dot: string }> = {
  new:                  { label: 'New Order',              bg: 'bg-blue-50',   text: 'text-blue-700',   dot: 'bg-blue-500'   },
  pending_verification: { label: 'Pending Verification',   bg: 'bg-yellow-50', text: 'text-yellow-700', dot: 'bg-yellow-500' },
  in_production:        { label: 'In Production',          bg: 'bg-orange-50', text: 'text-orange-700', dot: 'bg-orange-500' },
  ready_for_programming:{ label: 'Ready for Programming',  bg: 'bg-purple-50', text: 'text-purple-700', dot: 'bg-purple-500' },
  shipped:              { label: 'Shipped',                 bg: 'bg-indigo-50', text: 'text-indigo-700', dot: 'bg-indigo-500' },
  completed:            { label: 'Completed',               bg: 'bg-green-50',  text: 'text-green-700',  dot: 'bg-green-500'  },
};

export const STATUS_OPTIONS: Array<{ value: OrderStatus; label: string }> = Object.entries(cfg).map(
  ([k, v]) => ({ value: k as OrderStatus, label: v.label })
);

export default function StatusBadge({ status, size = 'md' }: { status: OrderStatus; size?: 'sm' | 'md' }) {
  const c = cfg[status];
  return (
    <span className={`inline-flex items-center gap-1.5 ${c.bg} ${c.text} rounded-full font-medium ${size === 'sm' ? 'text-xs px-2.5 py-1' : 'text-sm px-3 py-1.5'}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
}
