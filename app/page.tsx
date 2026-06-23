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
function Landing({ sv }: { sv:(v:AppView)=>void }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(()=>{
    const h=()=>setScrolled(window.scrollY>20);
    window.addEventListener('scroll',h);
    return ()=>window.removeEventListener('scroll',h);
  },[]);

  return (
    <div style={S.page}>
      {/* ── Navbar ── */}
      <nav style={{
        position:'fixed',top:0,left:0,right:0,zIndex:50,
        display:'flex',alignItems:'center',justifyContent:'space-between',
        padding:'0 48px',height:64,
        background: scrolled ? 'rgba(250,250,248,0.92)' : 'transparent',
        backdropFilter: scrolled ? 'blur(16px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(0,0,0,0.06)' : '1px solid transparent',
        transition:'all .3s ease',
      }}>
        <div style={{ display:'flex',alignItems:'center',gap:10 }}>
          <div style={{
            width:32,height:32,background:'#0F0F0F',borderRadius:9,
            display:'flex',alignItems:'center',justifyContent:'center',
            boxShadow:'0 2px 8px rgba(0,0,0,0.2)',
          }}>
            <span style={{ color:'#00D4FF',fontSize:13,fontWeight:700 }}>N</span>
          </div>
          <span style={{ fontWeight:600,fontSize:15,color:'#0F0F0F',letterSpacing:'-0.02em' }}>ThisIsMyCard</span>
        </div>
        <div style={{ display:'flex',alignItems:'center',gap:8 }}>
          <button onClick={()=>sv('admin_login')} style={{
            fontSize:14,color:'#6b7280',background:'none',border:'none',cursor:'pointer',
            padding:'8px 16px',borderRadius:8,fontFamily:'inherit',fontWeight:500,
          }}
          onMouseOver={e=>(e.currentTarget.style.background='#f3f4f6')}
          onMouseOut={e=>(e.currentTarget.style.background='none')}>
            Admin
          </button>
          <button onClick={()=>sv('customer_form')} style={{
            fontSize:14,fontWeight:600,color:'#fff',background:'#0F0F0F',
            border:'none',cursor:'pointer',padding:'10px 22px',borderRadius:10,
            fontFamily:'inherit',
            boxShadow:'0 2px 8px rgba(0,0,0,0.15)',
            transition:'all .15s',
          }}
          onMouseOver={e=>{e.currentTarget.style.background='#1f2937';e.currentTarget.style.transform='translateY(-1px)';}}
          onMouseOut={e=>{e.currentTarget.style.background='#0F0F0F';e.currentTarget.style.transform='none';}}>
            Setup My Card →
          </button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section style={{ paddingTop:120,paddingBottom:96,paddingLeft:48,paddingRight:48,maxWidth:1280,margin:'0 auto' }}>
        <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:80,alignItems:'center' }}>
          {/* Left */}
          <div className="animate-fade-in-up">
            {/* Pill badge */}
            <div style={{
              display:'inline-flex',alignItems:'center',gap:8,
              background:'rgba(0,212,255,0.08)',border:'1px solid rgba(0,212,255,0.2)',
              borderRadius:99,padding:'7px 14px',marginBottom:32,
            }}>
              <div style={{ width:6,height:6,background:'#00D4FF',borderRadius:'50%' }}/>
              <span style={{ fontSize:12,fontWeight:600,color:'#0077a3',letterSpacing:'0.05em',textTransform:'uppercase' }}>
                NFC Digital Business Cards
              </span>
            </div>

            <h1 style={{
              fontSize:60,fontWeight:600,lineHeight:1.05,letterSpacing:'-0.035em',
              color:'#0F0F0F',marginBottom:24,
            }}>
              Your network,{' '}
              <span className="font-display" style={{ fontStyle:'italic' }}>one tap</span>{' '}
              away.
            </h1>

            <p style={{ fontSize:18,color:'#6b7280',lineHeight:1.7,marginBottom:36,maxWidth:440 }}>
              Premium NFC business cards that share your complete digital profile instantly. No apps, no friction — just connection.
            </p>

            <div style={{ display:'flex',gap:12,flexWrap:'wrap' }}>
              <button onClick={()=>sv('customer_form')} style={{
                background:'#0F0F0F',color:'#fff',border:'none',cursor:'pointer',
                padding:'14px 28px',borderRadius:12,fontSize:15,fontWeight:600,
                fontFamily:'inherit',
                boxShadow:'0 4px 16px rgba(0,0,0,0.18)',
                transition:'all .18s',
              }}
              onMouseOver={e=>{e.currentTarget.style.background='#1f2937';e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.boxShadow='0 8px 24px rgba(0,0,0,0.22)';}}
              onMouseOut={e=>{e.currentTarget.style.background='#0F0F0F';e.currentTarget.style.transform='none';e.currentTarget.style.boxShadow='0 4px 16px rgba(0,0,0,0.18)';}}>
                Setup My Card →
              </button>
              <a href="#how-it-works" style={{
                display:'flex',alignItems:'center',gap:8,
                color:'#374151',textDecoration:'none',
                padding:'14px 28px',borderRadius:12,fontSize:15,fontWeight:500,
                border:'1px solid #e5e7eb',background:'#fff',
                transition:'all .15s',
              }}
              onMouseOver={e=>{(e.currentTarget as HTMLElement).style.borderColor='#d1d5db';(e.currentTarget as HTMLElement).style.background='#f9fafb';}}
              onMouseOut={e=>{(e.currentTarget as HTMLElement).style.borderColor='#e5e7eb';(e.currentTarget as HTMLElement).style.background='#fff';}}>
                See how it works
              </a>
            </div>

            {/* Stats */}
            <div style={{ display:'flex',gap:32,marginTop:40,paddingTop:40,borderTop:'1px solid #e5e7eb' }}>
              {[{n:'2,400+',l:'Cards Shipped'},{n:'98%',l:'Satisfaction Rate'},{n:'48h',l:'Avg. Setup Time'}].map(s=>(
                <div key={s.l}>
                  <div style={{ fontSize:22,fontWeight:700,color:'#0F0F0F',letterSpacing:'-0.03em' }}>{s.n}</div>
                  <div style={{ fontSize:12,color:'#9ca3af',marginTop:2,fontWeight:500 }}>{s.l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right — Card Stack */}
          <div style={{ position:'relative',display:'flex',alignItems:'center',justifyContent:'center',height:420 }}>
            {/* Glow orb behind */}
            <div style={{
              position:'absolute',width:280,height:280,
              background:'radial-gradient(circle, rgba(0,212,255,0.12) 0%, transparent 70%)',
              borderRadius:'50%',filter:'blur(32px)',
            }}/>
            {/* Back card */}
            <div style={{ position:'absolute',transform:'rotate(14deg) translate(56px,-24px)',opacity:0.4 }}>
              <NFCCardVisual color="blue" size="lg" name="Marcus Tan" title="Sales Manager" company="Prestige Auto"/>
            </div>
            {/* Mid card */}
            <div style={{ position:'absolute',transform:'rotate(-7deg) translate(-28px,24px)',opacity:0.6 }}>
              <NFCCardVisual color="turquoise" size="lg" name="Priya K." title="Head of Marketing" company="DigitalEdge Asia"/>
            </div>
            {/* Front card */}
            <div style={{ position:'relative',zIndex:10 }} className="animate-float">
              <div className="animate-pulse-glow" style={{ borderRadius:16 }}>
                <NFCCardVisual color="black" size="lg" name="Ahmad Razif" title="Chief Executive Officer" company="Nexus Ventures"/>
              </div>
              {/* NFC ripple */}
              <div style={{ position:'absolute',right:-10,bottom:-10 }}>
                <div style={{ width:36,height:36,borderRadius:'50%',background:'rgba(0,212,255,0.2)',animation:'float 4.5s ease-in-out infinite' }}/>
                <div style={{ position:'absolute',inset:5,borderRadius:'50%',background:'rgba(0,212,255,0.4)' }}/>
                <div style={{ position:'absolute',inset:11,borderRadius:'50%',background:'#00D4FF' }}/>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section style={{ padding:'96px 48px',background:'#fff',borderTop:'1px solid #f3f4f6',borderBottom:'1px solid #f3f4f6' }}>
        <div style={{ maxWidth:1280,margin:'0 auto' }}>
          <div style={{ textAlign:'center',marginBottom:56 }}>
            <p style={{ fontSize:11,fontWeight:700,letterSpacing:'0.14em',textTransform:'uppercase',color:'#00D4FF',marginBottom:12 }}>
              Why ThisIsMyCard
            </p>
            <h2 style={{ fontSize:38,fontWeight:600,color:'#0F0F0F',letterSpacing:'-0.03em',margin:0 }}>
              Built for modern professionals
            </h2>
          </div>
          <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:24 }}>
            {[
              { icon:'⚡', title:'One Tap Sharing',   desc:'Share your full profile instantly with any smartphone. No app, no QR scan, just a tap.' },
              { icon:'✦',  title:'Always Up to Date', desc:'Update your details anytime from any device. Every tap shows your latest information.' },
              { icon:'◈',  title:'Premium Build',     desc:'Crafted from high-quality PVC with metallic finish. Looks and feels like a premium card.' },
            ].map((f,i)=>(
              <div key={f.title} className="animate-fade-in-up" style={{
                padding:36,borderRadius:16,border:'1px solid #f0f0f0',
                background:'#fafafa',cursor:'default',transition:'all .2s',
                animationDelay:`${i*80}ms`,opacity:0,
              }}
              onMouseOver={e=>{(e.currentTarget as HTMLElement).style.borderColor='rgba(0,212,255,0.25)';(e.currentTarget as HTMLElement).style.boxShadow='0 4px 24px rgba(0,0,0,0.06)';(e.currentTarget as HTMLElement).style.transform='translateY(-2px)';(e.currentTarget as HTMLElement).style.background='#fff';}}
              onMouseOut={e=>{(e.currentTarget as HTMLElement).style.borderColor='#f0f0f0';(e.currentTarget as HTMLElement).style.boxShadow='none';(e.currentTarget as HTMLElement).style.transform='none';(e.currentTarget as HTMLElement).style.background='#fafafa';}}>
                <div style={{ fontSize:28,marginBottom:20 }}>{f.icon}</div>
                <h3 style={{ fontSize:17,fontWeight:600,color:'#0F0F0F',marginBottom:10,letterSpacing:'-0.01em' }}>{f.title}</h3>
                <p style={{ fontSize:14,color:'#6b7280',lineHeight:1.65,margin:0 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how-it-works" style={{ padding:'96px 48px',maxWidth:1280,margin:'0 auto' }}>
        <div style={{ textAlign:'center',marginBottom:56 }}>
          <p style={{ fontSize:11,fontWeight:700,letterSpacing:'0.14em',textTransform:'uppercase',color:'#00D4FF',marginBottom:12 }}>The Process</p>
          <h2 style={{ fontSize:38,fontWeight:600,color:'#0F0F0F',letterSpacing:'-0.03em',margin:0 }}>Ready in 4 simple steps</h2>
        </div>
        <div style={{ display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8,position:'relative' }}>
          {/* Connecting line */}
          <div style={{ position:'absolute',top:22,left:'12%',right:'12%',height:1,background:'linear-gradient(90deg,#e5e7eb,#e5e7eb)',zIndex:0 }}/>
          {[
            { n:'01', t:'Purchase Your Card', d:'Order your NFC business card online or from a reseller.' },
            { n:'02', t:'Fill Your Details',  d:'Submit your profile info through this portal in minutes.' },
            { n:'03', t:'We Program It',      d:'Our team configures your NFC chip with your digital profile.' },
            { n:'04', t:'Start Networking',   d:'Tap any smartphone to share your full profile instantly.' },
          ].map((s,i)=>(
            <div key={s.n} style={{ position:'relative',zIndex:1,padding:'0 16px' }} className="animate-fade-in-up">
              <div style={{
                width:44,height:44,background:'#0F0F0F',color:'#fff',
                borderRadius:13,display:'flex',alignItems:'center',justifyContent:'center',
                fontSize:13,fontWeight:700,marginBottom:20,letterSpacing:'0.02em',
                boxShadow:'0 4px 12px rgba(0,0,0,0.12)',
              }}>{s.n}</div>
              <h3 style={{ fontSize:15,fontWeight:600,color:'#0F0F0F',marginBottom:8,letterSpacing:'-0.01em' }}>{s.t}</h3>
              <p style={{ fontSize:13.5,color:'#6b7280',lineHeight:1.6,margin:0 }}>{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section style={{ padding:'0 48px',marginBottom:80 }}>
        <div style={{
          maxWidth:1280,margin:'0 auto',
          background:'#0F0F0F',borderRadius:24,
          padding:'72px 80px',
          position:'relative',overflow:'hidden',
        }}>
          {/* Glow */}
          <div style={{ position:'absolute',top:-60,right:120,width:300,height:300,background:'radial-gradient(circle,rgba(0,212,255,0.12) 0%,transparent 65%)',borderRadius:'50%',pointerEvents:'none' }}/>
          <div style={{ position:'absolute',bottom:-40,left:80,width:200,height:200,background:'radial-gradient(circle,rgba(0,212,255,0.07) 0%,transparent 65%)',borderRadius:'50%',pointerEvents:'none' }}/>
          <div style={{ position:'relative',textAlign:'center' }}>
            <h2 style={{ fontSize:40,fontWeight:600,color:'#fff',letterSpacing:'-0.035em',marginBottom:16 }}>
              Already have a card?{' '}
              <span style={{ color:'#00D4FF' }}>Set it up now.</span>
            </h2>
            <p style={{ fontSize:16,color:'rgba(255,255,255,0.5)',marginBottom:36,maxWidth:440,margin:'0 auto 36px' }}>
              Fill in your details and our team will configure your card within 48 hours.
            </p>
            <button onClick={()=>sv('customer_form')} style={{
              background:'#00D4FF',color:'#0F0F0F',border:'none',cursor:'pointer',
              padding:'15px 36px',borderRadius:12,fontSize:15,fontWeight:700,
              fontFamily:'inherit',
              boxShadow:'0 4px 20px rgba(0,212,255,0.4)',
              transition:'all .18s',
            }}
            onMouseOver={e=>{e.currentTarget.style.background='#fff';e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.boxShadow='0 8px 28px rgba(0,212,255,0.35)';}}
            onMouseOut={e=>{e.currentTarget.style.background='#00D4FF';e.currentTarget.style.transform='none';e.currentTarget.style.boxShadow='0 4px 20px rgba(0,212,255,0.4)';}}>
              Setup My Card →
            </button>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ padding:'28px 48px',borderTop:'1px solid #f0f0f0',display:'flex',alignItems:'center',justifyContent:'space-between' }}>
        <div style={{ display:'flex',alignItems:'center',gap:8 }}>
          <div style={{ width:24,height:24,background:'#0F0F0F',borderRadius:7,display:'flex',alignItems:'center',justifyContent:'center' }}>
            <span style={{ color:'#00D4FF',fontSize:10,fontWeight:700 }}>N</span>
          </div>
          <span style={{ fontSize:14,fontWeight:500,color:'#6b7280' }}>ThisIsMyCard</span>
        </div>
        <p style={{ fontSize:13,color:'#9ca3af',margin:0 }}>© 2024 ThisIsMyCard. All rights reserved.</p>
        <button onClick={()=>sv('admin_login')} style={{
          fontSize:13,color:'#9ca3af',background:'none',border:'none',cursor:'pointer',fontFamily:'inherit',
        }}
        onMouseOver={e=>e.currentTarget.style.color='#374151'}
        onMouseOut={e=>e.currentTarget.style.color='#9ca3af'}>
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
