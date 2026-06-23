import React from 'react';
import type { OrderStatus } from '@/types';

const cfg: Record<OrderStatus, { label: string; bg: string; text: string; dot: string }> = {
  new:                   { label:'New Order',             bg:'#eff6ff', text:'#1d4ed8', dot:'#3b82f6' },
  pending_verification:  { label:'Pending Verification',  bg:'#fefce8', text:'#a16207', dot:'#eab308' },
  in_production:         { label:'In Production',         bg:'#fff7ed', text:'#9a3412', dot:'#f97316' },
  ready_for_programming: { label:'Ready for Programming', bg:'#faf5ff', text:'#7e22ce', dot:'#a855f7' },
  shipped:               { label:'Shipped',               bg:'#eef2ff', text:'#4338ca', dot:'#6366f1' },
  completed:             { label:'Completed',             bg:'#f0fdf4', text:'#15803d', dot:'#22c55e' },
};

export const STATUS_OPTIONS: Array<{value:OrderStatus;label:string}> = Object.entries(cfg).map(([k,v])=>({value:k as OrderStatus,label:v.label}));

export default function StatusBadge({ status, size='md' }: { status:OrderStatus; size?:'sm'|'md' }) {
  const c = cfg[status];
  return (
    <span style={{
      display:'inline-flex',alignItems:'center',gap:6,
      background:c.bg,color:c.text,
      padding: size==='sm' ? '4px 10px' : '5px 12px',
      borderRadius:99,
      fontSize: size==='sm' ? 11 : 13,
      fontWeight:600,
      fontFamily:"'DM Sans',system-ui,sans-serif",
      whiteSpace:'nowrap',
    }}>
      <span style={{ width:6,height:6,borderRadius:'50%',background:c.dot,flexShrink:0 }}/>
      {c.label}
    </span>
  );
}
