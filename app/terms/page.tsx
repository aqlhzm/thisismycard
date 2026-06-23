import { getPageContent, getCompanyProfile } from '@/lib/actions';
import TermsClient from './client';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Terms & Conditions — ThisIsMyCard',
  description: 'Terms and Conditions for using ThisIsMyCard services.',
};

export default async function TermsPage() {
  const [pageData, company] = await Promise.all([
    getPageContent('terms'),
    getCompanyProfile(),
  ]);

  const defaults = {
    last_updated: 'January 2024',
    intro: 'Please read these Terms and Conditions carefully before using ThisIsMyCard services. By purchasing or using our NFC business cards, you agree to be bound by these terms.',
    sections: [
      {
        title: '1. Services',
        body: 'ThisIsMyCard provides NFC-enabled digital business cards that allow users to share their professional contact information and social media profiles via Near Field Communication (NFC) technology. Our services include the physical NFC card, profile setup assistance, and digital profile hosting.',
      },
      {
        title: '2. Orders & Payment',
        body: 'All orders are subject to availability. Payment must be completed before processing begins. We accept online banking (FPX) via Billplz and bank transfer. For bank transfer orders, proof of payment must be submitted within 24 hours. Prices are in Malaysian Ringgit (MYR) and inclusive of applicable taxes.',
      },
      {
        title: '3. Delivery',
        body: 'Standard delivery takes 5-7 business days within Peninsular Malaysia and 7-10 business days for East Malaysia. Express delivery is available at additional cost. Delivery timelines begin after profile setup is confirmed. ThisIsMyCard is not liable for delays caused by courier services.',
      },
      {
        title: '4. Profile Setup',
        body: 'Customers are responsible for providing accurate information for their digital profile. ThisIsMyCard reserves the right to refuse profiles containing illegal, offensive, or misleading content. Profile updates are the responsibility of the cardholder and can be made at any time through our portal.',
      },
      {
        title: '5. Refunds & Returns',
        body: 'Due to the personalized nature of our products, refunds are only available if the card is defective or incorrect. Requests must be made within 7 days of receiving the card. We do not accept returns for change of mind. Replacements will be issued for manufacturing defects upon verification.',
      },
      {
        title: '6. Privacy & Data',
        body: 'We collect personal information necessary to provide our services. Your data is stored securely and never sold to third parties. The information displayed on your digital profile is publicly accessible when someone taps your card. You may update or remove your profile information at any time.',
      },
      {
        title: '7. Intellectual Property',
        body: 'All content, designs, and technology associated with ThisIsMyCard are protected by intellectual property laws. Customers retain ownership of their personal information and profile content. The ThisIsMyCard platform, branding, and technology remain the exclusive property of the company.',
      },
      {
        title: '8. Limitation of Liability',
        body: 'ThisIsMyCard shall not be liable for any indirect, incidental, or consequential damages arising from the use of our products or services. Our maximum liability is limited to the purchase price of the product. We are not responsible for how third parties use information shared via NFC tap.',
      },
      {
        title: '9. Governing Law',
        body: 'These Terms and Conditions are governed by the laws of Malaysia. Any disputes shall be resolved in the courts of Malaysia. If any provision of these terms is found to be unenforceable, the remaining provisions continue in full force.',
      },
      {
        title: '10. Contact Us',
        body: 'For any questions about these Terms and Conditions, please contact us at hello@thisismycard.io or via WhatsApp. We aim to respond within 1-2 business days.',
      },
    ],
  };

  const content = {
    ...defaults,
    ...(pageData?.content as Record<string, unknown> || {}),
  };

  return <TermsClient content={content} company={company} />;
}
