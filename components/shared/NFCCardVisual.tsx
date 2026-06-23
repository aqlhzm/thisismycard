'use client';
import React from 'react';
import type { CardColor } from '@/types';

interface NFCCardVisualProps {
  color: CardColor;
  name?: string;
  title?: string;
  company?: string;
  size?: 'sm' | 'md' | 'lg';
  animated?: boolean;
}

const colorClasses: Record<CardColor, { bg: string; text: string; sub: string }> = {
  black:     { bg: 'nfc-card-black',     text: 'text-white',      sub: 'text-gray-400' },
  white:     { bg: 'nfc-card-white',     text: 'text-gray-900',   sub: 'text-gray-500' },
  orange:    { bg: 'nfc-card-orange',    text: 'text-white',      sub: 'text-orange-100' },
  green:     { bg: 'nfc-card-green',     text: 'text-white',      sub: 'text-green-100' },
  red:       { bg: 'nfc-card-red',       text: 'text-white',      sub: 'text-red-100' },
  pink:      { bg: 'nfc-card-pink',      text: 'text-white',      sub: 'text-pink-100' },
  blue:      { bg: 'nfc-card-blue',      text: 'text-white',      sub: 'text-blue-100' },
  turquoise: { bg: 'nfc-card-turquoise', text: 'text-white',      sub: 'text-cyan-100' },
};

const sizeMap = {
  sm: { w: 'w-48',  h: 'h-[120px]', name: 'text-sm',  sub: 'text-xs',  p: 'p-4' },
  md: { w: 'w-72',  h: 'h-[170px]', name: 'text-lg',  sub: 'text-sm',  p: 'p-5' },
  lg: { w: 'w-96',  h: 'h-[228px]', name: 'text-2xl', sub: 'text-base',p: 'p-7' },
};

export default function NFCCardVisual({
  color, name = 'Your Name', title = 'Job Title', company = 'Company',
  size = 'md', animated = false,
}: NFCCardVisualProps) {
  const c = colorClasses[color];
  const s = sizeMap[size];
  return (
    <div className={`${s.w} ${s.h} ${c.bg} ${s.p} rounded-2xl flex flex-col justify-between relative overflow-hidden ${animated ? 'animate-float' : ''}`}>
      <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/10" />
      <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full bg-white/5" />
      <div className="absolute top-3 right-4 opacity-30">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className={c.text}>
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
          <circle cx="12" cy="12" r="3" opacity=".5"/>
        </svg>
      </div>
      <div className={`${c.sub} text-xs font-medium tracking-widest uppercase opacity-60`}>ThisIsMyCard</div>
      <div>
        <div className={`${c.text} ${s.name} font-semibold leading-tight`}>{name}</div>
        <div className={`${c.sub} ${s.sub} mt-0.5`}>{title}</div>
        <div className={`${c.sub} ${s.sub} opacity-70`}>{company}</div>
      </div>
    </div>
  );
}
