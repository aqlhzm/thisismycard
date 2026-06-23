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

const colorConfig: Record<CardColor, { bg: string; nameColor: string; subColor: string; shimmer: string }> = {
  black:     { bg: 'nfc-card-black',     nameColor: '#ffffff',   subColor: 'rgba(255,255,255,0.5)',  shimmer: 'rgba(255,255,255,0.06)' },
  white:     { bg: 'nfc-card-white',     nameColor: '#0F0F0F',   subColor: 'rgba(0,0,0,0.45)',        shimmer: 'rgba(0,0,0,0.04)'       },
  orange:    { bg: 'nfc-card-orange',    nameColor: '#ffffff',   subColor: 'rgba(255,255,255,0.65)',  shimmer: 'rgba(255,255,255,0.08)' },
  green:     { bg: 'nfc-card-green',     nameColor: '#ffffff',   subColor: 'rgba(255,255,255,0.65)',  shimmer: 'rgba(255,255,255,0.08)' },
  red:       { bg: 'nfc-card-red',       nameColor: '#ffffff',   subColor: 'rgba(255,255,255,0.65)',  shimmer: 'rgba(255,255,255,0.08)' },
  pink:      { bg: 'nfc-card-pink',      nameColor: '#ffffff',   subColor: 'rgba(255,255,255,0.65)',  shimmer: 'rgba(255,255,255,0.08)' },
  blue:      { bg: 'nfc-card-blue',      nameColor: '#ffffff',   subColor: 'rgba(255,255,255,0.65)',  shimmer: 'rgba(255,255,255,0.08)' },
  turquoise: { bg: 'nfc-card-turquoise', nameColor: '#ffffff',   subColor: 'rgba(255,255,255,0.65)',  shimmer: 'rgba(255,255,255,0.08)' },
};

const sizeConfig = {
  sm: { width: 192, height: 114, nameSz: 13, subSz: 10.5, pad: 16, logoSz: 9, nfcSz: 14 },
  md: { width: 288, height: 172, nameSz: 17, subSz: 13,   pad: 22, logoSz: 11, nfcSz: 18 },
  lg: { width: 380, height: 228, nameSz: 22, subSz: 15,   pad: 28, logoSz: 13, nfcSz: 22 },
};

export default function NFCCardVisual({
  color, name = 'Your Name', title = 'Job Title', company = 'Company Name',
  size = 'md', animated = false,
}: NFCCardVisualProps) {
  const c = colorConfig[color];
  const s = sizeConfig[size];

  return (
    <div
      className={`${c.bg} relative overflow-hidden select-none${animated ? ' animate-float' : ''}`}
      style={{
        width: s.width,
        height: s.height,
        borderRadius: 16,
        flexShrink: 0,
      }}
    >
      {/* Noise texture overlay */}
      <div style={{
        position:'absolute',inset:0,
        backgroundImage:`url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E")`,
        opacity:0.6,
        pointerEvents:'none',
      }}/>

      {/* Highlight streak */}
      <div style={{
        position:'absolute',top:-40,left:-40,width:'60%',height:'130%',
        background:`linear-gradient(135deg, ${c.shimmer} 0%, transparent 60%)`,
        transform:'rotate(-10deg)',pointerEvents:'none',
      }}/>

      {/* Bottom glow */}
      <div style={{
        position:'absolute',bottom:-20,right:-20,width:120,height:120,
        borderRadius:'50%',
        background:color==='black'?'rgba(0,212,255,0.08)':color==='white'?'rgba(0,0,0,0.04)':'rgba(255,255,255,0.1)',
        filter:'blur(20px)',pointerEvents:'none',
      }}/>

      {/* Content */}
      <div style={{ position:'absolute',inset:0,padding:s.pad,display:'flex',flexDirection:'column',justifyContent:'space-between' }}>
        {/* Top row */}
        <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start' }}>
          {/* Brand */}
          <div style={{
            color:c.subColor,
            fontSize:s.logoSz,
            fontWeight:600,
            letterSpacing:'0.15em',
            textTransform:'uppercase',
            fontFamily:"'DM Sans',system-ui,sans-serif",
          }}>
            ThisIsMyCard
          </div>
          {/* NFC icon */}
          <svg width={s.nfcSz} height={s.nfcSz} viewBox="0 0 24 24" fill="none" style={{opacity:0.4}}>
            <path d="M20 12C20 7.58172 16.4183 4 12 4" stroke={c.nameColor} strokeWidth="2" strokeLinecap="round"/>
            <path d="M16 12C16 9.79086 14.2091 8 12 8" stroke={c.nameColor} strokeWidth="2" strokeLinecap="round"/>
            <circle cx="12" cy="12" r="2" fill={c.nameColor}/>
          </svg>
        </div>

        {/* Bottom name block */}
        <div>
          <div style={{
            color: c.nameColor,
            fontSize: s.nameSz,
            fontWeight: 600,
            lineHeight: 1.2,
            fontFamily:"'DM Sans',system-ui,sans-serif",
            marginBottom: 3,
            letterSpacing: '-0.02em',
          }}>
            {name}
          </div>
          <div style={{
            color: c.subColor,
            fontSize: s.subSz,
            fontWeight: 400,
            fontFamily:"'DM Sans',system-ui,sans-serif",
            lineHeight: 1.4,
          }}>
            {title}
          </div>
          <div style={{
            color: c.subColor,
            fontSize: s.subSz - 1,
            fontWeight: 400,
            fontFamily:"'DM Sans',system-ui,sans-serif",
            opacity: 0.75,
          }}>
            {company}
          </div>
        </div>
      </div>

      {/* Card edge gloss */}
      <div style={{
        position:'absolute',inset:0,
        borderRadius:16,
        boxShadow:'inset 0 1px 0 rgba(255,255,255,0.15), inset 0 -1px 0 rgba(0,0,0,0.1)',
        pointerEvents:'none',
      }}/>
    </div>
  );
}
