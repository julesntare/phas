'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

export default function OperatorLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/operator/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Login failed');
      localStorage.setItem('operator_token', data.token);
      localStorage.setItem('operator_info', JSON.stringify(data.operator));
      router.push('/operator/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb' }}>
      <div style={{ background: '#fff', padding: '2rem', borderRadius: '0.75rem', border: '1px solid #e5e7eb', width: '100%', maxWidth: 400 }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>PHAS Operator Portal</h1>
          <p style={{ color: '#6b7280', fontSize: '0.875rem', marginTop: '0.25rem' }}>Sign in to manage incidents</p>
        </div>
        <form onSubmit={handleSubmit}>
          <label style={labelStyle}>Email</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            style={inputStyle}
            placeholder="operator@example.com"
          />
          <label style={{ ...labelStyle, marginTop: '1rem' }}>Password</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            style={inputStyle}
          />
          {error && (
            <p style={{ color: '#ef4444', fontSize: '0.875rem', marginTop: '0.75rem' }}>{error}</p>
          )}
          <button type="submit" disabled={loading} style={btnStyle}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </main>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '0.875rem', fontWeight: 500,
  color: '#374151', marginBottom: '0.25rem',
};

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '0.5rem 0.75rem', borderRadius: '0.375rem',
  border: '1px solid #d1d5db', fontSize: '0.875rem', boxSizing: 'border-box',
  outline: 'none',
};

const btnStyle: React.CSSProperties = {
  marginTop: '1.25rem', width: '100%', padding: '0.625rem',
  background: '#0055A4', color: '#fff', border: 'none',
  borderRadius: '0.375rem', fontWeight: 600, cursor: 'pointer',
  fontSize: '0.875rem',
};
