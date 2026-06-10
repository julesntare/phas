import Link from 'next/link';

export default function Home() {
  return (
    <main style={{ padding: '2rem' }}>
      <h1>PHAS</h1>
      <p>Platform Health Accountability System — Rwanda</p>
      <Link href="/status">View public status page</Link>
      <br />
      <Link href="/operator">Operator portal</Link>
      <br />
      <Link href="/regulator">Regulator portal</Link>
    </main>
  );
}
