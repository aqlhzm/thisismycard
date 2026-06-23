'use client';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import NFCCardVisual from '@/components/shared/NFCCardVisual';
import StatusBadge, { STATUS_OPTIONS } from '@/components/shared/StatusBadge';
import { submitOrder, adminLogin, getAllOrders, updateOrderStatus } from '@/lib/actions';
import type { CardColor, Order, OrderStatus, AppView } from '@/types';

/* ─────────── shared constants ─────────── */
const CARD_COLORS: Array<{ value: CardColor; label: string; hex: string }> = [
  { value:'black',     label:'Black',     hex:'#0F0F0F' },
  { value:'white',     label:'White',     hex:'#F0F0F0' },
  { value:'orange',    label:'Orange',    hex:'#f97316' },
  { value:'green',     label:'Green',     hex:'#22c55e' },
  { value:'red',       label:'Red',       hex:'#ef4444' },
  { value:'pink',      label:'Pink',      hex:'#ec4899' },
  { value:'blue',      label:'Blue',      hex:'#3b82f6' },
  { value:'turquoise', label:'Turquoise', hex:'#06b6d4' },
];
const SWATCH: Record<CardColor,string> = Object.fromEntries(CARD_COLORS.map(c=>[c.value,c.hex])) as Record<CardColor,string>;

const fmt = (d:string) => new Date(d).toLocaleDateString('en-MY',{day:'numeric',month:'short',year:'numeric'});

/* ─────────── S (inline style shorthands) ─────────── */
const S = {
  page: { fontFamily:"'DM Sans',system-ui,sans-serif", background:'#FAFAF8', minHeight:'100vh' } as React.CSSProperties,
  pageDark: { fontFamily:"'DM Sans',system-ui,sans-serif", background:'#0A0A0A', minHeight:'100vh' } as React.CSSProperties,
};

/* ─────────── Form types ─────────── */
interface FD {
  fullName:string; jobTitle:string; companyName:string; phone:string; email:string; whatsapp:string;
  website:string; facebook:string; instagram:string; linkedin:string;
  cardColor:CardColor; orderNumber:string; purchaseDate:string; quantityOrdered:string; additionalNotes:string;
  profilePhotoB64:string; profilePhotoName:string;
}
const empty:FD={ fullName:'',jobTitle:'',companyName:'',phone:'',email:'',whatsapp:'',website:'',facebook:'',instagram:'',linkedin:'',cardColor:'black',orderNumber:'',purchaseDate:'',quantityOrdered:'1',additionalNotes:'',profilePhotoB64:'',profilePhotoName:'' };

/* ─────────── Input component ─────────── */
function FInput({ label, name, type='text', placeholder, required, prefix, form, onChange, error }:
  { label:string; name:keyof FD; type?:string; placeholder?:string; required?:boolean; prefix?:string; form:FD; onChange:(n:keyof FD,v:string)=>void; error?:string }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
      <label style={{ fontSize:13, fontWeight:500, color:'#374151' }}>
        {label}{required && <span style={{ color:'#ef4444' }}> *</span>}
      </label>
      <div style={{
        display:'flex', borderRadius:10, border:`1px solid ${error?'#fca5a5':'#e5e7eb'}`,
        background:'#fff', overflow:'hidden',
        transition:'box-shadow .15s, border-color .15s',
      }}>
        {prefix && (
          <span style={{ display:'flex',alignItems:'center',padding:'0 12px',background:'#f9fafb',borderRight:'1px solid #e5e7eb',color:'#9ca3af',fontSize:12,whiteSpace:'nowrap',fontWeight:500 }}>
            {prefix}
          </span>
        )}
        <input
          type={type} value={form[name]}
          onChange={e=>onChange(name,e.target.value)}
          placeholder={placeholder}
          style={{ flex:1,padding:'11px 14px',fontSize:14,outline:'none',background:'transparent',color:'#111827' }}
          onFocus={e=>(e.currentTarget.parentElement!.style.boxShadow='0 0 0 3px rgba(0,212,255,0.15)',e.currentTarget.parentElement!.style.borderColor='#00D4FF')}
          onBlur={e=>(e.currentTarget.parentElement!.style.boxShadow='',e.currentTarget.parentElement!.style.borderColor=error?'#fca5a5':'#e5e7eb')}
        />
      </div>
      {error && <p style={{ fontSize:12, color:'#ef4444', margin:0 }}>{error}</p>}
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   LANDING PAGE
══════════════════════════════════════════════════════ */
// ── THEME DEFINITIONS ──────────────────────────────────────────
const THEMES: Record<CardColor, {
  bg: string; surface: string; surfaceHover: string;
  text: string; textSub: string; textMuted: string;
  accent: string; accentText: string; accentGlow: string;
  border: string; borderStrong: string;
  badgeBg: string; badgeBorder: string; badgeText: string;
  navBg: string; statBorder: string;
  cardGlow: string; heroGlow: string;
}> = {
  black: {
    bg:'#0A0A0A', surface:'rgba(255,255,255,0.04)', surfaceHover:'rgba(255,255,255,0.08)',
    text:'#FFFFFF', textSub:'rgba(255,255,255,0.65)', textMuted:'rgba(255,255,255,0.35)',
    accent:'#F0A500', accentText:'#0A0A0A', accentGlow:'rgba(240,165,0,0.4)',
    border:'rgba(255,255,255,0.08)', borderStrong:'rgba(255,255,255,0.15)',
    badgeBg:'rgba(240,165,0,0.12)', badgeBorder:'rgba(240,165,0,0.25)', badgeText:'#F0A500',
    navBg:'rgba(10,10,10,0.88)', statBorder:'rgba(255,255,255,0.08)',
    cardGlow:'rgba(240,165,0,0.35)', heroGlow:'radial-gradient(ellipse 55% 65% at 68% 50%, rgba(240,165,0,0.08) 0%, transparent 70%)',
  },
  white: {
    bg:'#F5F4F0', surface:'rgba(0,0,0,0.04)', surfaceHover:'rgba(0,0,0,0.07)',
    text:'#0A0A0A', textSub:'rgba(0,0,0,0.6)', textMuted:'rgba(0,0,0,0.35)',
    accent:'#0A0A0A', accentText:'#FFFFFF', accentGlow:'rgba(0,0,0,0.2)',
    border:'rgba(0,0,0,0.08)', borderStrong:'rgba(0,0,0,0.15)',
    badgeBg:'rgba(0,0,0,0.06)', badgeBorder:'rgba(0,0,0,0.12)', badgeText:'#555',
    navBg:'rgba(245,244,240,0.92)', statBorder:'rgba(0,0,0,0.08)',
    cardGlow:'rgba(0,0,0,0.15)', heroGlow:'radial-gradient(ellipse 55% 65% at 68% 50%, rgba(0,0,0,0.04) 0%, transparent 70%)',
  },
  orange: {
    bg:'#0D0600', surface:'rgba(249,115,22,0.06)', surfaceHover:'rgba(249,115,22,0.1)',
    text:'#FFFFFF', textSub:'rgba(255,255,255,0.65)', textMuted:'rgba(255,255,255,0.35)',
    accent:'#F97316', accentText:'#0D0600', accentGlow:'rgba(249,115,22,0.5)',
    border:'rgba(249,115,22,0.15)', borderStrong:'rgba(249,115,22,0.3)',
    badgeBg:'rgba(249,115,22,0.15)', badgeBorder:'rgba(249,115,22,0.3)', badgeText:'#FB923C',
    navBg:'rgba(13,6,0,0.92)', statBorder:'rgba(249,115,22,0.15)',
    cardGlow:'rgba(249,115,22,0.45)', heroGlow:'radial-gradient(ellipse 55% 65% at 68% 50%, rgba(249,115,22,0.15) 0%, transparent 70%)',
  },
  green: {
    bg:'#020D04', surface:'rgba(34,197,94,0.05)', surfaceHover:'rgba(34,197,94,0.09)',
    text:'#FFFFFF', textSub:'rgba(255,255,255,0.65)', textMuted:'rgba(255,255,255,0.35)',
    accent:'#22C55E', accentText:'#020D04', accentGlow:'rgba(34,197,94,0.5)',
    border:'rgba(34,197,94,0.15)', borderStrong:'rgba(34,197,94,0.3)',
    badgeBg:'rgba(34,197,94,0.12)', badgeBorder:'rgba(34,197,94,0.25)', badgeText:'#4ADE80',
    navBg:'rgba(2,13,4,0.92)', statBorder:'rgba(34,197,94,0.15)',
    cardGlow:'rgba(34,197,94,0.45)', heroGlow:'radial-gradient(ellipse 55% 65% at 68% 50%, rgba(34,197,94,0.14) 0%, transparent 70%)',
  },
  red: {
    bg:'#0D0202', surface:'rgba(239,68,68,0.05)', surfaceHover:'rgba(239,68,68,0.09)',
    text:'#FFFFFF', textSub:'rgba(255,255,255,0.65)', textMuted:'rgba(255,255,255,0.35)',
    accent:'#EF4444', accentText:'#FFFFFF', accentGlow:'rgba(239,68,68,0.5)',
    border:'rgba(239,68,68,0.15)', borderStrong:'rgba(239,68,68,0.3)',
    badgeBg:'rgba(239,68,68,0.12)', badgeBorder:'rgba(239,68,68,0.25)', badgeText:'#F87171',
    navBg:'rgba(13,2,2,0.92)', statBorder:'rgba(239,68,68,0.15)',
    cardGlow:'rgba(239,68,68,0.45)', heroGlow:'radial-gradient(ellipse 55% 65% at 68% 50%, rgba(239,68,68,0.14) 0%, transparent 70%)',
  },
  pink: {
    bg:'#0D0208', surface:'rgba(236,72,153,0.05)', surfaceHover:'rgba(236,72,153,0.09)',
    text:'#FFFFFF', textSub:'rgba(255,255,255,0.65)', textMuted:'rgba(255,255,255,0.35)',
    accent:'#EC4899', accentText:'#FFFFFF', accentGlow:'rgba(236,72,153,0.5)',
    border:'rgba(236,72,153,0.15)', borderStrong:'rgba(236,72,153,0.3)',
    badgeBg:'rgba(236,72,153,0.12)', badgeBorder:'rgba(236,72,153,0.25)', badgeText:'#F472B6',
    navBg:'rgba(13,2,8,0.92)', statBorder:'rgba(236,72,153,0.15)',
    cardGlow:'rgba(236,72,153,0.45)', heroGlow:'radial-gradient(ellipse 55% 65% at 68% 50%, rgba(236,72,153,0.14) 0%, transparent 70%)',
  },
  blue: {
    bg:'#01030D', surface:'rgba(59,130,246,0.06)', surfaceHover:'rgba(59,130,246,0.1)',
    text:'#FFFFFF', textSub:'rgba(255,255,255,0.65)', textMuted:'rgba(255,255,255,0.35)',
    accent:'#3B82F6', accentText:'#FFFFFF', accentGlow:'rgba(59,130,246,0.5)',
    border:'rgba(59,130,246,0.15)', borderStrong:'rgba(59,130,246,0.3)',
    badgeBg:'rgba(59,130,246,0.12)', badgeBorder:'rgba(59,130,246,0.25)', badgeText:'#60A5FA',
    navBg:'rgba(1,3,13,0.92)', statBorder:'rgba(59,130,246,0.15)',
    cardGlow:'rgba(59,130,246,0.45)', heroGlow:'radial-gradient(ellipse 55% 65% at 68% 50%, rgba(59,130,246,0.14) 0%, transparent 70%)',
  },
  turquoise: {
    bg:'#010C0D', surface:'rgba(6,182,212,0.05)', surfaceHover:'rgba(6,182,212,0.09)',
    text:'#FFFFFF', textSub:'rgba(255,255,255,0.65)', textMuted:'rgba(255,255,255,0.35)',
    accent:'#06B6D4', accentText:'#010C0D', accentGlow:'rgba(6,182,212,0.5)',
    border:'rgba(6,182,212,0.15)', borderStrong:'rgba(6,182,212,0.3)',
    badgeBg:'rgba(6,182,212,0.12)', badgeBorder:'rgba(6,182,212,0.25)', badgeText:'#22D3EE',
    navBg:'rgba(1,12,13,0.92)', statBorder:'rgba(6,182,212,0.15)',
    cardGlow:'rgba(6,182,212,0.45)', heroGlow:'radial-gradient(ellipse 55% 65% at 68% 50%, rgba(6,182,212,0.14) 0%, transparent 70%)',
  },
};

// ── TRANSLATIONS ─────────────────────────────────────────────────
type LangCode = 'en'|'ms'|'zh'|'ta';
const LANGS: Record<LangCode, {
  badge:string; h1a:string; h1b:string; h1c:string; sub:string;
  cta1:string; cta2:string; stat1l:string; stat2l:string; stat3l:string;
  feat1t:string; feat1d:string; feat2t:string; feat2d:string; feat3t:string; feat3d:string;
  howTitle:string; step1t:string; step1d:string; step2t:string; step2d:string;
  step3t:string; step3d:string; step4t:string; step4d:string;
  ctaBannerT:string; ctaBannerS:string; ctaBannerBtn:string;
  tapHint:string; admin:string;
}> = {
  en: {
    badge:'NFC Digital Business Card · Malaysia',
    h1a:'Your network,', h1b:'one tap', h1c:'away.',
    sub:'Share your name, number, and all your links — no app, no QR. Just tap any phone.',
    cta1:'Setup My Card →', cta2:'See how it works',
    stat1l:'Cards Shipped', stat2l:'Satisfaction', stat3l:'Setup Time',
    feat1t:'One Tap Sharing', feat1d:'Share your full profile instantly with any NFC-enabled phone. No download needed.',
    feat2t:'Always Up to Date', feat2d:'Edit your details anytime. Every tap shows your latest info.',
    feat3t:'Premium Build', feat3d:'High-quality PVC card with metallic finish. Feels as premium as it looks.',
    howTitle:'How it works', step1t:'Purchase', step1d:'Order your NFC card online.',
    step2t:'Setup Profile', step2d:'Fill in your details via our portal.',
    step3t:'We Program It', step3d:'Our team programs your NFC chip.',
    step4t:'Start Tapping', step4d:'Tap any phone to share your profile.',
    ctaBannerT:'Already have a card?', ctaBannerS:'Fill in your details and we will configure your card within 48 hours.',
    ctaBannerBtn:'Set it up now →', tapHint:'Tap the card to change theme', admin:'Admin',
  },
  ms: {
    badge:'Kad Bisnes Digital NFC · Malaysia',
    h1a:'Rangkaian kau,', h1b:'satu ketukan', h1c:'sahaja.',
    sub:'Kongsi nama, nombor, dan semua link kau — tanpa app, tanpa QR. Tap je mana-mana telefon.',
    cta1:'Setup Kad Saya →', cta2:'Tengok cara kerja',
    stat1l:'Kad Dihantar', stat2l:'Kepuasan', stat3l:'Masa Setup',
    feat1t:'Kongsi Satu Ketukan', feat1d:'Kongsi profil kau serta-merta dengan mana-mana telefon NFC. Tanpa download.',
    feat2t:'Sentiasa Terkini', feat2d:'Edit maklumat bila-bila masa. Setiap ketukan tunjuk info terbaru.',
    feat3t:'Bina Premium', feat3d:'Kad PVC berkualiti tinggi dengan kemasan metalik. Premium dari luar ke dalam.',
    howTitle:'Cara kerja', step1t:'Beli', step1d:'Order kad NFC kau dalam talian.',
    step2t:'Setup Profil', step2d:'Isi maklumat melalui portal kami.',
    step3t:'Kami Program', step3d:'Pasukan kami program cip NFC kau.',
    step4t:'Mula Tap', step4d:'Tap mana-mana telefon untuk kongsi profil.',
    ctaBannerT:'Dah ada kad?', ctaBannerS:'Isi maklumat kau dan kami akan konfigurasi kad dalam 48 jam.',
    ctaBannerBtn:'Setup sekarang →', tapHint:'Tap kad untuk tukar tema', admin:'Admin',
  },
  zh: {
    badge:'NFC数字名片 · 马来西亚',
    h1a:'您的人脉，', h1b:'轻触即达，', h1c:'就这么简单。',
    sub:'分享您的姓名、号码和所有链接——无需应用，无需二维码，轻触任何手机即可。',
    cta1:'设置我的名片 →', cta2:'了解使用方式',
    stat1l:'已发货名片', stat2l:'满意度', stat3l:'设置时间',
    feat1t:'一触即分享', feat1d:'无需下载，即时与任何NFC手机分享您的完整资料。',
    feat2t:'随时保持最新', feat2d:'随时编辑您的信息，每次轻触都显示最新内容。',
    feat3t:'高端品质', feat3d:'高质量PVC卡，金属质感，外观与手感同样出色。',
    howTitle:'使用流程', step1t:'购买', step1d:'在线订购您的NFC名片。',
    step2t:'设置资料', step2d:'通过我们的门户填写您的信息。',
    step3t:'我们编程', step3d:'我们的团队为您的NFC芯片编程。',
    step4t:'开始使用', step4d:'轻触任何手机即可分享您的资料。',
    ctaBannerT:'已有名片？', ctaBannerS:'填写您的信息，我们将在48小时内配置您的名片。',
    ctaBannerBtn:'立即设置 →', tapHint:'点击名片更换主题', admin:'管理',
  },
  ta: {
    badge:'NFC டிஜிட்டல் வணிக அட்டை · மலேசியா',
    h1a:'உங்கள் தொடர்பு,', h1b:'ஒரு தட்டலில்,', h1c:'எளிதாக.',
    sub:'உங்கள் பெயர், எண், அனைத்து இணைப்புகளையும் பகிரவும் — ஆப் இல்லாமல், QR இல்லாமல்.',
    cta1:'என் அட்டை அமைக்க →', cta2:'எப்படி செயல்படுகிறது',
    stat1l:'அட்டைகள் அனுப்பப்பட்டன', stat2l:'திருப்தி', stat3l:'அமைப்பு நேரம்',
    feat1t:'ஒரு தட்டலில் பகிரவும்', feat1d:'எந்த NFC தொலைபேசியிலும் உடனடியாக பகிரவும்.',
    feat2t:'எப்போதும் புதுப்பிக்கப்பட்டது', feat2d:'எப்போது வேண்டுமானாலும் திருத்தவும்.',
    feat3t:'பிரீமியம் தரம்', feat3d:'உயர்தர PVC அட்டை, உலோக பூச்சுடன்.',
    howTitle:'எப்படி செயல்படுகிறது', step1t:'வாங்கு', step1d:'ஆன்லைனில் NFC அட்டை ஆர்டர் செய்யவும்.',
    step2t:'சுயவிவரம் அமைக்க', step2d:'எங்கள் போர்டல் வழியாக நிரப்பவும்.',
    step3t:'நாங்கள் புரோகிராம் செய்கிறோம்', step3d:'எங்கள் குழு NFC சிப்பை புரோகிராம் செய்கிறது.',
    step4t:'தட்டத் தொடங்கு', step4d:'எந்த தொலைபேசியையும் தட்டி பகிரவும்.',
    ctaBannerT:'ஏற்கனவே அட்டை இருக்கிறதா?', ctaBannerS:'48 மணி நேரத்தில் உங்கள் அட்டையை கட்டமைக்கிறோம்.',
    ctaBannerBtn:'இப்போது அமைக்க →', tapHint:'தீம் மாற்ற அட்டையை தட்டவும்', admin:'நிர்வாகம்',
  },
};

// Card image from brand assets (real product photo, cropped per color via CSS)
const CARDS_IMG = `data:image/jpeg;base64,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`;

// Card color order for cycling
const COLOR_ORDER: CardColor[] = ['black','white','orange','green','red','pink','blue','turquoise'];

// CSS class for each card position in the grid image
// The image has 2 rows x 4 cols: white, orange, red, blue (top) / black, green, pink, turquoise (bottom)
const CARD_CROP: Record<CardColor, { objectPosition: string }> = {
  white:     { objectPosition: '0% 0%' },
  orange:    { objectPosition: '33.3% 0%' },
  red:       { objectPosition: '66.6% 0%' },
  blue:      { objectPosition: '100% 0%' },
  black:     { objectPosition: '0% 100%' },
  green:     { objectPosition: '33.3% 100%' },
  pink:      { objectPosition: '66.6% 100%' },
  turquoise: { objectPosition: '100% 100%' },
};

function Landing({ sv }: { sv:(v:AppView)=>void }) {
  const [scrolled, setScrolled] = useState(false);
  const [activeColor, setActiveColor] = useState<CardColor>('black');
  const [lang, setLang] = useState<LangCode>('en');
  const [isTransitioning, setIsTransitioning] = useState(false);

  const t = LANGS[lang];
  const th = THEMES[activeColor];

  const cycleColor = () => {
    const idx = COLOR_ORDER.indexOf(activeColor);
    const next = COLOR_ORDER[(idx + 1) % COLOR_ORDER.length];
    setIsTransitioning(true);
    setTimeout(() => { setActiveColor(next); setIsTransitioning(false); }, 180);
  };

  useEffect(()=>{
    const h=()=>setScrolled(window.scrollY>20);
    window.addEventListener('scroll',h);
    return ()=>window.removeEventListener('scroll',h);
  },[]);

  return (
    <div style={{
      fontFamily:"'DM Sans',system-ui,sans-serif",
      minHeight:'100vh',
      background: th.bg,
      color: th.text,
      transition: 'background 0.5s ease, color 0.4s ease',
    }}>
      {/* ── Navbar ── */}
      <nav style={{
        position:'fixed',top:0,left:0,right:0,zIndex:50,
        display:'flex',alignItems:'center',justifyContent:'space-between',
        padding:'0 48px',height:64,
        background: scrolled ? th.navBg : 'transparent',
        backdropFilter: scrolled ? 'blur(20px)' : 'none',
        borderBottom: scrolled ? `1px solid ${th.border}` : '1px solid transparent',
        transition:'all .3s ease',
      }}>
        {/* Logo */}
        <div style={{ display:'flex',alignItems:'center',gap:10 }}>
          <div style={{ width:32,height:32,background:th.accent,borderRadius:9,display:'flex',alignItems:'center',justifyContent:'center',boxShadow:`0 2px 12px ${th.accentGlow}` }}>
            <span style={{ color:th.accentText,fontSize:13,fontWeight:800 }}>N</span>
          </div>
          <span style={{ fontWeight:700,fontSize:15,color:th.text,letterSpacing:'-0.02em' }}>ThisIsMyCard</span>
        </div>
        {/* Right nav */}
        <div style={{ display:'flex',alignItems:'center',gap:4 }}>
          {/* Language switcher — subtle */}
          {(['en','ms','zh','ta'] as LangCode[]).map(l => (
            <button key={l} onClick={()=>setLang(l)} style={{
              fontSize:11,fontWeight:lang===l?700:400,
              color:lang===l?th.accent:th.textMuted,
              background:'none',border:'none',cursor:'pointer',
              padding:'4px 6px',fontFamily:'inherit',
              letterSpacing:'0.03em',transition:'color .2s',
            }}>
              {l.toUpperCase()}
            </button>
          ))}
          <span style={{ color:th.border,margin:'0 4px' }}>·</span>
          <button onClick={()=>{ window.location.href='/admin'; }} style={{
            fontSize:13,color:th.textMuted,background:'none',border:'none',
            cursor:'pointer',padding:'8px 12px',borderRadius:8,fontFamily:'inherit',fontWeight:500,
            transition:'all .2s',
          }}
          onMouseOver={e=>(e.currentTarget.style.color=th.text)}
          onMouseOut={e=>(e.currentTarget.style.color=th.textMuted)}>
            {t.admin}
          </button>
          <button onClick={()=>sv('customer_form')} style={{
            fontSize:13,fontWeight:700,color:th.accentText,background:th.accent,
            border:'none',cursor:'pointer',padding:'9px 20px',borderRadius:9,
            fontFamily:'inherit',boxShadow:`0 2px 12px ${th.accentGlow}`,transition:'all .2s',
          }}
          onMouseOver={e=>{e.currentTarget.style.opacity='0.85';e.currentTarget.style.transform='translateY(-1px)';}}
          onMouseOut={e=>{e.currentTarget.style.opacity='1';e.currentTarget.style.transform='none';}}>
            {t.cta1}
          </button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section style={{
        paddingTop:120,paddingBottom:96,paddingLeft:48,paddingRight:48,
        maxWidth:1280,margin:'0 auto',position:'relative',overflow:'hidden',
      }}>
        {/* Hero background glow */}
        <div style={{ position:'absolute',inset:0,background:th.heroGlow,pointerEvents:'none',zIndex:0,transition:'background 0.6s ease' }}/>

        <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:80,alignItems:'center',position:'relative',zIndex:1 }}>
          {/* ── Left: Text ── */}
          <div className="animate-fade-in-up">
            {/* Badge */}
            <div style={{
              display:'inline-flex',alignItems:'center',gap:8,
              background:th.badgeBg,border:`1px solid ${th.badgeBorder}`,
              borderRadius:99,padding:'7px 14px',marginBottom:32,
              transition:'all 0.4s',
            }}>
              <div style={{ width:6,height:6,background:th.accent,borderRadius:'50%',animation:'pulse-dot 2s infinite' }}/>
              <span style={{ fontSize:11,fontWeight:700,color:th.badgeText,letterSpacing:'0.06em',textTransform:'uppercase' as const }}>{t.badge}</span>
            </div>

            {/* Headline — big, exclusive */}
            <h1 style={{
              fontSize:'clamp(44px,5.5vw,72px)',
              fontWeight:800,lineHeight:1.0,letterSpacing:'-0.04em',
              color:th.text,marginBottom:24,
              transition:'color 0.4s',
            }}>
              {t.h1a}{' '}
              <span className="font-display" style={{
                fontStyle:'italic',fontWeight:600,
                color:th.accent,transition:'color 0.4s',
              }}>{t.h1b}</span>{' '}
              {t.h1c}
            </h1>

            <p style={{ fontSize:18,color:th.textSub,lineHeight:1.7,marginBottom:36,maxWidth:440,transition:'color 0.4s' }}>
              {t.sub}
            </p>

            <div style={{ display:'flex',gap:12,flexWrap:'wrap' as const }}>
              <button onClick={()=>sv('customer_form')} style={{
                background:th.accent,color:th.accentText,border:'none',cursor:'pointer',
                padding:'14px 28px',borderRadius:12,fontSize:15,fontWeight:700,
                fontFamily:'inherit',boxShadow:`0 4px 20px ${th.accentGlow}`,transition:'all .18s',
              }}
              onMouseOver={e=>{e.currentTarget.style.opacity='0.88';e.currentTarget.style.transform='translateY(-2px)';}}
              onMouseOut={e=>{e.currentTarget.style.opacity='1';e.currentTarget.style.transform='none';}}>
                {t.cta1}
              </button>
              <a href="#how-it-works" style={{
                display:'flex',alignItems:'center',gap:8,
                color:th.textSub,textDecoration:'none',
                padding:'14px 24px',borderRadius:12,fontSize:15,fontWeight:500,
                border:`1px solid ${th.border}`,background:th.surface,transition:'all .15s',
              }}
              onMouseOver={e=>{(e.currentTarget as HTMLElement).style.background=th.surfaceHover;}}
              onMouseOut={e=>{(e.currentTarget as HTMLElement).style.background=th.surface;}}>
                {t.cta2}
              </a>
            </div>

            {/* Stats */}
            <div style={{ display:'flex',gap:32,marginTop:40,paddingTop:40,borderTop:`1px solid ${th.statBorder}`,transition:'border-color 0.4s' }}>
              {[{n:'2,400+',l:t.stat1l},{n:'98%',l:t.stat2l},{n:'48h',l:t.stat3l}].map(s=>(
                <div key={s.l}>
                  <div style={{ fontSize:22,fontWeight:700,color:th.text,letterSpacing:'-0.03em',transition:'color 0.4s' }}>{s.n}</div>
                  <div style={{ fontSize:12,color:th.textMuted,marginTop:2,fontWeight:500,transition:'color 0.4s' }}>{s.l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Right: Interactive Card Stack ── */}
          <div style={{ position:'relative',display:'flex',alignItems:'center',justifyContent:'center',height:460 }}>
            {/* Ambient glow */}
            <div style={{
              position:'absolute',width:320,height:320,
              background:`radial-gradient(circle, ${th.cardGlow} 0%, transparent 70%)`,
              borderRadius:'50%',filter:'blur(40px)',pointerEvents:'none',
              transition:'background 0.6s ease',
            }}/>

            {/* Back card -2 (2 positions back) */}
            {(() => {
              const idx = COLOR_ORDER.indexOf(activeColor);
              const backColor2 = COLOR_ORDER[(idx + 6) % 8];
              return (
                <div style={{
                  position:'absolute',
                  transform:'rotate(16deg) translate(80px,-30px)',
                  opacity:0.25,
                  transition:'all 0.5s ease',
                  pointerEvents:'none',
                }}>
                  <div style={{
                    width:280,height:168,borderRadius:16,overflow:'hidden',
                    boxShadow:'0 8px 32px rgba(0,0,0,0.4)',
                  }}>
                    <img src={CARDS_IMG} alt="" style={{
                      width:'200%',height:'200%',objectFit:'cover',
                      ...CARD_CROP[backColor2],
                      display:'block',
                    }}/>
                  </div>
                </div>
              );
            })()}

            {/* Back card -1 */}
            {(() => {
              const idx = COLOR_ORDER.indexOf(activeColor);
              const backColor = COLOR_ORDER[(idx + 7) % 8];
              return (
                <div style={{
                  position:'absolute',
                  transform:'rotate(-8deg) translate(-40px,30px)',
                  opacity:0.5,
                  transition:'all 0.5s ease',
                  pointerEvents:'none',
                }}>
                  <div style={{
                    width:300,height:180,borderRadius:16,overflow:'hidden',
                    boxShadow:'0 12px 40px rgba(0,0,0,0.45)',
                  }}>
                    <img src={CARDS_IMG} alt="" style={{
                      width:'200%',height:'200%',objectFit:'cover',
                      ...CARD_CROP[backColor],
                      display:'block',
                    }}/>
                  </div>
                </div>
              );
            })()}

            {/* FRONT CARD — clickable */}
            <div
              onClick={cycleColor}
              style={{
                position:'relative',zIndex:10,cursor:'pointer',
                opacity: isTransitioning ? 0.5 : 1,
                transform: isTransitioning ? 'scale(0.96)' : 'scale(1)',
                transition:'opacity 0.18s, transform 0.18s',
              }}
              className="animate-float"
            >
              {/* Glow ring */}
              <div style={{
                position:'absolute',inset:-3,borderRadius:20,
                boxShadow:`0 0 0 1.5px ${th.accent}40, 0 0 40px ${th.cardGlow}`,
                transition:'box-shadow 0.5s',
                pointerEvents:'none',
              }}/>

              {/* Card image */}
              <div style={{
                width:360,height:216,borderRadius:18,overflow:'hidden',
                boxShadow:`0 24px 60px rgba(0,0,0,0.5), 0 0 0 1px ${th.borderStrong}`,
                transition:'box-shadow 0.5s',
              }}>
                <img
                  src={CARDS_IMG}
                  alt={`${activeColor} NFC card`}
                  style={{
                    width:'200%',height:'200%',
                    objectFit:'cover',
                    display:'block',
                    ...CARD_CROP[activeColor],
                    transition:'object-position 0.4s ease',
                  }}
                />
              </div>

              {/* Tap hint */}
              <div style={{
                position:'absolute',bottom:-36,left:'50%',transform:'translateX(-50%)',
                fontSize:12,color:th.textMuted,whiteSpace:'nowrap',
                display:'flex',alignItems:'center',gap:6,
                animation:'float 4.5s ease-in-out infinite',
              }}>
                <span style={{ fontSize:14 }}>👆</span> {t.tapHint}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section style={{ padding:'96px 48px',background:th.surface,borderTop:`1px solid ${th.border}`,borderBottom:`1px solid ${th.border}`,transition:'background 0.4s,border-color 0.4s' }}>
        <div style={{ maxWidth:1280,margin:'0 auto' }}>
          <div style={{ textAlign:'center',marginBottom:56 }}>
            <p style={{ fontSize:11,fontWeight:700,letterSpacing:'0.14em',textTransform:'uppercase' as const,color:th.accent,marginBottom:12,transition:'color 0.4s' }}>
              Why ThisIsMyCard
            </p>
            <h2 style={{ fontSize:38,fontWeight:700,color:th.text,letterSpacing:'-0.03em',margin:0,transition:'color 0.4s' }}>
              Built for modern professionals
            </h2>
          </div>
          <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:20 }}>
            {[
              { icon:'⚡', title:t.feat1t, desc:t.feat1d },
              { icon:'✦',  title:t.feat2t, desc:t.feat2d },
              { icon:'◈',  title:t.feat3t, desc:t.feat3d },
            ].map((f,i)=>(
              <div key={f.title} className="animate-fade-in-up" style={{
                padding:36,borderRadius:16,border:`1px solid ${th.border}`,
                background:th.surface,cursor:'default',transition:'all .2s',
                animationDelay:`${i*80}ms`,opacity:0,
              }}
              onMouseOver={e=>{(e.currentTarget as HTMLElement).style.background=th.surfaceHover;(e.currentTarget as HTMLElement).style.borderColor=th.borderStrong;(e.currentTarget as HTMLElement).style.transform='translateY(-2px)';}}
              onMouseOut={e=>{(e.currentTarget as HTMLElement).style.background=th.surface;(e.currentTarget as HTMLElement).style.borderColor=th.border;(e.currentTarget as HTMLElement).style.transform='none';}}>
                <div style={{ fontSize:28,marginBottom:20 }}>{f.icon}</div>
                <h3 style={{ fontSize:17,fontWeight:600,color:th.text,marginBottom:10 }}>{f.title}</h3>
                <p style={{ fontSize:14,color:th.textSub,lineHeight:1.65,margin:0 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how-it-works" style={{ padding:'96px 48px',maxWidth:1280,margin:'0 auto' }}>
        <div style={{ textAlign:'center',marginBottom:56 }}>
          <p style={{ fontSize:11,fontWeight:700,letterSpacing:'0.14em',textTransform:'uppercase' as const,color:th.accent,marginBottom:12 }}>The Process</p>
          <h2 style={{ fontSize:38,fontWeight:700,color:th.text,letterSpacing:'-0.03em',margin:0 }}>{t.howTitle}</h2>
        </div>
        <div style={{ display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8,position:'relative' as const }}>
          <div style={{ position:'absolute',top:22,left:'12%',right:'12%',height:1,background:th.border,zIndex:0 }}/>
          {[
            { n:'01', t:t.step1t, d:t.step1d },
            { n:'02', t:t.step2t, d:t.step2d },
            { n:'03', t:t.step3t, d:t.step3d },
            { n:'04', t:t.step4t, d:t.step4d },
          ].map((s,i)=>(
            <div key={s.n} style={{ position:'relative' as const,zIndex:1,padding:'0 16px' }} className="animate-fade-in-up">
              <div style={{
                width:44,height:44,background:th.accent,color:th.accentText,
                borderRadius:13,display:'flex',alignItems:'center',justifyContent:'center',
                fontSize:13,fontWeight:700,marginBottom:20,
                boxShadow:`0 4px 16px ${th.accentGlow}`,transition:'background 0.4s,color 0.4s,box-shadow 0.4s',
              }}>{s.n}</div>
              <h3 style={{ fontSize:15,fontWeight:600,color:th.text,marginBottom:8 }}>{s.t}</h3>
              <p style={{ fontSize:13.5,color:th.textSub,lineHeight:1.6,margin:0 }}>{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section style={{ padding:'0 48px',marginBottom:80 }}>
        <div style={{
          maxWidth:1280,margin:'0 auto',
          background:th.surface,border:`1px solid ${th.borderStrong}`,
          borderRadius:24,padding:'72px 80px',
          position:'relative',overflow:'hidden',
          transition:'background 0.4s,border-color 0.4s',
        }}>
          <div style={{ position:'absolute',top:-60,right:120,width:300,height:300,background:`radial-gradient(circle,${th.cardGlow} 0%,transparent 65%)`,borderRadius:'50%',pointerEvents:'none',transition:'background 0.6s' }}/>
          <div style={{ position:'relative' as const,textAlign:'center' }}>
            <h2 style={{ fontSize:40,fontWeight:700,color:th.text,letterSpacing:'-0.035em',marginBottom:16,transition:'color 0.4s' }}>
              {t.ctaBannerT}{' '}<span style={{ color:th.accent,transition:'color 0.4s' }}>{t.ctaBannerS.split('.')[0]}.</span>
            </h2>
            <p style={{ fontSize:16,color:th.textSub,marginBottom:36,maxWidth:440,margin:'0 auto 36px',transition:'color 0.4s' }}>
              {t.ctaBannerS}
            </p>
            <button onClick={()=>sv('customer_form')} style={{
              background:th.accent,color:th.accentText,border:'none',cursor:'pointer',
              padding:'15px 36px',borderRadius:12,fontSize:15,fontWeight:700,
              fontFamily:'inherit',boxShadow:`0 4px 20px ${th.accentGlow}`,transition:'all .18s',
            }}
            onMouseOver={e=>{e.currentTarget.style.opacity='0.88';e.currentTarget.style.transform='translateY(-2px)';}}
            onMouseOut={e=>{e.currentTarget.style.opacity='1';e.currentTarget.style.transform='none';}}>
              {t.ctaBannerBtn}
            </button>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ padding:'28px 48px',borderTop:`1px solid ${th.border}`,display:'flex',alignItems:'center',justifyContent:'space-between',transition:'border-color 0.4s' }}>
        <div style={{ display:'flex',alignItems:'center',gap:8 }}>
          <div style={{ width:24,height:24,background:th.accent,borderRadius:7,display:'flex',alignItems:'center',justifyContent:'center',transition:'background 0.4s' }}>
            <span style={{ color:th.accentText,fontSize:10,fontWeight:800 }}>N</span>
          </div>
          <span style={{ fontSize:14,fontWeight:600,color:th.textSub }}>ThisIsMyCard</span>
        </div>
        <p style={{ fontSize:13,color:th.textMuted,margin:0 }}>© 2024 ThisIsMyCard. All rights reserved.</p>
        <button onClick={()=>{ window.location.href='/admin'; }} style={{ fontSize:12,color:th.textMuted,background:'none',border:'none',cursor:'pointer',fontFamily:'inherit',transition:'color 0.2s' }}
          onMouseOver={e=>e.currentTarget.style.color=th.text} onMouseOut={e=>e.currentTarget.style.color=th.textMuted}>
          Admin Portal →
        </button>
      </footer>
    </div>
  );
}


/* ══════════════════════════════════════════════════════
   CUSTOMER FORM
══════════════════════════════════════════════════════ */
function CForm({ sv, setSid }: { sv:(v:AppView)=>void; setSid:(id:string)=>void }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FD>(empty);
  const [errors, setErrors] = useState<Partial<Record<keyof FD,string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const upd = (n:keyof FD, v:string) => { setForm(f=>({...f,[n]:v})); if(errors[n]) setErrors(e=>({...e,[n]:''})); };

  const val = () => {
    const e: Partial<Record<keyof FD,string>> = {};
    if(step===1){
      if(!form.fullName.trim()) e.fullName='Required';
      if(!form.jobTitle.trim()) e.jobTitle='Required';
      if(!form.companyName.trim()) e.companyName='Required';
      if(!form.phone.trim()) e.phone='Required';
      if(!form.email.trim()) e.email='Required';
      else if(!/\S+@\S+\.\S+/.test(form.email)) e.email='Enter a valid email';
      if(!form.whatsapp.trim()) e.whatsapp='Required';
    }
    if(step===4){
      if(!form.orderNumber.trim()) e.orderNumber='Required';
      if(!form.purchaseDate) e.purchaseDate='Required';
      if(!form.quantityOrdered||Number(form.quantityOrdered)<1) e.quantityOrdered='Min 1';
    }
    setErrors(e);
    return Object.keys(e).length===0;
  };

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f=e.target.files?.[0]; if(!f) return;
    const r=new FileReader();
    r.onload=()=>{ upd('profilePhotoB64', r.result as string); upd('profilePhotoName', f.name); };
    r.readAsDataURL(f);
  };

  const handleSub = async () => {
    if(!val()) return;
    setSubmitting(true);
    try {
      const res = await submitOrder({
        full_name:form.fullName, job_title:form.jobTitle, company_name:form.companyName,
        phone:form.phone, email:form.email, website:form.website||null, facebook:form.facebook||null,
        instagram:form.instagram||null, linkedin:form.linkedin||null, whatsapp:form.whatsapp,
        profile_photo_url:null, profile_photo_name:form.profilePhotoName||null,
        card_color:form.cardColor, order_number:form.orderNumber,
        purchase_date:form.purchaseDate, quantity_ordered:Number(form.quantityOrdered),
        additional_notes:form.additionalNotes||null,
      });
      if(res.success&&res.id){ setSid(res.id); sv('success'); }
      else alert(res.error||'Submission failed. Please try again.');
    } finally { setSubmitting(false); }
  };

  const STEPS = [{n:1,l:'Your Details'},{n:2,l:'Social Links'},{n:3,l:'Card Design'},{n:4,l:'Order Info'}];

  const cardBg = { background:'#fff', border:'1px solid #f0f0f0', borderRadius:20, padding:40, boxShadow:'0 2px 24px rgba(0,0,0,0.05)' };

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 48px',height:64,background:'#fff',borderBottom:'1px solid #f0f0f0' }}>
        <button onClick={()=>sv('landing')} style={{ display:'flex',alignItems:'center',gap:8,fontSize:14,color:'#6b7280',background:'none',border:'none',cursor:'pointer',fontFamily:'inherit',fontWeight:500 }}
          onMouseOver={e=>e.currentTarget.style.color='#111'} onMouseOut={e=>e.currentTarget.style.color='#6b7280'}>
          ← <span>ThisIsMyCard</span>
        </button>
        <span style={{ fontSize:13,color:'#9ca3af',fontWeight:500 }}>Card Setup</span>
        <div style={{ width:80 }}/>
      </div>

      <div style={{ maxWidth:960,margin:'0 auto',padding:'48px 24px' }}>
        {/* Step bar */}
        <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:40 }}>
          {STEPS.map((s,i)=>(
            <React.Fragment key={s.n}>
              <div style={{ display:'flex',alignItems:'center',gap:10 }}>
                <div style={{
                  width:34,height:34,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',
                  fontSize:13,fontWeight:700,flexShrink:0,transition:'all .2s',
                  background: step===s.n?'#00D4FF': step>s.n?'#0F0F0F':'#e5e7eb',
                  color: step===s.n?'#0F0F0F': step>s.n?'#fff':'#9ca3af',
                }}>
                  {step>s.n?'✓':s.n}
                </div>
                <span style={{ fontSize:14,fontWeight:step===s.n?600:400,color:step===s.n?'#0F0F0F':'#9ca3af',whiteSpace:'nowrap' }}>
                  {s.l}
                </span>
              </div>
              {i<STEPS.length-1 && <div style={{ flex:1,height:1,background:step>s.n?'#0F0F0F':'#e5e7eb',transition:'background .3s' }}/>}
            </React.Fragment>
          ))}
        </div>

        <div style={{ display:'grid',gridTemplateColumns:'1fr 300px',gap:24 }}>
          {/* Form card */}
          <div style={cardBg}>
            {step===1 && (
              <div style={{ display:'flex',flexDirection:'column',gap:20 }}>
                <div style={{ marginBottom:8 }}>
                  <h2 style={{ fontSize:24,fontWeight:600,color:'#0F0F0F',margin:'0 0 6px',letterSpacing:'-0.03em' }}>Your Details</h2>
                  <p style={{ fontSize:14,color:'#6b7280',margin:0 }}>This information will appear on your digital card.</p>
                </div>
                {/* Photo upload */}
                <div>
                  <label style={{ display:'block',fontSize:13,fontWeight:500,color:'#374151',marginBottom:8 }}>Profile Photo</label>
                  <div onClick={()=>fileRef.current?.click()} style={{
                    display:'flex',alignItems:'center',gap:16,padding:16,
                    border:'2px dashed #e5e7eb',borderRadius:12,cursor:'pointer',transition:'all .15s',
                  }}
                  onMouseOver={e=>{(e.currentTarget as HTMLElement).style.borderColor='#00D4FF';(e.currentTarget as HTMLElement).style.background='rgba(0,212,255,0.03)';}}
                  onMouseOut={e=>{(e.currentTarget as HTMLElement).style.borderColor='#e5e7eb';(e.currentTarget as HTMLElement).style.background='transparent';}}>
                    {form.profilePhotoB64
                      ? <img src={form.profilePhotoB64} alt="" style={{ width:56,height:56,borderRadius:'50%',objectFit:'cover',border:'2px solid rgba(0,212,255,0.3)' }}/>
                      : <div style={{ width:56,height:56,background:'#f3f4f6',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:24 }}>👤</div>
                    }
                    <div>
                      <p style={{ fontSize:14,fontWeight:500,color:'#374151',margin:'0 0 2px' }}>{form.profilePhotoName||'Upload profile photo'}</p>
                      <p style={{ fontSize:12,color:'#9ca3af',margin:0 }}>JPG, PNG — max 5MB</p>
                    </div>
                    <input ref={fileRef} type="file" accept="image/*" style={{ display:'none' }} onChange={handlePhoto}/>
                  </div>
                </div>
                <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:16 }}>
                  <FInput label="Full Name" name="fullName" placeholder="Ahmad Razif Ismail" required form={form} onChange={upd} error={errors.fullName}/>
                  <FInput label="Job Title" name="jobTitle" placeholder="Chief Executive Officer" required form={form} onChange={upd} error={errors.jobTitle}/>
                </div>
                <FInput label="Company Name" name="companyName" placeholder="Nexus Ventures Sdn Bhd" required form={form} onChange={upd} error={errors.companyName}/>
                <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:16 }}>
                  <FInput label="Phone Number" name="phone" type="tel" placeholder="+60123456789" required form={form} onChange={upd} error={errors.phone}/>
                  <FInput label="WhatsApp Number" name="whatsapp" type="tel" placeholder="+60123456789" required form={form} onChange={upd} error={errors.whatsapp}/>
                </div>
                <FInput label="Email Address" name="email" type="email" placeholder="you@company.com" required form={form} onChange={upd} error={errors.email}/>
              </div>
            )}

            {step===2 && (
              <div style={{ display:'flex',flexDirection:'column',gap:20 }}>
                <div style={{ marginBottom:8 }}>
                  <h2 style={{ fontSize:24,fontWeight:600,color:'#0F0F0F',margin:'0 0 6px',letterSpacing:'-0.03em' }}>Social & Web Links</h2>
                  <p style={{ fontSize:14,color:'#6b7280',margin:0 }}>All optional — add what matters to you.</p>
                </div>
                <FInput label="Website" name="website" type="url" placeholder="https://yourwebsite.com" prefix="🌐" form={form} onChange={upd}/>
                <FInput label="LinkedIn" name="linkedin" type="url" placeholder="https://linkedin.com/in/you" prefix="in" form={form} onChange={upd}/>
                <FInput label="Instagram" name="instagram" type="url" placeholder="https://instagram.com/handle" prefix="@" form={form} onChange={upd}/>
                <FInput label="Facebook" name="facebook" type="url" placeholder="https://facebook.com/profile" prefix="fb" form={form} onChange={upd}/>
              </div>
            )}

            {step===3 && (
              <div>
                <div style={{ marginBottom:24 }}>
                  <h2 style={{ fontSize:24,fontWeight:600,color:'#0F0F0F',margin:'0 0 6px',letterSpacing:'-0.03em' }}>Choose Card Color</h2>
                  <p style={{ fontSize:14,color:'#6b7280',margin:0 }}>Pick the finish for your physical NFC card.</p>
                </div>
                <div style={{ display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:36 }}>
                  {CARD_COLORS.map(c=>(
                    <button key={c.value} onClick={()=>upd('cardColor',c.value)} style={{
                      display:'flex',flexDirection:'column',alignItems:'center',gap:8,
                      padding:12,borderRadius:12,cursor:'pointer',fontFamily:'inherit',
                      border: form.cardColor===c.value?'2px solid #00D4FF':'2px solid #f0f0f0',
                      background: form.cardColor===c.value?'rgba(0,212,255,0.05)':'#fafafa',
                      transition:'all .15s',
                    }}
                    onMouseOver={e=>{ if(form.cardColor!==c.value) (e.currentTarget as HTMLElement).style.borderColor='#d1d5db'; }}
                    onMouseOut={e=>{ if(form.cardColor!==c.value) (e.currentTarget as HTMLElement).style.borderColor='#f0f0f0'; }}>
                      <div style={{ width:40,height:40,borderRadius:10,background:c.hex,boxShadow:'0 2px 8px rgba(0,0,0,0.15)',flexShrink:0 }}/>
                      <span style={{ fontSize:12,fontWeight:500,color:'#374151' }}>{c.label}</span>
                    </button>
                  ))}
                </div>
                <div style={{ display:'flex',justifyContent:'center',flexDirection:'column',alignItems:'center',gap:12 }}>
                  <p style={{ fontSize:11,fontWeight:600,letterSpacing:'0.1em',textTransform:'uppercase',color:'#9ca3af',margin:0 }}>Live Preview</p>
                  <NFCCardVisual color={form.cardColor} name={form.fullName||'Your Name'} title={form.jobTitle||'Job Title'} company={form.companyName||'Company'} size="md" animated/>
                </div>
              </div>
            )}

            {step===4 && (
              <div style={{ display:'flex',flexDirection:'column',gap:20 }}>
                <div style={{ marginBottom:8 }}>
                  <h2 style={{ fontSize:24,fontWeight:600,color:'#0F0F0F',margin:'0 0 6px',letterSpacing:'-0.03em' }}>Order Details</h2>
                  <p style={{ fontSize:14,color:'#6b7280',margin:0 }}>Help us match your setup to your purchase.</p>
                </div>
                <FInput label="Order Number" name="orderNumber" placeholder="TIMC-2024-XXX" required form={form} onChange={upd} error={errors.orderNumber}/>
                <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:16 }}>
                  <FInput label="Purchase Date" name="purchaseDate" type="date" required form={form} onChange={upd} error={errors.purchaseDate}/>
                  <FInput label="Quantity Ordered" name="quantityOrdered" type="number" placeholder="1" required form={form} onChange={upd} error={errors.quantityOrdered}/>
                </div>
                <div>
                  <label style={{ display:'block',fontSize:13,fontWeight:500,color:'#374151',marginBottom:8 }}>Additional Notes</label>
                  <textarea value={form.additionalNotes} onChange={e=>upd('additionalNotes',e.target.value)}
                    placeholder="Any special requests or instructions..."
                    rows={3}
                    style={{ width:'100%',padding:'11px 14px',fontSize:14,border:'1px solid #e5e7eb',borderRadius:10,outline:'none',resize:'none',fontFamily:'inherit',color:'#111827',background:'#fff',boxSizing:'border-box' }}
                    onFocus={e=>{e.currentTarget.style.borderColor='#00D4FF';e.currentTarget.style.boxShadow='0 0 0 3px rgba(0,212,255,0.12)';}}
                    onBlur={e=>{e.currentTarget.style.borderColor='#e5e7eb';e.currentTarget.style.boxShadow='none';}}
                  />
                </div>
                {/* Summary */}
                <div style={{ background:'#f9fafb',borderRadius:12,padding:20,border:'1px solid #f0f0f0' }}>
                  <p style={{ fontSize:11,fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',color:'#9ca3af',margin:'0 0 16px' }}>Summary</p>
                  <div style={{ display:'flex',flexDirection:'column',gap:10 }}>
                    {[['Name',form.fullName],['Title',form.jobTitle],['Company',form.companyName],['Email',form.email],['Card Color',CARD_COLORS.find(c=>c.value===form.cardColor)?.label]].map(([k,v])=>v&&(
                      <div key={k} style={{ display:'flex',justifyContent:'space-between',fontSize:14 }}>
                        <span style={{ color:'#6b7280' }}>{k}</span>
                        <span style={{ color:'#111827',fontWeight:500 }}>{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div style={{ display:'flex',justifyContent:'space-between',marginTop:32,paddingTop:24,borderTop:'1px solid #f0f0f0' }}>
              <button onClick={()=>step>1?setStep(s=>s-1):sv('landing')} style={{
                fontSize:14,fontWeight:500,color:'#6b7280',background:'none',border:'none',
                cursor:'pointer',fontFamily:'inherit',padding:'10px 16px',borderRadius:8,
              }}
              onMouseOver={e=>{e.currentTarget.style.background='#f3f4f6';e.currentTarget.style.color='#111';}}
              onMouseOut={e=>{e.currentTarget.style.background='none';e.currentTarget.style.color='#6b7280';}}>
                ← {step===1?'Back to Home':'Previous'}
              </button>
              {step<4
                ? <button onClick={()=>val()&&setStep(s=>s+1)} style={{
                    background:'#0F0F0F',color:'#fff',border:'none',cursor:'pointer',
                    padding:'11px 24px',borderRadius:10,fontSize:14,fontWeight:600,fontFamily:'inherit',
                    boxShadow:'0 2px 8px rgba(0,0,0,0.15)',transition:'all .15s',
                  }}
                  onMouseOver={e=>e.currentTarget.style.background='#1f2937'}
                  onMouseOut={e=>e.currentTarget.style.background='#0F0F0F'}>
                    Continue →
                  </button>
                : <button onClick={handleSub} disabled={submitting} style={{
                    background:'#00D4FF',color:'#0F0F0F',border:'none',cursor:'pointer',
                    padding:'11px 24px',borderRadius:10,fontSize:14,fontWeight:700,fontFamily:'inherit',
                    boxShadow:'0 4px 16px rgba(0,212,255,0.3)',transition:'all .15s',opacity:submitting?0.6:1,
                  }}
                  onMouseOver={e=>{ if(!submitting){ e.currentTarget.style.background='#22e5ff'; e.currentTarget.style.transform='translateY(-1px)'; }}}
                  onMouseOut={e=>{e.currentTarget.style.background='#00D4FF';e.currentTarget.style.transform='none';}}>
                    {submitting?'Submitting...':'Submit Setup ✓'}
                  </button>
              }
            </div>
          </div>

          {/* Sidebar */}
          <div style={{ display:'flex',flexDirection:'column',gap:16 }}>
            <div style={{ ...cardBg, padding:24 }}>
              <p style={{ fontSize:11,fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',color:'#9ca3af',margin:'0 0 16px' }}>Card Preview</p>
              <NFCCardVisual color={form.cardColor} name={form.fullName||'Your Name'} title={form.jobTitle||'Job Title'} company={form.companyName||'Company'} size="sm" animated/>
            </div>
            <div style={{ background:'#0F0F0F',borderRadius:20,padding:24 }}>
              <p style={{ fontSize:11,fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',color:'rgba(255,255,255,0.3)',margin:'0 0 20px' }}>Progress</p>
              <div style={{ display:'flex',flexDirection:'column',gap:14 }}>
                {STEPS.map(s=>(
                  <div key={s.n} style={{ display:'flex',alignItems:'center',gap:12 }}>
                    <div style={{
                      width:22,height:22,borderRadius:'50%',flexShrink:0,
                      display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,
                      background: step===s.n?'#00D4FF': step>s.n?'#22c55e':'rgba(255,255,255,0.08)',
                      color: step===s.n?'#0F0F0F': step>s.n?'#0F0F0F':'rgba(255,255,255,0.3)',
                      transition:'all .2s',
                    }}>
                      {step>s.n?'✓':s.n}
                    </div>
                    <span style={{ fontSize:13,fontWeight: step===s.n?600:400, color: step===s.n?'#fff': step>s.n?'rgba(255,255,255,0.6)':'rgba(255,255,255,0.3)' }}>
                      {s.l}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   SUCCESS PAGE
══════════════════════════════════════════════════════ */
function Success({ sv }: { sv:(v:AppView)=>void }) {
  const [show, setShow] = useState(false);
  useEffect(()=>{ setTimeout(()=>setShow(true),80); },[]);
  return (
    <div style={{ ...S.page, display:'flex',alignItems:'center',justifyContent:'center',padding:24 }}>
      <div style={{
        maxWidth:520,width:'100%',textAlign:'center',
        opacity: show?1:0, transform: show?'translateY(0)':'translateY(20px)',
        transition:'all .6s cubic-bezier(.16,1,.3,1)',
      }}>
        <div style={{ position:'relative',width:80,height:80,margin:'0 auto 32px' }}>
          <div style={{ width:80,height:80,background:'#0F0F0F',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center' }}>
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none"><path d="M6 16L12 22L26 10" stroke="#00D4FF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <div style={{ position:'absolute',inset:-4,borderRadius:'50%',border:'1px solid rgba(0,212,255,0.3)',animation:'pulse-glow 2.2s ease-in-out infinite' }}/>
        </div>
        <h1 style={{ fontSize:34,fontWeight:600,color:'#0F0F0F',margin:'0 0 14px',letterSpacing:'-0.035em' }}>You&apos;re all set!</h1>
        <p style={{ fontSize:16,color:'#6b7280',lineHeight:1.7,marginBottom:36 }}>
          Thank you. Your card setup request has been received and is being processed. Our team will reach out within 48 hours.
        </p>
        <div style={{ background:'#0F0F0F',borderRadius:20,padding:28,textAlign:'left',marginBottom:28 }}>
          <p style={{ fontSize:11,fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',color:'rgba(255,255,255,0.3)',margin:'0 0 20px' }}>What happens next</p>
          {['Our team verifies your submission','Your card goes into production','We program your NFC chip','Your card ships to you'].map((t,i)=>(
            <div key={t} style={{ display:'flex',alignItems:'center',gap:12,marginBottom: i<3?14:0 }}>
              <div style={{ width:28,height:28,borderRadius:8,background:'rgba(255,255,255,0.06)',color:'rgba(255,255,255,0.4)',fontSize:11,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>0{i+1}</div>
              <p style={{ fontSize:14,color:'rgba(255,255,255,0.7)',margin:0 }}>{t}</p>
            </div>
          ))}
        </div>
        <button onClick={()=>sv('landing')} style={{
          background:'#0F0F0F',color:'#fff',border:'none',cursor:'pointer',
          padding:'13px 32px',borderRadius:11,fontSize:14,fontWeight:600,fontFamily:'inherit',
          boxShadow:'0 4px 16px rgba(0,0,0,0.15)',
        }}>
          Back to Home
        </button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   ADMIN LOGIN
══════════════════════════════════════════════════════ */
function ALogin({ sv, setAL }: { sv:(v:AppView)=>void; setAL:(v:boolean)=>void }) {
  const [email,setEmail]=useState('');const[pass,setPass]=useState('');const[show,setShow]=useState(false);const[err,setErr]=useState('');const[loading,setLoading]=useState(false);
  const go=async()=>{if(!email||!pass)return;setLoading(true);setErr('');const r=await adminLogin(email,pass);if(r.success){setAL(true);sv('admin_dashboard');}else{setErr(r.error||'Login failed');}setLoading(false);};
  return(
    <div style={S.pageDark}>
      <div style={{ minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',padding:24 }}>
        <div style={{ width:'100%',maxWidth:400 }}>
          <div style={{ display:'flex',alignItems:'center',gap:10,marginBottom:48 }}>
            <div style={{ width:36,height:36,background:'#00D4FF',borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 4px 16px rgba(0,212,255,0.4)' }}>
              <span style={{ color:'#0F0F0F',fontSize:14,fontWeight:700 }}>N</span>
            </div>
            <span style={{ color:'#fff',fontWeight:600,fontSize:16 }}>ThisIsMyCard</span>
            <span style={{ color:'rgba(255,255,255,0.25)',fontSize:12,fontWeight:500,marginLeft:2 }}>Admin</span>
          </div>
          <h1 style={{ fontSize:28,fontWeight:600,color:'#fff',margin:'0 0 8px',letterSpacing:'-0.03em' }}>Welcome back</h1>
          <p style={{ fontSize:14,color:'rgba(255,255,255,0.4)',margin:'0 0 36px' }}>Sign in to access your admin dashboard.</p>
          <div style={{ display:'flex',flexDirection:'column',gap:16 }}>
            <div>
              <label style={{ display:'block',fontSize:13,fontWeight:500,color:'rgba(255,255,255,0.5)',marginBottom:8 }}>Email</label>
              <input type="email" value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==='Enter'&&go()} placeholder="admin@thisismycard.io"
                style={{ width:'100%',background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',color:'#fff',fontSize:14,padding:'12px 16px',borderRadius:10,outline:'none',fontFamily:'inherit',boxSizing:'border-box' }}
                onFocus={e=>{e.currentTarget.style.borderColor='rgba(0,212,255,0.5)';e.currentTarget.style.boxShadow='0 0 0 3px rgba(0,212,255,0.1)';}}
                onBlur={e=>{e.currentTarget.style.borderColor='rgba(255,255,255,0.1)';e.currentTarget.style.boxShadow='none';}}/>
            </div>
            <div>
              <label style={{ display:'block',fontSize:13,fontWeight:500,color:'rgba(255,255,255,0.5)',marginBottom:8 }}>Password</label>
              <div style={{ position:'relative' }}>
                <input type={show?'text':'password'} value={pass} onChange={e=>setPass(e.target.value)} onKeyDown={e=>e.key==='Enter'&&go()} placeholder="••••••••"
                  style={{ width:'100%',background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',color:'#fff',fontSize:14,padding:'12px 48px 12px 16px',borderRadius:10,outline:'none',fontFamily:'inherit',boxSizing:'border-box' }}
                  onFocus={e=>{e.currentTarget.style.borderColor='rgba(0,212,255,0.5)';e.currentTarget.style.boxShadow='0 0 0 3px rgba(0,212,255,0.1)';}}
                  onBlur={e=>{e.currentTarget.style.borderColor='rgba(255,255,255,0.1)';e.currentTarget.style.boxShadow='none';}}/>
                <button type="button" onClick={()=>setShow(!show)} style={{ position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',color:'rgba(255,255,255,0.35)',fontSize:12,fontFamily:'inherit' }}>{show?'Hide':'Show'}</button>
              </div>
            </div>
            {err&&<div style={{ background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.2)',color:'#fca5a5',fontSize:13,padding:'12px 16px',borderRadius:10 }}>{err}</div>}
            <button onClick={go} disabled={loading} style={{
              background:'#00D4FF',color:'#0F0F0F',border:'none',cursor:'pointer',
              padding:'14px',borderRadius:11,fontSize:15,fontWeight:700,fontFamily:'inherit',marginTop:4,
              boxShadow:'0 4px 20px rgba(0,212,255,0.35)',transition:'all .15s',opacity:loading?.7:1,
            }}
            onMouseOver={e=>{ if(!loading){ e.currentTarget.style.background='#22e5ff'; e.currentTarget.style.transform='translateY(-1px)'; }}}
            onMouseOut={e=>{e.currentTarget.style.background='#00D4FF';e.currentTarget.style.transform='none';}}>
              {loading?'Signing in...':'Sign In →'}
            </button>
          </div>
          <button onClick={()=>sv('landing')} style={{ width:'100%',marginTop:24,fontSize:13,color:'rgba(255,255,255,0.25)',background:'none',border:'none',cursor:'pointer',fontFamily:'inherit',textAlign:'center' }}
            onMouseOver={e=>e.currentTarget.style.color='rgba(255,255,255,0.5)'} onMouseOut={e=>e.currentTarget.style.color='rgba(255,255,255,0.25)'}>
            ← Back to customer portal
          </button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   ADMIN DASHBOARD
══════════════════════════════════════════════════════ */
function ADash({ sv, setAL }: { sv:(v:AppView)=>void; setAL:(v:boolean)=>void }) {
  const[tab,setTab]=useState<'overview'|'orders'>('overview');
  const[orders,setOrders]=useState<Order[]>([]);
  const[loading,setLoading]=useState(true);
  const[search,setSearch]=useState('');
  const[sf,setSf]=useState<OrderStatus|'all'>('all');
  const[sel,setSel]=useState<Order|null>(null);

  const load=useCallback(async()=>{setLoading(true);const r=await getAllOrders();if(r.orders)setOrders(r.orders);setLoading(false);},[]);
  useEffect(()=>{load();},[load]);

  const chSt=async(id:string,st:OrderStatus)=>{await updateOrderStatus(id,st);setOrders(p=>p.map(o=>o.id===id?{...o,status:st}:o));if(sel?.id===id)setSel(p=>p?{...p,status:st}:null);};

  const filt=orders.filter(o=>{
    const q=search.toLowerCase();
    return(!q||o.full_name.toLowerCase().includes(q)||o.company_name.toLowerCase().includes(q)||o.order_number.toLowerCase().includes(q)||o.email.toLowerCase().includes(q))&&(sf==='all'||o.status===sf);
  });

  const st={total:orders.length,new:orders.filter(o=>o.status==='new').length,pend:orders.filter(o=>o.status==='pending_verification').length,prod:orders.filter(o=>o.status==='in_production').length,ship:orders.filter(o=>o.status==='shipped').length,done:orders.filter(o=>o.status==='completed').length};

  const STAT_CARDS = [
    {l:'Total Orders',v:st.total,bg:'#0F0F0F',tc:'#fff',sc:'rgba(255,255,255,0.4)',dot:'#00D4FF'},
    {l:'New',v:st.new,bg:'#eff6ff',tc:'#1e40af',sc:'#93c5fd',dot:'#3b82f6'},
    {l:'Pending',v:st.pend,bg:'#fefce8',tc:'#a16207',sc:'#fcd34d',dot:'#eab308'},
    {l:'In Production',v:st.prod,bg:'#fff7ed',tc:'#9a3412',sc:'#fdba74',dot:'#f97316'},
    {l:'Shipped',v:st.ship,bg:'#eef2ff',tc:'#3730a3',sc:'#a5b4fc',dot:'#6366f1'},
    {l:'Completed',v:st.done,bg:'#f0fdf4',tc:'#15803d',sc:'#86efac',dot:'#22c55e'},
  ];

  return(
    <div style={{ fontFamily:"'DM Sans',system-ui,sans-serif",background:'#f8f8f7',minHeight:'100vh' }}>
      {/* Header */}
      <header style={{ background:'#fff',borderBottom:'1px solid #f0f0f0',display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 32px',height:56 }}>
        <div style={{ display:'flex',alignItems:'center',gap:10 }}>
          <div style={{ width:28,height:28,background:'#0F0F0F',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center' }}>
            <span style={{ color:'#00D4FF',fontSize:11,fontWeight:700 }}>N</span>
          </div>
          <span style={{ fontWeight:600,fontSize:15,color:'#0F0F0F',letterSpacing:'-0.02em' }}>ThisIsMyCard</span>
          <span style={{ color:'#d1d5db',fontSize:16,margin:'0 2px' }}>·</span>
          <span style={{ fontSize:13,color:'#9ca3af',fontWeight:500 }}>Admin</span>
        </div>
        <div style={{ display:'flex',alignItems:'center',gap:12 }}>
          <div style={{ width:8,height:8,background:'#22c55e',borderRadius:'50%' }}/>
          <button onClick={()=>{setAL(false);sv('landing');}} style={{
            fontSize:13,color:'#6b7280',background:'#f3f4f6',border:'none',cursor:'pointer',
            padding:'7px 14px',borderRadius:8,fontFamily:'inherit',fontWeight:500,
          }}
          onMouseOver={e=>e.currentTarget.style.background='#e5e7eb'} onMouseOut={e=>e.currentTarget.style.background='#f3f4f6'}>
            Sign out
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div style={{ background:'#fff',borderBottom:'1px solid #f0f0f0',padding:'0 32px' }}>
        <div style={{ display:'flex',gap:0 }}>
          {[{k:'overview',l:'Overview'},{k:'orders',l:`Orders (${orders.length})`}].map(t=>(
            <button key={t.k} onClick={()=>setTab(t.k as 'overview'|'orders')} style={{
              padding:'14px 20px',fontSize:14,fontWeight:500,border:'none',background:'none',
              cursor:'pointer',fontFamily:'inherit',
              color:tab===t.k?'#0F0F0F':'#9ca3af',
              borderBottom:tab===t.k?'2px solid #0F0F0F':'2px solid transparent',
              transition:'all .15s',marginBottom:-1,
            }}>
              {t.l}
            </button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth:1280,margin:'0 auto',padding:'32px 32px' }}>
        {loading ? (
          <div style={{ display:'flex',alignItems:'center',justifyContent:'center',height:240 }}>
            <div style={{ width:32,height:32,border:'2px solid #e5e7eb',borderTopColor:'#00D4FF',borderRadius:'50%',animation:'spin-slow 0.8s linear infinite' }}/>
          </div>
        ) : (
          <>
            {/* Overview */}
            {tab==='overview' && (
              <div style={{ display:'flex',flexDirection:'column',gap:32 }}>
                <div>
                  <h1 style={{ fontSize:26,fontWeight:600,color:'#0F0F0F',margin:'0 0 4px',letterSpacing:'-0.03em' }}>Dashboard</h1>
                  <p style={{ fontSize:14,color:'#6b7280',margin:0 }}>Monitor all card orders and setup requests.</p>
                </div>
                <div style={{ display:'grid',gridTemplateColumns:'repeat(6,1fr)',gap:14 }}>
                  {STAT_CARDS.map(s=>(
                    <div key={s.l} style={{ background:s.bg,borderRadius:16,padding:'20px 20px',boxShadow:'0 1px 3px rgba(0,0,0,.04)' }}>
                      <div style={{ fontSize:32,fontWeight:700,color:s.tc,letterSpacing:'-0.04em' }}>{s.v}</div>
                      <div style={{ display:'flex',alignItems:'center',gap:6,marginTop:4 }}>
                        <div style={{ width:6,height:6,borderRadius:'50%',background:s.dot,flexShrink:0 }}/>
                        <div style={{ fontSize:12,fontWeight:500,color:s.sc }}>{s.l}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ background:'#fff',borderRadius:20,border:'1px solid #f0f0f0',boxShadow:'0 1px 4px rgba(0,0,0,0.04)',overflow:'hidden' }}>
                  <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'20px 24px',borderBottom:'1px solid #f8f8f8' }}>
                    <h3 style={{ fontSize:16,fontWeight:600,color:'#0F0F0F',margin:0 }}>Recent Submissions</h3>
                    <button onClick={()=>setTab('orders')} style={{ fontSize:13,color:'#00D4FF',background:'none',border:'none',cursor:'pointer',fontFamily:'inherit',fontWeight:600 }}>View all →</button>
                  </div>
                  {orders.slice(0,6).map((o,i)=>(
                    <div key={o.id} onClick={()=>setSel(o)} style={{
                      display:'flex',alignItems:'center',gap:14,padding:'14px 24px',cursor:'pointer',
                      borderBottom: i<5?'1px solid #fafafa':'none',transition:'background .1s',
                    }}
                    onMouseOver={e=>(e.currentTarget as HTMLElement).style.background='#fafafa'}
                    onMouseOut={e=>(e.currentTarget as HTMLElement).style.background='transparent'}>
                      <div style={{ width:36,height:36,background:'#f3f4f6',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:600,color:'#6b7280',fontSize:14,flexShrink:0 }}>{o.full_name.charAt(0)}</div>
                      <div style={{ flex:1,minWidth:0 }}>
                        <p style={{ fontSize:14,fontWeight:500,color:'#111827',margin:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{o.full_name}</p>
                        <p style={{ fontSize:12,color:'#9ca3af',margin:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{o.company_name}</p>
                      </div>
                      <span style={{ fontSize:12,color:'#9ca3af' }}>{o.order_number}</span>
                      <StatusBadge status={o.status} size="sm"/>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Orders */}
            {tab==='orders' && (
              <div style={{ display:'flex',flexDirection:'column',gap:24 }}>
                <div>
                  <h1 style={{ fontSize:26,fontWeight:600,color:'#0F0F0F',margin:'0 0 4px',letterSpacing:'-0.03em' }}>All Orders</h1>
                  <p style={{ fontSize:14,color:'#6b7280',margin:0 }}>{filt.length} result{filt.length!==1?'s':''}</p>
                </div>
                <div style={{ display:'flex',gap:12 }}>
                  <div style={{ position:'relative',flex:1,maxWidth:400 }}>
                    <svg style={{ position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'#9ca3af' }} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                    <input type="search" placeholder="Search name, company, order…" value={search} onChange={e=>setSearch(e.target.value)}
                      style={{ width:'100%',paddingLeft:36,paddingRight:16,paddingTop:10,paddingBottom:10,fontSize:14,background:'#fff',border:'1px solid #e5e7eb',borderRadius:10,outline:'none',fontFamily:'inherit',boxSizing:'border-box' }}
                      onFocus={e=>{e.currentTarget.style.borderColor='#00D4FF';e.currentTarget.style.boxShadow='0 0 0 3px rgba(0,212,255,0.12)';}}
                      onBlur={e=>{e.currentTarget.style.borderColor='#e5e7eb';e.currentTarget.style.boxShadow='none';}}/>
                  </div>
                  <select value={sf} onChange={e=>setSf(e.target.value as OrderStatus|'all')} style={{ fontSize:14,background:'#fff',border:'1px solid #e5e7eb',borderRadius:10,padding:'10px 14px',outline:'none',fontFamily:'inherit',color:'#374151',cursor:'pointer' }}>
                    <option value="all">All Statuses</option>
                    {STATUS_OPTIONS.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div style={{ background:'#fff',borderRadius:20,border:'1px solid #f0f0f0',boxShadow:'0 1px 4px rgba(0,0,0,0.04)',overflow:'hidden' }}>
                  {/* Table header */}
                  <div style={{ display:'grid',gridTemplateColumns:'44px 1fr 160px 140px 180px',gap:16,padding:'12px 24px',background:'#f8f8f7',borderBottom:'1px solid #f0f0f0' }}>
                    {['','Customer','Order','Date','Status'].map(h=>(
                      <div key={h} style={{ fontSize:11,fontWeight:700,letterSpacing:'0.07em',textTransform:'uppercase',color:'#9ca3af' }}>{h}</div>
                    ))}
                  </div>
                  {filt.length===0
                    ? <div style={{ padding:64,textAlign:'center',color:'#9ca3af',fontSize:14 }}>No orders match your search.</div>
                    : filt.map((o,i)=>(
                        <div key={o.id} onClick={()=>setSel(o)} style={{
                          display:'grid',gridTemplateColumns:'44px 1fr 160px 140px 180px',gap:16,
                          padding:'14px 24px',alignItems:'center',cursor:'pointer',transition:'background .1s',
                          borderBottom: i<filt.length-1?'1px solid #fafafa':'none',
                        }}
                        onMouseOver={e=>(e.currentTarget as HTMLElement).style.background='#fafafa'}
                        onMouseOut={e=>(e.currentTarget as HTMLElement).style.background='transparent'}>
                          <div style={{ width:36,height:36,background:'#f3f4f6',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:600,color:'#6b7280',fontSize:13 }}>{o.full_name.charAt(0)}</div>
                          <div style={{ minWidth:0 }}>
                            <p style={{ fontSize:14,fontWeight:500,color:'#111827',margin:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{o.full_name}</p>
                            <p style={{ fontSize:12,color:'#9ca3af',margin:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{o.company_name}</p>
                          </div>
                          <div>
                            <p style={{ fontSize:13,fontWeight:500,color:'#374151',margin:0 }}>{o.order_number}</p>
                            <div style={{ display:'flex',alignItems:'center',gap:6,marginTop:3 }}>
                              <div style={{ width:10,height:10,borderRadius:3,background:SWATCH[o.card_color],flexShrink:0 }}/>
                              <p style={{ fontSize:11,color:'#9ca3af',margin:0,textTransform:'capitalize' }}>{o.card_color}</p>
                            </div>
                          </div>
                          <span style={{ fontSize:13,color:'#6b7280' }}>{fmt(o.created_at)}</span>
                          <div style={{ display:'flex',alignItems:'center',gap:8 }}>
                            <StatusBadge status={o.status} size="sm"/>
                          </div>
                        </div>
                      ))
                  }
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Profile Modal */}
      {sel && (
        <div style={{ position:'fixed',inset:0,zIndex:50,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(0,0,0,0.45)',backdropFilter:'blur(4px)',padding:16 }}>
          <div style={{ background:'#fff',borderRadius:24,maxWidth:680,width:'100%',maxHeight:'88vh',overflowY:'auto',boxShadow:'0 24px 64px rgba(0,0,0,0.18)' }}>
            {/* Modal header */}
            <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'20px 28px',borderBottom:'1px solid #f0f0f0' }}>
              <div style={{ display:'flex',alignItems:'center',gap:14 }}>
                <div style={{ width:48,height:48,background:'#f3f4f6',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,color:'#6b7280',fontSize:18 }}>{sel.full_name.charAt(0)}</div>
                <div>
                  <h2 style={{ fontSize:16,fontWeight:600,color:'#0F0F0F',margin:'0 0 2px' }}>{sel.full_name}</h2>
                  <p style={{ fontSize:13,color:'#6b7280',margin:0 }}>{sel.job_title} · {sel.company_name}</p>
                </div>
              </div>
              <button onClick={()=>setSel(null)} style={{ width:32,height:32,background:'#f3f4f6',border:'none',borderRadius:8,cursor:'pointer',fontSize:16,display:'flex',alignItems:'center',justifyContent:'center',color:'#6b7280' }}
                onMouseOver={e=>e.currentTarget.style.background='#e5e7eb'} onMouseOut={e=>e.currentTarget.style.background='#f3f4f6'}>
                ✕
              </button>
            </div>
            <div style={{ padding:28,display:'grid',gridTemplateColumns:'1fr 1fr',gap:28 }}>
              {/* Left col */}
              <div style={{ display:'flex',flexDirection:'column',gap:24 }}>
                <div>
                  <p style={{ fontSize:11,fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',color:'#9ca3af',margin:'0 0 12px' }}>Contact Information</p>
                  <div style={{ display:'flex',flexDirection:'column',gap:10 }}>
                    {[['Email',sel.email],['Phone',sel.phone],['WhatsApp',sel.whatsapp]].map(([k,v])=>(
                      <div key={k}><p style={{ fontSize:11,color:'#9ca3af',margin:'0 0 2px',fontWeight:500 }}>{k}</p><p style={{ fontSize:14,fontWeight:500,color:'#111827',margin:0 }}>{v}</p></div>
                    ))}
                  </div>
                </div>
                {(sel.website||sel.linkedin||sel.instagram||sel.facebook) && (
                  <div>
                    <p style={{ fontSize:11,fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',color:'#9ca3af',margin:'0 0 12px' }}>Social Links</p>
                    <div style={{ display:'flex',flexDirection:'column',gap:8 }}>
                      {[['Website',sel.website],['LinkedIn',sel.linkedin],['Instagram',sel.instagram],['Facebook',sel.facebook]].filter(([,v])=>v).map(([k,v])=>(
                        <a key={k} href={v!} target="_blank" rel="noreferrer" style={{ display:'flex',alignItems:'center',gap:10,textDecoration:'none' }}>
                          <span style={{ fontSize:11,color:'#9ca3af',width:60,flexShrink:0,fontWeight:500 }}>{k}</span>
                          <span style={{ fontSize:13,color:'#3b82f6',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:180 }}>{v}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <p style={{ fontSize:11,fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',color:'#9ca3af',margin:'0 0 12px' }}>Order Info</p>
                  <div style={{ background:'#f8f8f7',borderRadius:12,padding:16,display:'flex',flexDirection:'column',gap:8 }}>
                    {[['Order #',sel.order_number],['Date',fmt(sel.purchase_date)],['Qty',`${sel.quantity_ordered} card${sel.quantity_ordered>1?'s':''}`],['Submitted',fmt(sel.created_at)]].map(([k,v])=>(
                      <div key={k} style={{ display:'flex',justifyContent:'space-between',fontSize:13 }}>
                        <span style={{ color:'#6b7280' }}>{k}</span><span style={{ fontWeight:500,color:'#111827' }}>{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
                {sel.additional_notes && (
                  <div>
                    <p style={{ fontSize:11,fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',color:'#9ca3af',margin:'0 0 8px' }}>Notes</p>
                    <p style={{ fontSize:13,color:'#374151',background:'#f8f8f7',borderRadius:10,padding:'12px 14px',margin:0,lineHeight:1.6 }}>{sel.additional_notes}</p>
                  </div>
                )}
              </div>
              {/* Right col */}
              <div style={{ display:'flex',flexDirection:'column',gap:24 }}>
                <div>
                  <p style={{ fontSize:11,fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',color:'#9ca3af',margin:'0 0 12px' }}>Card Design</p>
                  <NFCCardVisual color={sel.card_color} name={sel.full_name} title={sel.job_title} company={sel.company_name} size="sm"/>
                  <p style={{ fontSize:12,color:'#9ca3af',margin:'8px 0 0' }}>Color: <span style={{ fontWeight:500,color:'#374151',textTransform:'capitalize' }}>{sel.card_color}</span></p>
                </div>
                <div>
                  <p style={{ fontSize:11,fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',color:'#9ca3af',margin:'0 0 10px' }}>Update Status</p>
                  <div style={{ marginBottom:12 }}><StatusBadge status={sel.status}/></div>
                  <select value={sel.status} onChange={e=>chSt(sel.id,e.target.value as OrderStatus)} style={{ width:'100%',fontSize:14,background:'#fff',border:'1px solid #e5e7eb',borderRadius:10,padding:'10px 14px',outline:'none',fontFamily:'inherit',color:'#374151',cursor:'pointer' }}>
                    {STATUS_OPTIONS.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                {sel.profile_photo_url && (
                  <div>
                    <p style={{ fontSize:11,fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',color:'#9ca3af',margin:'0 0 10px' }}>Profile Photo</p>
                    <img src={sel.profile_photo_url} alt={sel.full_name} style={{ width:'100%',borderRadius:12,objectFit:'cover',maxHeight:180 }}/>
                    <a href={sel.profile_photo_url} download style={{ display:'inline-flex',alignItems:'center',gap:6,marginTop:8,fontSize:12,color:'#3b82f6',textDecoration:'none' }}>↓ Download Photo</a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   ROOT
══════════════════════════════════════════════════════ */
export default function Home() {
  const[view,setView]=useState<AppView>('landing');
  const[al,setAl]=useState(false);
  const[sid,setSid]=useState('');
  if(view==='admin_dashboard'&&al) return<ADash sv={setView} setAL={setAl}/>;
  if(view==='admin_login') return<ALogin sv={setView} setAL={setAl}/>;
  if(view==='customer_form') return<CForm sv={setView} setSid={setSid}/>;
  if(view==='success') return<Success sv={setView}/>;
  return<Landing sv={setView}/>;
}
