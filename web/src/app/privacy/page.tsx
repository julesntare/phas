import Link from 'next/link';
import Image from 'next/image';

export const metadata = {
  title: 'Privacy Policy — PHAS',
  description: 'How PHAS collects, uses, and protects your personal data.',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          <Link href="/status"
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 no-underline transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back
          </Link>
          <span className="text-gray-200">/</span>
          <Link href="/" className="flex items-center gap-2 text-brand font-bold text-sm no-underline">
            <Image src="/phas-icon.png" alt="PHAS" width={20} height={20} className="rounded-md" />
            PHAS
          </Link>
        </div>
      </nav>

      <article className="max-w-2xl mx-auto px-4 py-10 prose prose-sm prose-gray">
        <h1 className="text-2xl font-extrabold text-gray-900 mb-1">Privacy Policy</h1>
        <p className="text-xs text-gray-400 mb-8">Last updated: June 2026</p>

        <Section title="1. Who we are">
          <p>
            PHAS (Platform Health Accountability System) is a public-interest monitoring
            platform operated in Rwanda. It tracks the real-time health of citizen-facing
            government and private digital services and allows the public to report issues
            they experience.
          </p>
        </Section>

        <Section title="2. Data we collect">
          <p>When you sign in with Google to submit a report, we receive:</p>
          <ul>
            <li>Your Google account name and email address</li>
            <li>Your Google profile picture URL</li>
            <li>A unique Google account identifier</li>
          </ul>
          <p>When you submit a report, we record:</p>
          <ul>
            <li>The platform you are reporting on</li>
            <li>Whether you are affected or not</li>
            <li>Any free-text description you choose to provide</li>
            <li>Your anonymity preference (anonymous to operator or not)</li>
            <li>The date and time of submission</li>
          </ul>
          <p>
            We do <strong>not</strong> collect raw GPS coordinates. If location data is
            submitted via the mobile app, it is coarsened to district level before storage.
          </p>
        </Section>

        <Section title="3. How we use your data">
          <ul>
            <li>To aggregate crowd-sourced signals and detect platform outages</li>
            <li>To allow operators and regulators to investigate reported issues</li>
            <li>To prevent spam and abuse via rate limiting</li>
            <li>To contact you (only if you opt in to share your identity with the operator)</li>
          </ul>
          <p>
            We do <strong>not</strong> sell your data. We do not use it for advertising.
          </p>
        </Section>

        <Section title="4. Anonymity option">
          <p>
            When submitting a report, you may choose to remain anonymous to operators and
            regulators. In that case, your name and email are never shown to platform
            operators. Only PHAS system administrators can see your identity for
            anti-abuse purposes.
          </p>
        </Section>

        <Section title="5. Data sharing">
          <p>Your data may be shared with:</p>
          <ul>
            <li>
              <strong>Platform operators and regulators</strong> — only if you choose not
              to be anonymous
            </li>
            <li>
              <strong>PHAS system administrators</strong> — for platform operation and
              abuse investigation
            </li>
          </ul>
          <p>
            We do not share your data with third parties outside of the above, except as
            required by Rwandan law.
          </p>
        </Section>

        <Section title="6. Data retention">
          <p>
            Your citizen account and associated reports are retained for as long as your
            account exists. You may request deletion of your account and all associated
            data by emailing us (see Section 9). Reports that have been incorporated into
            aggregated statistics may remain in anonymised form.
          </p>
        </Section>

        <Section title="7. Security">
          <p>
            We use HTTPS for all data in transit. Account credentials are managed by
            Google OAuth — we never store your Google password. Access to the database is
            restricted to authorised personnel and automated PHAS services.
          </p>
        </Section>

        <Section title="8. Your rights">
          <p>
            Under Rwanda&apos;s Law n° 058/2021 on the Protection of Personal Data and
            Privacy, you have the right to:
          </p>
          <ul>
            <li>Access the personal data we hold about you</li>
            <li>Request correction of inaccurate data</li>
            <li>Request deletion of your account and data</li>
            <li>Object to processing in certain circumstances</li>
          </ul>
        </Section>

        <Section title="9. Contact">
          <p>
            For privacy-related requests or questions, contact:{' '}
            <strong>phas-support@gov.rw</strong>
          </p>
        </Section>
      </article>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-base font-bold text-gray-800 mb-3">{title}</h2>
      <div className="text-sm text-gray-600 space-y-2">{children}</div>
    </section>
  );
}
