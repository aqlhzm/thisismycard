'use client';
import React from 'react';
import type { CompanyProfile } from '@/types';

interface Props {
  content: Record<string, unknown>;
  company: CompanyProfile | null;
}

export default function TermsClient({ content: c, company }: Props) {
  const F: React.CSSProperties = { fontFamily: "'DM Sans',system-ui,sans-serif" };
  const sections = (c.sections as Array<{ title: string; body: string }>) || [];

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
          <a href="/our-story" style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', textDecoration: 'none', padding: '8px 14px' }}>Our Story</a>
          <a href="/terms" style={{ fontSize: 13, color: '#F0A500', fontWeight: 600, textDecoration: 'none', padding: '8px 14px' }}>Terms</a>
          <a href="/" style={{
            fontSize: 13, fontWeight: 700, color: '#0A0A0A', background: '#F0A500',
            textDecoration: 'none', padding: '9px 20px', borderRadius: 9,
          }}>Get Your Card →</a>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ paddingTop: 140, paddingBottom: 64, paddingLeft: 48, paddingRight: 48, maxWidth: 760, margin: '0 auto' }}>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#F0A500', marginBottom: 16 }}>Legal</p>
        <h1 style={{ fontSize: 'clamp(32px,5vw,56px)', fontWeight: 800, letterSpacing: '-0.04em', color: '#fff', marginBottom: 16 }}>
          Terms & Conditions
        </h1>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.3)', margin: '0 0 12px' }}>
          Last updated: {String(c.last_updated || 'January 2024')}
        </p>
        <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.5)', lineHeight: 1.75, margin: 0 }}>
          {String(c.intro || '')}
        </p>
      </section>

      {/* Table of Contents */}
      <section style={{ maxWidth: 760, margin: '0 auto', padding: '0 48px 48px' }}>
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '24px 28px' }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 14px' }}>Contents</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 24px' }}>
            {sections.map((s, i) => (
              <a key={i} href={`#section-${i}`} style={{
                fontSize: 13, color: 'rgba(255,255,255,0.45)', textDecoration: 'none',
                padding: '4px 0',
                transition: 'color .15s',
              }}
              onMouseOver={e => e.currentTarget.style.color = '#F0A500'}
              onMouseOut={e => e.currentTarget.style.color = 'rgba(255,255,255,0.45)'}>
                {s.title}
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Sections */}
      <section style={{ maxWidth: 760, margin: '0 auto', padding: '0 48px 96px' }}>
        {sections.map((s, i) => (
          <div key={i} id={`section-${i}`} style={{
            marginBottom: 48,
            paddingBottom: 48,
            borderBottom: i < sections.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
          }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#fff', marginBottom: 14, letterSpacing: '-0.01em' }}>
              {s.title}
            </h2>
            <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.5)', lineHeight: 1.8, margin: 0 }}>
              {s.body}
            </p>
          </div>
        ))}

        {/* Contact box */}
        <div style={{
          background: 'rgba(240,165,0,0.06)', border: '1px solid rgba(240,165,0,0.15)',
          borderRadius: 14, padding: '24px 28px', marginTop: 16,
        }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: '#F0A500', margin: '0 0 8px' }}>Questions about these terms?</p>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', margin: 0 }}>
            Email us at <a href="mailto:hello@thisismycard.io" style={{ color: '#F0A500', textDecoration: 'none' }}>hello@thisismycard.io</a> or visit our{' '}
            <a href="/our-story" style={{ color: '#F0A500', textDecoration: 'none' }}>About page</a>.
          </p>
        </div>
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
