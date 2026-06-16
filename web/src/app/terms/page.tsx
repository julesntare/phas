import Link from 'next/link';
import Image from 'next/image';

export const metadata = {
  title: 'Terms of Use — PHAS',
  description: 'Terms governing use of the PHAS platform.',
};

export default function TermsPage() {
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

      <article className="max-w-2xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-extrabold text-gray-900 mb-1">Terms of Use</h1>
        <p className="text-xs text-gray-400 mb-8">Last updated: June 2026</p>

        <Section title="1. Acceptance">
          <p>
            By signing in and using PHAS (Platform Health Accountability System), you
            agree to these Terms of Use. If you do not agree, do not use the service.
          </p>
        </Section>

        <Section title="2. Purpose of the platform">
          <p>
            PHAS is a public-interest monitoring tool. It allows citizens to report
            service disruptions on government and private digital platforms in Rwanda,
            and allows operators and regulators to monitor and respond to those reports.
          </p>
          <p>
            PHAS is provided for informational and accountability purposes. It does not
            guarantee the accuracy or completeness of any status information shown.
          </p>
        </Section>

        <Section title="3. Accurate reporting">
          <p>
            You agree to submit reports that accurately reflect your genuine experience.
            Submitting false, misleading, or malicious reports is prohibited and may
            result in your account being suspended.
          </p>
        </Section>

        <Section title="4. Prohibited conduct">
          <p>You must not:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Submit automated or scripted reports without our express written consent</li>
            <li>Attempt to manipulate incident detection algorithms</li>
            <li>Impersonate any person or organisation</li>
            <li>Use PHAS to harass operators, regulators, or other users</li>
            <li>Attempt to gain unauthorised access to any part of the PHAS system</li>
          </ul>
        </Section>

        <Section title="5. Account suspension">
          <p>
            We reserve the right to suspend or terminate accounts that violate these
            terms, submit abuse reports, or otherwise compromise the integrity of the
            platform.
          </p>
        </Section>

        <Section title="6. Disclaimer of warranties">
          <p>
            PHAS is provided &ldquo;as is&rdquo; without warranties of any kind. We do
            not guarantee uptime or error-free operation. Status information on PHAS
            reflects crowd-sourced signals and automated probes, and may not reflect
            the actual state of a platform at any given moment.
          </p>
        </Section>

        <Section title="7. Limitation of liability">
          <p>
            To the extent permitted by Rwandan law, PHAS and its operators shall not be
            liable for any indirect, incidental, or consequential damages arising from
            your use of the service or reliance on status information displayed.
          </p>
        </Section>

        <Section title="8. Governing law">
          <p>
            These Terms are governed by the laws of the Republic of Rwanda. Any disputes
            shall be subject to the exclusive jurisdiction of the courts of Rwanda.
          </p>
        </Section>

        <Section title="9. Changes to these terms">
          <p>
            We may update these Terms from time to time. Continued use of PHAS after
            changes are posted constitutes acceptance of the revised Terms. The date at
            the top of this page indicates when Terms were last updated.
          </p>
        </Section>

        <Section title="10. Contact">
          <p>
            Questions about these Terms: <strong>julesntare@gmail.com</strong>
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
