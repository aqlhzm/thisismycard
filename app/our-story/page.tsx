import { getPageContent, getCompanyProfile } from '@/lib/actions';
import OurStoryClient from './client';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Our Story — ThisIsMyCard',
  description: 'The story behind ThisIsMyCard — why we built the future of networking.',
};

export default async function OurStoryPage() {
  const [pageData, company] = await Promise.all([
    getPageContent('our-story'),
    getCompanyProfile(),
  ]);

  const defaults = {
    hero_eyebrow: 'Our Story',
    hero_title: 'We built the card we always wanted.',
    hero_subtitle: 'ThisIsMyCard was born from a simple frustration — business cards that go straight into the bin. We decided to change that.',
    story_sections: [
      {
        year: '2022',
        title: 'The Problem',
        body: 'Every networking event ended the same way — exchanging physical cards that would never be seen again. We knew there had to be a better way.',
      },
      {
        year: '2023',
        title: 'The Idea',
        body: 'NFC technology had been in phones for years, but no one had made it truly seamless for professionals in Malaysia. We saw the gap.',
      },
      {
        year: '2024',
        title: 'The Launch',
        body: 'ThisIsMyCard launched with one mission: make professional networking as simple as a tap. No apps. No friction. Just connection.',
      },
    ],
    mission_title: 'Our Mission',
    mission_body: 'To make every professional connection count — by giving people the tools to share who they are, instantly and beautifully.',
    vision_title: 'Our Vision',
    vision_body: 'A world where your identity is always up to date, always in your pocket, and always just one tap away.',
    values: [
      { icon: '⚡', title: 'Simplicity', desc: 'If it needs an instruction manual, we did it wrong.' },
      { icon: '💎', title: 'Premium Quality', desc: 'Every card we ship represents you. It has to be perfect.' },
      { icon: '🇲🇾', title: 'Made for Malaysia', desc: 'Built for Malaysian professionals, priced for Malaysian budgets.' },
      { icon: '🔄', title: 'Always Evolving', desc: 'Your card grows with your career. Update anytime, forever.' },
    ],
    cta_title: 'Ready to tap into the future?',
    cta_subtitle: 'Join thousands of professionals who\'ve already made the switch.',
    cta_button: 'Get Your Card →',
  };

  const content = {
    ...defaults,
    ...(pageData?.content as Record<string, unknown> || {}),
  };

  return <OurStoryClient content={content} company={company} />;
}
