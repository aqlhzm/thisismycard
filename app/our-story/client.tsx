'use client';
import React from 'react';
import type { CompanyProfile } from '@/types';

interface Props {
  content: Record<string, unknown>;
  company: CompanyProfile | null;
}

export default function OurStoryClient({ content: c, company }: Props) {
  const F: React.CSSProperties = { fontFamily: "'DM Sans',system-ui,sans-serif" };
  const sections = (c.story_sections as Array<{ year: string; title: string; body: string }>) || [];
  const values = (c.values as Array<{ icon: string; title: string; desc: string }>) || [];

  return (
    <div style={{ ...F, background: '#0A0A0A', minHeight: '100vh', color: '#fff' }}>

      {/* Nav */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 48px', height: 64,
        background: 'rgba(10,10,10,0.88)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          {company?.logo_url
            ? <img src={company.logo_url} alt={company.name} style={{ height: 28, objectFit: 'contain' }} />
            : <>
                <div style={{ width: 30, height: 30, background: '#F0A500', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ color: '#0A0A0A', fontWeight: 800, fontSize: 13 }}>N</span>
                </div>
                <span style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>{company?.name || 'ThisIsMyCard'}</span>
              </>
          }
        </a>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <a href="/our-story" style={{ fontSize: 13, color: '#F0A500', fontWeight: 600, textDecoration: 'none', padding: '8px 14px' }}>Our Story</a>
          <a href="/terms" style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', textDecoration: 'none', padding: '8px 14px' }}
            onMouseOver={e => (e.currentTarget.style.color = '#fff')}
            onMouseOut={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.45)')}>
            Terms
          </a>
          <a href="/" style={{
            fontSize: 13, fontWeight: 700, color: '#0A0A0A', background: '#F0A500',
            textDecoration: 'none', padding: '9px 20px', borderRadius: 9,
            boxShadow: '0 4px 16px rgba(240,165,0,0.35)',
          }}>
            {String(c.cta_button || 'Get Your Card →')}
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section style={{
        paddingTop: 140, paddingBottom: 96, paddingLeft: 48, paddingRight: 48,
        maxWidth: 900, margin: '0 auto', textAlign: 'center',
        position: 'relative',
      }}>
        <div style={{
          position: 'absolute', top: 80, left: '50%', transform: 'translateX(-50%)',
          width: 400, height: 400,
          background: 'radial-gradient(circle, rgba(240,165,0,0.08) 0%, transparent 65%)',
          borderRadius: '50%', filter: 'blur(40px)', pointerEvents: 'none',
        }} />
        <p style={{
          fontSize: 11, fontWeight: 700, letterSpacing: '0.14em',
          textTransform: 'uppercase', color: '#F0A500', marginBottom: 20,
        }}>
          {String(c.hero_eyebrow || 'Our Story')}
        </p>
        <h1 style={{
          fontSize: 'clamp(38px,6vw,72px)', fontWeight: 800,
          letterSpacing: '-0.04em', lineHeight: 1.05,
          color: '#fff', marginBottom: 24,
        }}>
          {String(c.hero_title || '')}
        </h1>
        <p style={{
          fontSize: 18, color: 'rgba(255,255,255,0.5)', lineHeight: 1.75,
          maxWidth: 600, margin: '0 auto',
        }}>
          {String(c.hero_subtitle || '')}
        </p>
      </section>

      {/* Timeline */}
      <section style={{ maxWidth: 760, margin: '0 auto', padding: '0 48px 96px' }}>
        {sections.map((s, i) => (
          <div key={i} style={{
            display: 'grid', gridTemplateColumns: '80px 1fr',
            gap: 32, marginBottom: 64, alignItems: 'flex-start',
          }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{
                fontSize: 13, fontWeight: 800, color: '#F0A500',
                letterSpacing: '0.05em',
              }}>{s.year}</div>
              <div style={{ width: 1, height: 48, background: 'rgba(240,165,0,0.2)', margin: '10px auto 0', display: i < sections.length - 1 ? 'block' : 'none' }} />
            </div>
            <div style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 16, padding: '28px 32px',
            }}>
              <h3 style={{ fontSize: 22, fontWeight: 700, color: '#fff', marginBottom: 12, letterSpacing: '-0.02em' }}>{s.title}</h3>
              <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.55)', lineHeight: 1.7, margin: 0 }}>{s.body}</p>
            </div>
          </div>
        ))}
      </section>

      {/* Mission & Vision */}
      <section style={{
        padding: '80px 48px',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(255,255,255,0.02)',
      }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40 }}>
          {[
            { title: String(c.mission_title || 'Our Mission'), body: String(c.mission_body || ''), accent: '#F0A500' },
            { title: String(c.vision_title || 'Our Vision'), body: String(c.vision_body || ''), accent: '#06B6D4' },
          ].map(item => (
            <div key={item.title} style={{
              background: 'rgba(255,255,255,0.03)', border: `1px solid ${item.accent}20`,
              borderRadius: 20, padding: '36px 40px',
            }}>
              <div style={{ width: 36, height: 3, background: item.accent, borderRadius: 99, marginBottom: 20 }} />
              <h2 style={{ fontSize: 26, fontWeight: 700, color: '#fff', marginBottom: 14, letterSpacing: '-0.02em' }}>{item.title}</h2>
              <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.55)', lineHeight: 1.75, margin: 0 }}>{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Values */}
      <section style={{ padding: '96px 48px', maxWidth: 1100, margin: '0 auto' }}>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#F0A500', marginBottom: 14, textAlign: 'center' }}>What We Stand For</p>
        <h2 style={{ fontSize: 40, fontWeight: 700, color: '#fff', letterSpacing: '-0.03em', textAlign: 'center', marginBottom: 56 }}>Our Values</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16 }}>
          {values.map((v, i) => (
            <div key={i} style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 16, padding: '28px 24px',
              transition: 'all 0.2s',
            }}
            onMouseOver={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(240,165,0,0.2)'; }}
            onMouseOut={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.07)'; }}>
              <div style={{ fontSize: 28, marginBottom: 14 }}>{v.icon}</div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 8 }}>{v.title}</h3>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6, margin: 0 }}>{v.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{
        margin: '0 48px 80px',
        background: '#0F0F0F', border: '1px solid rgba(240,165,0,0.15)',
        borderRadius: 24, padding: '72px 80px', textAlign: 'center',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -60, left: '50%', transform: 'translateX(-50%)', width: 300, height: 300, background: 'radial-gradient(circle,rgba(240,165,0,0.1) 0%,transparent 65%)', borderRadius: '50%', pointerEvents: 'none' }} />
        <h2 style={{ fontSize: 38, fontWeight: 700, color: '#fff', letterSpacing: '-0.03em', marginBottom: 14, position: 'relative' }}>{String(c.cta_title || '')}</h2>
        <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.45)', marginBottom: 36, position: 'relative' }}>{String(c.cta_subtitle || '')}</p>
        <a href="/" style={{
          display: 'inline-block', background: '#F0A500', color: '#0A0A0A',
          textDecoration: 'none', padding: '14px 36px', borderRadius: 12,
          fontSize: 15, fontWeight: 700,
          boxShadow: '0 4px 20px rgba(240,165,0,0.4)', position: 'relative',
        }}>{String(c.cta_button || 'Get Your Card →')}</a>
      </section>

      {/* Footer */}
      <footer style={{ padding: '28px 48px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.25)', margin: 0 }}>© 2024 ThisIsMyCard</p>
        <div style={{ display: 'flex', gap: 24 }}>
          <a href="/our-story" style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', textDecoration: 'none' }}>Our Story</a>
          <a href="/terms" style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', textDecoration: 'none' }}>Terms</a>
          <a href="/" style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', textDecoration: 'none' }}>Home</a>
        </div>
      </footer>
    </div>
  );
}
