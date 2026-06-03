import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'PHAS — Platform Health Accountability System',
  description: 'Live technical health status of citizen-facing e-platforms in Rwanda.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, sans-serif', margin: 0, padding: 0 }}>
        {children}
      </body>
    </html>
  );
}
