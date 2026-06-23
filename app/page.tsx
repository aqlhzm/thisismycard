'use client';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import NFCCardVisual from '@/components/shared/NFCCardVisual';
import StatusBadge, { STATUS_OPTIONS } from '@/components/shared/StatusBadge';
import { submitOrder, adminLogin, getAllOrders, updateOrderStatus } from '@/lib/actions';
import type { CardColor, Order, OrderStatus, AppView } from '@/types';

const CARD_COLORS: Array<{ value: CardColor; label: string; swatch: string }> = [
  { value:'black',label:'Black',swatch:'#0F0F0F' },{ value:'white',label:'White',swatch:'#F0F0F0' },
  { value:'orange',label:'Orange',swatch:'#f97316' },{ value:'green',label:'Green',swatch:'#22c55e' },
  { value:'red',label:'Red',swatch:'#ef4444' },{ value:'pink',label:'Pink',swatch:'#ec4899' },
  { value:'blue',label:'Blue',swatch:'#3b82f6' },{ value:'turquoise',label:'Turquoise',swatch:'#06b6d4' },
];
const SWATCH: Record<CardColor,string> = {black:'#0F0F0F',white:'#e5e7eb',orange:'#f97316',green:'#22c55e',red:'#ef4444',pink:'#ec4899',blue:'#3b82f6',turquoise:'#06b6d4'};

interface FD { fullName:string;jobTitle:string;companyName:string;phone:string;email:string;whatsapp:string;website:string;facebook:string;instagram:string;linkedin:string;cardColor:CardColor;orderNumber:string;purchaseDate:string;quantityOrdered:string;additionalNotes:string;profilePhotoB64:string;profilePhotoName:string; }
const empty:FD={fullName:'',jobTitle:'',companyName:'',phone:'',email:'',whatsapp:'',website:'',facebook:'',instagram:'',linkedin:'',cardColor:'black',orderNumber:'',purchaseDate:'',quantityOrdered:'1',additionalNotes:'',profilePhotoB64:'',profilePhotoName:''};

function FInput({label,name,type='text',placeholder,required,prefix,form,onChange,error}:{label:string;name:keyof FD;type?:string;placeholder?:string;required?:boolean;prefix?:string;form:FD;onChange:(n:keyof FD,v:string)=>void;error?:string}){
  return(<div><label className="block text-sm font-medium text-gray-700 mb-1.5">{label}{required&&<span className="text-red-400"> *</span>}</label><div className={`flex rounded-xl border ${error?'border-red-300':'border-gray-200'} bg-white overflow-hidden focus-within:ring-2 focus-within:ring-[#00D4FF]/30 focus-within:border-[#00D4FF] transition-all`}>{prefix&&<span className="flex items-center px-3 bg-gray-50 border-r border-gray-200 text-gray-400 text-sm whitespace-nowrap">{prefix}</span>}<input type={type} value={form[name]} onChange={e=>onChange(name,e.target.value)} placeholder={placeholder} className="flex-1 px-4 py-3 text-sm outline-none bg-transparent text-gray-900 placeholder-gray-400"/></div>{error&&<p className="text-red-400 text-xs mt-1">{error}</p>}</div>);
}

function fmt(d:string){return new Date(d).toLocaleDateString('en-MY',{day:'numeric',month:'short',year:'numeric'});}

// ── Landing ──────────────────────────────────────────────────────
function Landing({sv}:{sv:(v:AppView)=>void}){
  const steps=[{n:'01',t:'Purchase Your Card',d:'Order your NFC business card online or in-store.'},{n:'02',t:'Fill Your Details',d:'Submit your info through this portal in minutes.'},{n:'03',t:'We Program It',d:'Our team configures your card with your digital profile.'},{n:'04',t:'Start Networking',d:'Tap to share — instantly, everywhere.'}];
  return(<div className="min-h-screen bg-[#FAFAF8]">
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-12 h-16 bg-[#FAFAF8]/90 backdrop-blur-md border-b border-black/5">
      <div className="flex items-center gap-2"><div className="w-7 h-7 bg-[#0F0F0F] rounded-lg flex items-center justify-center"><span className="text-[#00D4FF] text-xs font-bold">N</span></div><span className="text-[#0F0F0F] font-semibold text-sm">ThisIsMyCard</span></div>
      <div className="flex items-center gap-3"><button onClick={()=>sv('admin_login')} className="text-sm text-gray-500 hover:text-gray-900">Admin</button><button onClick={()=>sv('customer_form')} className="bg-[#0F0F0F] text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-800 font-medium">Setup My Card</button></div>
    </nav>
    <section className="pt-32 pb-24 px-6 md:px-12 max-w-7xl mx-auto"><div className="grid md:grid-cols-2 gap-16 items-center">
      <div className="animate-fade-in-up">
        <div className="inline-flex items-center gap-2 bg-[#00D4FF]/10 text-[#007a96] text-xs font-semibold px-3 py-1.5 rounded-full mb-8 border border-[#00D4FF]/20"><span className="w-1.5 h-1.5 bg-[#00D4FF] rounded-full"/>NFC Digital Business Cards</div>
        <h1 className="text-5xl md:text-6xl font-semibold text-[#0F0F0F] leading-[1.1] tracking-tight mb-6">Your network, <span className="font-display italic">one tap</span> away.</h1>
        <p className="text-lg text-gray-500 leading-relaxed mb-10 max-w-md">Premium NFC business cards that share your complete digital profile instantly. No apps, no friction — just connection.</p>
        <div className="flex flex-col sm:flex-row gap-3">
          <button onClick={()=>sv('customer_form')} className="bg-[#0F0F0F] text-white px-8 py-3.5 rounded-xl font-medium hover:bg-gray-800 transition-all text-sm">Setup My Card →</button>
          <a href="#how-it-works" className="flex items-center justify-center gap-2 text-gray-600 px-8 py-3.5 rounded-xl font-medium hover:bg-gray-100 text-sm border border-gray-200">See how it works</a>
        </div>
        <div className="flex items-center gap-6 mt-10 pt-10 border-t border-gray-100">{[{n:'2,400+',l:'Cards Shipped'},{n:'98%',l:'Satisfaction Rate'},{n:'48h',l:'Avg. Setup Time'}].map(s=><div key={s.l}><div className="text-xl font-semibold text-[#0F0F0F]">{s.n}</div><div className="text-xs text-gray-400 mt-0.5">{s.l}</div></div>)}</div>
      </div>
      <div className="relative flex items-center justify-center h-96">
        <div className="absolute" style={{transform:'rotate(12deg) translate(40px,-20px)',opacity:0.45}}><NFCCardVisual color="blue" size="lg" name="Marcus Tan" title="Sales Manager" company="Prestige Auto"/></div>
        <div className="absolute" style={{transform:'rotate(-6deg) translate(-20px,20px)',opacity:0.65}}><NFCCardVisual color="turquoise" size="lg" name="Priya K." title="Head of Marketing" company="DigitalEdge"/></div>
        <div className="relative z-10 animate-float"><div className="animate-pulse-glow rounded-2xl"><NFCCardVisual color="black" size="lg" name="Ahmad Razif" title="Chief Executive Officer" company="Nexus Ventures"/></div>
          <div className="absolute -right-3 -bottom-3"><div className="w-10 h-10 rounded-full bg-[#00D4FF]/20 animate-ping"/><div className="absolute inset-2 rounded-full bg-[#00D4FF]/40"/><div className="absolute inset-3.5 rounded-full bg-[#00D4FF]"/></div>
        </div>
      </div>
    </div></section>
    <section className="py-24 px-6 md:px-12 bg-white border-y border-gray-100"><div className="max-w-7xl mx-auto">
      <div className="text-center mb-16"><p className="text-xs font-semibold tracking-widest text-[#00D4FF] uppercase mb-3">Why ThisIsMyCard</p><h2 className="text-3xl md:text-4xl font-semibold text-[#0F0F0F] tracking-tight">Built for modern professionals</h2></div>
      <div className="grid md:grid-cols-3 gap-8">{[{i:'⚡',t:'One Tap Sharing',d:'Share your full profile instantly. No apps required.'},{i:'✦',t:'Always Up to Date',d:'Update your details anytime. Your card stays current.'},{i:'◈',t:'Premium Build',d:'Made from high-quality materials designed for professionals.'}].map(f=><div key={f.t} className="p-8 rounded-2xl border border-gray-100 hover:border-[#00D4FF]/30 hover:shadow-lg transition-all duration-300"><div className="text-2xl mb-5">{f.i}</div><h3 className="font-semibold text-[#0F0F0F] mb-2">{f.t}</h3><p className="text-gray-500 text-sm leading-relaxed">{f.d}</p></div>)}</div>
    </div></section>
    <section id="how-it-works" className="py-24 px-6 md:px-12 max-w-7xl mx-auto"><div className="text-center mb-16"><p className="text-xs font-semibold tracking-widest text-[#00D4FF] uppercase mb-3">The Process</p><h2 className="text-3xl md:text-4xl font-semibold text-[#0F0F0F] tracking-tight">Ready in 4 simple steps</h2></div>
      <div className="grid md:grid-cols-4 gap-8">{steps.map(s=><div key={s.n}><div className="w-12 h-12 bg-[#0F0F0F] text-white rounded-2xl flex items-center justify-center font-semibold text-sm mb-5">{s.n}</div><h3 className="font-semibold text-[#0F0F0F] mb-2 text-sm">{s.t}</h3><p className="text-gray-400 text-sm leading-relaxed">{s.d}</p></div>)}</div>
    </section>
    <section className="py-16 px-6 md:px-12 mx-6 md:mx-12 mb-16 bg-[#0F0F0F] rounded-3xl"><div className="max-w-4xl mx-auto text-center"><h2 className="text-3xl md:text-4xl font-semibold text-white mb-4 tracking-tight">Already have a card? <span className="text-[#00D4FF]">Set it up now.</span></h2><p className="text-gray-400 mb-8 max-w-md mx-auto">Fill in your details and our team will configure your card within 48 hours.</p><button onClick={()=>sv('customer_form')} className="bg-[#00D4FF] text-[#0F0F0F] font-semibold px-8 py-3.5 rounded-xl hover:bg-white transition-colors">Setup My Card →</button></div></section>
    <footer className="py-8 px-6 md:px-12 border-t border-gray-100 flex flex-col md:flex-row items-center justify-between gap-4"><div className="flex items-center gap-2"><div className="w-6 h-6 bg-[#0F0F0F] rounded-md flex items-center justify-center"><span className="text-[#00D4FF] text-xs font-bold">N</span></div><span className="text-sm font-medium text-gray-600">ThisIsMyCard</span></div><p className="text-xs text-gray-400">© 2024 ThisIsMyCard. All rights reserved.</p><button onClick={()=>sv('admin_login')} className="text-xs text-gray-400 hover:text-gray-600">Admin Portal →</button></footer>
  </div>);
}

// ── Customer Form ────────────────────────────────────────────────
function CForm({sv,setSid}:{sv:(v:AppView)=>void;setSid:(id:string)=>void}){
  const [step,setStep]=useState(1);const[form,setForm]=useState<FD>(empty);const[errors,setErrors]=useState<Partial<Record<keyof FD,string>>>({});const[submitting,setSubmitting]=useState(false);const fileRef=useRef<HTMLInputElement>(null);
  const upd=(n:keyof FD,v:string)=>{setForm(f=>({...f,[n]:v}));if(errors[n])setErrors(e=>({...e,[n]:''}));};
  const val=()=>{const e:Partial<Record<keyof FD,string>>={};if(step===1){if(!form.fullName.trim())e.fullName='Required';if(!form.jobTitle.trim())e.jobTitle='Required';if(!form.companyName.trim())e.companyName='Required';if(!form.phone.trim())e.phone='Required';if(!form.email.trim())e.email='Required';else if(!/\S+@\S+\.\S+/.test(form.email))e.email='Invalid email';if(!form.whatsapp.trim())e.whatsapp='Required';}if(step===4){if(!form.orderNumber.trim())e.orderNumber='Required';if(!form.purchaseDate)e.purchaseDate='Required';if(!form.quantityOrdered||Number(form.quantityOrdered)<1)e.quantityOrdered='Min 1';}setErrors(e);return Object.keys(e).length===0;};
  const handlePhoto=(e:React.ChangeEvent<HTMLInputElement>)=>{const f=e.target.files?.[0];if(!f)return;const r=new FileReader();r.onload=()=>{upd('profilePhotoB64',r.result as string);upd('profilePhotoName',f.name);};r.readAsDataURL(f);};
  const handleSub=async()=>{if(!val())return;setSubmitting(true);try{const res=await submitOrder({full_name:form.fullName,job_title:form.jobTitle,company_name:form.companyName,phone:form.phone,email:form.email,website:form.website||null,facebook:form.facebook||null,instagram:form.instagram||null,linkedin:form.linkedin||null,whatsapp:form.whatsapp,profile_photo_url:null,profile_photo_name:form.profilePhotoName||null,card_color:form.cardColor,order_number:form.orderNumber,purchase_date:form.purchaseDate,quantity_ordered:Number(form.quantityOrdered),additional_notes:form.additionalNotes||null});if(res.success&&res.id){setSid(res.id);sv('success');}else{alert(res.error||'Submission failed.');}}finally{setSubmitting(false);}};
  const SS=[{n:1,l:'Your Details'},{n:2,l:'Social Links'},{n:3,l:'Card Design'},{n:4,l:'Order Info'}];
  return(<div className="min-h-screen bg-[#FAFAF8] flex flex-col">
    <div className="flex items-center justify-between px-6 md:px-12 h-16 bg-white border-b border-gray-100"><button onClick={()=>sv('landing')} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900">← <span className="font-medium">ThisIsMyCard</span></button><span className="text-sm text-gray-400">Card Setup</span><div className="w-20"/></div>
    <div className="flex-1 max-w-4xl mx-auto w-full px-6 py-10">
      <div className="flex items-center gap-2 mb-10">{SS.map((s,i)=><React.Fragment key={s.n}><div className="flex items-center gap-2"><div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${step===s.n?'bg-[#00D4FF] text-[#0F0F0F]':step>s.n?'bg-[#0F0F0F] text-white':'bg-gray-200 text-gray-400'}`}>{step>s.n?'✓':s.n}</div><span className={`text-sm hidden sm:block ${step===s.n?'text-[#0F0F0F] font-medium':'text-gray-400'}`}>{s.l}</span></div>{i<SS.length-1&&<div className={`flex-1 h-px ${step>s.n?'bg-[#0F0F0F]':'bg-gray-200'}`}/>}</React.Fragment>)}</div>
      <div className="grid lg:grid-cols-[1fr_300px] gap-8">
        <div className="bg-white rounded-2xl border border-gray-100 p-8 card-shadow">
          {step===1&&<div className="space-y-5"><div className="mb-8"><h2 className="text-2xl font-semibold text-[#0F0F0F]">Your Details</h2><p className="text-gray-400 text-sm mt-1">This will appear on your digital card.</p></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-2">Profile Photo</label><div onClick={()=>fileRef.current?.click()} className="flex items-center gap-4 p-4 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-[#00D4FF] hover:bg-[#00D4FF]/5 transition-all">{form.profilePhotoB64?<img src={form.profilePhotoB64} alt="Profile" className="w-14 h-14 rounded-full object-cover ring-2 ring-[#00D4FF]/20"/>:<div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center text-2xl">👤</div>}<div><p className="text-sm font-medium text-gray-700">{form.profilePhotoName||'Upload photo'}</p><p className="text-xs text-gray-400 mt-0.5">JPG, PNG up to 5MB</p></div><input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto}/></div></div>
            <div className="grid sm:grid-cols-2 gap-5"><FInput label="Full Name" name="fullName" placeholder="Ahmad Razif" required form={form} onChange={upd} error={errors.fullName}/><FInput label="Job Title" name="jobTitle" placeholder="CEO" required form={form} onChange={upd} error={errors.jobTitle}/></div>
            <FInput label="Company Name" name="companyName" placeholder="Nexus Ventures Sdn Bhd" required form={form} onChange={upd} error={errors.companyName}/>
            <div className="grid sm:grid-cols-2 gap-5"><FInput label="Phone" name="phone" type="tel" placeholder="+60123456789" required form={form} onChange={upd} error={errors.phone}/><FInput label="WhatsApp" name="whatsapp" type="tel" placeholder="+60123456789" required form={form} onChange={upd} error={errors.whatsapp}/></div>
            <FInput label="Email" name="email" type="email" placeholder="you@company.com" required form={form} onChange={upd} error={errors.email}/>
          </div>}
          {step===2&&<div className="space-y-5"><div className="mb-8"><h2 className="text-2xl font-semibold text-[#0F0F0F]">Social & Web Links</h2><p className="text-gray-400 text-sm mt-1">All optional.</p></div>
            <FInput label="Website" name="website" type="url" placeholder="https://yourwebsite.com" prefix="🌐" form={form} onChange={upd}/>
            <FInput label="LinkedIn" name="linkedin" type="url" placeholder="https://linkedin.com/in/you" prefix="in" form={form} onChange={upd}/>
            <FInput label="Instagram" name="instagram" type="url" placeholder="https://instagram.com/handle" prefix="@" form={form} onChange={upd}/>
            <FInput label="Facebook" name="facebook" type="url" placeholder="https://facebook.com/profile" prefix="fb" form={form} onChange={upd}/>
          </div>}
          {step===3&&<div><div className="mb-8"><h2 className="text-2xl font-semibold text-[#0F0F0F]">Choose Card Color</h2><p className="text-gray-400 text-sm mt-1">Pick the finish for your physical NFC card.</p></div>
            <div className="grid grid-cols-4 gap-3 mb-8">{CARD_COLORS.map(c=><button key={c.value} onClick={()=>upd('cardColor',c.value)} className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${form.cardColor===c.value?'border-[#00D4FF] bg-[#00D4FF]/5':'border-gray-100 hover:border-gray-300'}`}><div className="w-10 h-10 rounded-xl shadow-sm ring-1 ring-black/10" style={{background:c.swatch}}/><span className="text-xs font-medium text-gray-600">{c.label}</span></button>)}</div>
            <div className="flex justify-center"><div><p className="text-xs text-gray-400 text-center mb-4 uppercase tracking-wider">Live Preview</p><NFCCardVisual color={form.cardColor} name={form.fullName||'Your Name'} title={form.jobTitle||'Job Title'} company={form.companyName||'Company'} size="md" animated/></div></div>
          </div>}
          {step===4&&<div className="space-y-5"><div className="mb-8"><h2 className="text-2xl font-semibold text-[#0F0F0F]">Order Details</h2><p className="text-gray-400 text-sm mt-1">Help us match your setup to your purchase.</p></div>
            <FInput label="Order Number" name="orderNumber" placeholder="TIMC-2024-XXX" required form={form} onChange={upd} error={errors.orderNumber}/>
            <div className="grid sm:grid-cols-2 gap-5"><FInput label="Purchase Date" name="purchaseDate" type="date" required form={form} onChange={upd} error={errors.purchaseDate}/><FInput label="Quantity" name="quantityOrdered" type="number" placeholder="1" required form={form} onChange={upd} error={errors.quantityOrdered}/></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Notes</label><textarea value={form.additionalNotes} onChange={e=>upd('additionalNotes',e.target.value)} placeholder="Any special requests..." rows={3} className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[#00D4FF]/30 focus:border-[#00D4FF] resize-none text-gray-900 placeholder-gray-400"/></div>
            <div className="bg-gray-50 rounded-xl p-5 border border-gray-100"><p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Summary</p><div className="space-y-2">{[['Name',form.fullName],['Title',form.jobTitle],['Company',form.companyName],['Email',form.email],['Card',CARD_COLORS.find(c=>c.value===form.cardColor)?.label]].map(([k,v])=>v&&<div key={k} className="flex justify-between text-sm"><span className="text-gray-400">{k}</span><span className="text-gray-700 font-medium">{v}</span></div>)}</div></div>
          </div>}
          <div className="flex justify-between mt-8 pt-6 border-t border-gray-100">
            <button onClick={()=>step>1?setStep(s=>s-1):sv('landing')} className="text-sm text-gray-500 hover:text-gray-900 px-4 py-2.5 rounded-xl hover:bg-gray-100 font-medium">← {step===1?'Back to Home':'Previous'}</button>
            {step<4?<button onClick={()=>val()&&setStep(s=>s+1)} className="bg-[#0F0F0F] text-white text-sm px-6 py-2.5 rounded-xl hover:bg-gray-800 font-medium">Continue →</button>:<button onClick={handleSub} disabled={submitting} className="bg-[#00D4FF] text-[#0F0F0F] text-sm px-6 py-2.5 rounded-xl hover:bg-cyan-300 font-semibold disabled:opacity-50">{submitting?'Submitting...':'Submit Setup ✓'}</button>}
          </div>
        </div>
        <div className="hidden lg:flex flex-col gap-5">
          <div className="bg-white rounded-2xl border border-gray-100 p-5 card-shadow"><p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Card Preview</p><NFCCardVisual color={form.cardColor} name={form.fullName||'Your Name'} title={form.jobTitle||'Job Title'} company={form.companyName||'Company'} size="sm" animated/></div>
          <div className="bg-[#0F0F0F] rounded-2xl p-5 text-white"><p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Progress</p><div className="space-y-3">{SS.map(s=><div key={s.n} className="flex items-center gap-3"><div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 ${step===s.n?'bg-[#00D4FF] text-[#0F0F0F]':step>s.n?'bg-green-400 text-[#0F0F0F]':'bg-gray-700 text-gray-500'}`}>{step>s.n?'✓':s.n}</div><span className={`text-sm ${step===s.n?'text-white font-medium':step>s.n?'text-gray-300':'text-gray-600'}`}>{s.l}</span></div>)}</div></div>
        </div>
      </div>
    </div>
  </div>);
}

// ── Success ──────────────────────────────────────────────────────
function Success({sv}:{sv:(v:AppView)=>void}){
  return(<div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center px-6"><div className="max-w-lg w-full text-center animate-fade-in-up">
    <div className="w-20 h-20 bg-[#0F0F0F] rounded-full flex items-center justify-center mx-auto mb-8 relative"><svg width="36" height="36" viewBox="0 0 36 36" fill="none"><path d="M7 18L14 25L29 11" stroke="#00D4FF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg><div className="absolute inset-0 rounded-full border border-[#00D4FF]/30 scale-110 animate-ping" style={{animationDuration:'2s'}}/></div>
    <h1 className="text-3xl font-semibold text-[#0F0F0F] mb-4 tracking-tight">You&apos;re all set!</h1>
    <p className="text-gray-500 leading-relaxed mb-8">Thank you. Your card setup request has been received and is being processed. Our team will reach out within 48 hours.</p>
    <div className="bg-[#0F0F0F] rounded-2xl p-6 text-left mb-8"><p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">What happens next</p><div className="space-y-3">{['Our team verifies your submission','Your card goes into production','We program your NFC chip','Your card ships to you'].map((t,i)=><div key={t} className="flex items-center gap-3"><div className="w-7 h-7 rounded-lg bg-gray-800 text-gray-400 text-xs font-semibold flex items-center justify-center flex-shrink-0">0{i+1}</div><p className="text-sm text-gray-300">{t}</p></div>)}</div></div>
    <button onClick={()=>sv('landing')} className="bg-[#0F0F0F] text-white px-8 py-3 rounded-xl font-medium hover:bg-gray-800 text-sm">Back to Home</button>
  </div></div>);
}

// ── Admin Login ──────────────────────────────────────────────────
function ALogin({sv,setAL}:{sv:(v:AppView)=>void;setAL:(v:boolean)=>void}){
  const[email,setEmail]=useState('');const[pass,setPass]=useState('');const[show,setShow]=useState(false);const[err,setErr]=useState('');const[loading,setLoading]=useState(false);
  const go=async()=>{if(!email||!pass)return;setLoading(true);setErr('');const r=await adminLogin(email,pass);if(r.success){setAL(true);sv('admin_dashboard');}else{setErr(r.error||'Login failed');}setLoading(false);};
  return(<div className="min-h-screen bg-[#0F0F0F] flex items-center justify-center px-6"><div className="w-full max-w-sm">
    <div className="flex items-center gap-2 mb-12"><div className="w-8 h-8 rounded-lg bg-[#00D4FF] flex items-center justify-center"><span className="text-[#0F0F0F] text-sm font-bold">N</span></div><span className="text-white font-semibold">ThisIsMyCard</span><span className="text-gray-600 text-xs ml-1">Admin</span></div>
    <h1 className="text-2xl font-semibold text-white mb-2">Welcome back</h1><p className="text-gray-500 text-sm mb-8">Sign in to your admin dashboard.</p>
    <div className="space-y-4">
      <div><label className="block text-sm font-medium text-gray-400 mb-1.5">Email</label><input type="email" value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==='Enter'&&go()} placeholder="admin@thisismycard.io" className="w-full bg-gray-900 border border-gray-800 text-white text-sm px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-[#00D4FF]/30 focus:border-[#00D4FF] placeholder-gray-600"/></div>
      <div><label className="block text-sm font-medium text-gray-400 mb-1.5">Password</label><div className="relative"><input type={show?'text':'password'} value={pass} onChange={e=>setPass(e.target.value)} onKeyDown={e=>e.key==='Enter'&&go()} placeholder="••••••••" className="w-full bg-gray-900 border border-gray-800 text-white text-sm px-4 py-3 pr-12 rounded-xl outline-none focus:ring-2 focus:ring-[#00D4FF]/30 focus:border-[#00D4FF] placeholder-gray-600"/><button type="button" onClick={()=>setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 text-xs">{show?'Hide':'Show'}</button></div></div>
      {err&&<div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-xl">{err}</div>}
      <button onClick={go} disabled={loading} className="w-full bg-[#00D4FF] text-[#0F0F0F] font-semibold py-3 rounded-xl hover:bg-cyan-300 disabled:opacity-50 mt-2">{loading?'Signing in...':'Sign In →'}</button>
    </div>
    <button onClick={()=>sv('landing')} className="w-full mt-6 text-sm text-gray-600 hover:text-gray-400 text-center">← Back to customer portal</button>
  </div></div>);
}

// ── Admin Dashboard ──────────────────────────────────────────────
function ADash({sv,setAL}:{sv:(v:AppView)=>void;setAL:(v:boolean)=>void}){
  const[tab,setTab]=useState<'overview'|'orders'>('overview');const[orders,setOrders]=useState<Order[]>([]);const[loading,setLoading]=useState(true);const[search,setSearch]=useState('');const[sf,setSf]=useState<OrderStatus|'all'>('all');const[sel,setSel]=useState<Order|null>(null);
  const load=useCallback(async()=>{setLoading(true);const r=await getAllOrders();if(r.orders)setOrders(r.orders);setLoading(false);},[]);
  useEffect(()=>{load();},[load]);
  const chSt=async(id:string,st:OrderStatus)=>{await updateOrderStatus(id,st);setOrders(p=>p.map(o=>o.id===id?{...o,status:st,updated_at:new Date().toISOString()}:o));if(sel?.id===id)setSel(p=>p?{...p,status:st}:null);};
  const filt=orders.filter(o=>{const q=search.toLowerCase();const ms=!q||o.full_name.toLowerCase().includes(q)||o.company_name.toLowerCase().includes(q)||o.order_number.toLowerCase().includes(q)||o.email.toLowerCase().includes(q);return ms&&(sf==='all'||o.status===sf);});
  const st={total:orders.length,new:orders.filter(o=>o.status==='new').length,pend:orders.filter(o=>o.status==='pending_verification').length,prod:orders.filter(o=>o.status==='in_production').length,ship:orders.filter(o=>o.status==='shipped').length,done:orders.filter(o=>o.status==='completed').length};
  return(<div className="min-h-screen bg-gray-50 flex flex-col">
    <header className="bg-white border-b border-gray-100 flex items-center justify-between px-6 md:px-8 h-14 flex-shrink-0">
      <div className="flex items-center gap-3"><div className="w-7 h-7 bg-[#0F0F0F] rounded-lg flex items-center justify-center"><span className="text-[#00D4FF] text-xs font-bold">N</span></div><span className="font-semibold text-sm text-[#0F0F0F]">ThisIsMyCard</span><span className="text-gray-300">·</span><span className="text-sm text-gray-400">Admin</span></div>
      <div className="flex items-center gap-4"><div className="w-2 h-2 rounded-full bg-green-400"/><button onClick={()=>{setAL(false);sv('landing');}} className="text-sm text-gray-500 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg">Sign out</button></div>
    </header>
    <div className="bg-white border-b border-gray-100 px-6 md:px-8"><div className="flex gap-1">{[{k:'overview',l:'Overview'},{k:'orders',l:`Orders (${orders.length})`}].map(t=><button key={t.k} onClick={()=>setTab(t.k as 'overview'|'orders')} className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${tab===t.k?'border-[#0F0F0F] text-[#0F0F0F]':'border-transparent text-gray-400 hover:text-gray-600'}`}>{t.l}</button>)}</div></div>
    <div className="flex-1 px-6 md:px-8 py-8 max-w-7xl mx-auto w-full">
      {loading?<div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-[#00D4FF] border-t-transparent rounded-full animate-spin"/></div>:<>
        {tab==='overview'&&<div className="space-y-8">
          <div><h1 className="text-2xl font-semibold text-[#0F0F0F]">Dashboard</h1><p className="text-gray-400 text-sm mt-1">Monitor all card orders and submissions.</p></div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">{[{l:'Total',v:st.total,bg:'bg-gray-900',tv:'text-white',sv2:'text-gray-400'},{l:'New Orders',v:st.new,bg:'bg-blue-50',tv:'text-[#0F0F0F]',sv2:'text-blue-600'},{l:'Pending',v:st.pend,bg:'bg-yellow-50',tv:'text-[#0F0F0F]',sv2:'text-yellow-600'},{l:'Production',v:st.prod,bg:'bg-orange-50',tv:'text-[#0F0F0F]',sv2:'text-orange-600'},{l:'Shipped',v:st.ship,bg:'bg-indigo-50',tv:'text-[#0F0F0F]',sv2:'text-indigo-600'},{l:'Completed',v:st.done,bg:'bg-green-50',tv:'text-[#0F0F0F]',sv2:'text-green-600'}].map(s=><div key={s.l} className={`${s.bg} rounded-2xl p-5 card-shadow`}><div className={`text-3xl font-semibold ${s.tv}`}>{s.v}</div><div className={`text-xs mt-1 font-medium ${s.sv2}`}>{s.l}</div></div>)}</div>
          <div className="bg-white rounded-2xl border border-gray-100 card-shadow"><div className="flex items-center justify-between p-6 border-b border-gray-50"><h3 className="font-semibold text-[#0F0F0F]">Recent Submissions</h3><button onClick={()=>setTab('orders')} className="text-sm text-[#00D4FF] font-medium">View all →</button></div>
            <div className="divide-y divide-gray-50">{orders.slice(0,6).map(o=><div key={o.id} onClick={()=>setSel(o)} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors"><div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center font-semibold text-gray-400 text-sm flex-shrink-0">{o.full_name.charAt(0)}</div><div className="flex-1 min-w-0"><p className="text-sm font-medium text-gray-800 truncate">{o.full_name}</p><p className="text-xs text-gray-400 truncate">{o.company_name}</p></div><div className="hidden md:block text-xs text-gray-400">{o.order_number}</div><StatusBadge status={o.status} size="sm"/></div>)}</div>
          </div>
        </div>}
        {tab==='orders'&&<div className="space-y-6">
          <div><h1 className="text-2xl font-semibold text-[#0F0F0F]">All Orders</h1><p className="text-gray-400 text-sm mt-0.5">{filt.length} result{filt.length!==1?'s':''}</p></div>
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1 max-w-md"><div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg></div><input type="search" placeholder="Search name, company, order..." value={search} onChange={e=>setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[#00D4FF]/30 focus:border-[#00D4FF]"/></div>
            <select value={sf} onChange={e=>setSf(e.target.value as OrderStatus|'all')} className="text-sm bg-white border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-[#00D4FF]/30 focus:border-[#00D4FF] text-gray-700"><option value="all">All Statuses</option>{STATUS_OPTIONS.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 card-shadow overflow-hidden">
            <div className="grid grid-cols-[36px_1fr_1fr_1fr_auto] gap-4 px-6 py-3 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-400 uppercase tracking-wider"><div/><div>Customer</div><div className="hidden md:block">Order</div><div className="hidden md:block">Date</div><div>Status</div></div>
            {filt.length===0?<div className="py-16 text-center text-gray-400 text-sm">No orders match your search.</div>:<div className="divide-y divide-gray-50">{filt.map(o=><div key={o.id} onClick={()=>setSel(o)} className="grid grid-cols-[36px_1fr_1fr_1fr_auto] gap-4 items-center px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors group"><div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-xs font-semibold text-gray-400">{o.full_name.charAt(0)}</div><div className="min-w-0"><p className="text-sm font-medium text-gray-800 truncate">{o.full_name}</p><p className="text-xs text-gray-400 truncate">{o.company_name}</p></div><div className="hidden md:block"><p className="text-sm text-gray-600 font-medium">{o.order_number}</p><div className="flex items-center gap-1.5 mt-0.5"><div className="w-3 h-3 rounded-full ring-1 ring-black/10" style={{background:SWATCH[o.card_color]}}/><p className="text-xs text-gray-400 capitalize">{o.card_color}</p></div></div><div className="hidden md:block text-sm text-gray-400">{fmt(o.created_at)}</div><div className="flex items-center gap-2"><StatusBadge status={o.status} size="sm"/><span className="text-gray-300 group-hover:text-gray-500 text-sm">→</span></div></div>)}</div>}
          </div>
        </div>}
      </>}
    </div>
    {sel&&<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto card-shadow">
      <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-xl font-semibold text-gray-400">{sel.full_name.charAt(0)}</div><div><h2 className="font-semibold text-[#0F0F0F]">{sel.full_name}</h2><p className="text-sm text-gray-400">{sel.job_title} · {sel.company_name}</p></div></div><button onClick={()=>setSel(null)} className="text-gray-400 hover:text-gray-600 w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center">✕</button></div>
      <div className="p-6 grid md:grid-cols-2 gap-6">
        <div className="space-y-5">
          <div><p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Contact</p><div className="space-y-2">{[['Email',sel.email],['Phone',sel.phone],['WhatsApp',sel.whatsapp]].map(([k,v])=><div key={k}><span className="text-xs text-gray-400">{k}</span><p className="text-sm font-medium text-gray-700">{v}</p></div>)}</div></div>
          {(sel.website||sel.linkedin||sel.instagram||sel.facebook)&&<div><p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Social Links</p><div className="space-y-2">{[['Website',sel.website],['LinkedIn',sel.linkedin],['Instagram',sel.instagram],['Facebook',sel.facebook]].filter(([,v])=>v).map(([k,v])=><a key={k} href={v!} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-blue-600 hover:underline"><span className="text-gray-400 text-xs w-16 flex-shrink-0">{k}</span><span className="truncate max-w-[160px]">{v}</span></a>)}</div></div>}
          <div><p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Order Info</p><div className="bg-gray-50 rounded-xl p-4 space-y-2">{[['Order #',sel.order_number],['Date',fmt(sel.purchase_date)],['Qty',`${sel.quantity_ordered} card${sel.quantity_ordered>1?'s':''}`],['Submitted',fmt(sel.created_at)]].map(([k,v])=><div key={k} className="flex justify-between text-sm"><span className="text-gray-400">{k}</span><span className="font-medium text-gray-700">{v}</span></div>)}</div></div>
          {sel.additional_notes&&<div><p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Notes</p><p className="text-sm text-gray-600 bg-gray-50 rounded-xl p-4">{sel.additional_notes}</p></div>}
        </div>
        <div className="space-y-5">
          <div><p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Card Design</p><NFCCardVisual color={sel.card_color} name={sel.full_name} title={sel.job_title} company={sel.company_name} size="sm"/><p className="text-xs text-gray-400 mt-2">Color: <span className="font-medium text-gray-600 capitalize">{sel.card_color}</span></p></div>
          <div><p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Update Status</p><div className="mb-3"><StatusBadge status={sel.status}/></div><select value={sel.status} onChange={e=>chSt(sel.id,e.target.value as OrderStatus)} className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-[#00D4FF]/30 focus:border-[#00D4FF] bg-white text-gray-700">{STATUS_OPTIONS.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
          {sel.profile_photo_url&&<div><p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Profile Photo</p><img src={sel.profile_photo_url} alt={sel.full_name} className="w-full rounded-xl object-cover max-h-48"/><a href={sel.profile_photo_url} download className="inline-flex items-center gap-1.5 mt-2 text-xs text-blue-600 hover:text-blue-800">↓ Download Photo</a></div>}
        </div>
      </div>
    </div></div>}
  </div>);
}

// ── Root ─────────────────────────────────────────────────────────
export default function Home(){
  const[view,setView]=useState<AppView>('landing');const[al,setAl]=useState(false);const[sid,setSid]=useState('');
  if(view==='admin_dashboard'&&al)return<ADash sv={setView} setAL={setAl}/>;
  if(view==='admin_login')return<ALogin sv={setView} setAL={setAl}/>;
  if(view==='customer_form')return<CForm sv={setView} setSid={setSid}/>;
  if(view==='success')return<Success sv={setView}/>;
  return<Landing sv={setView}/>;
}
